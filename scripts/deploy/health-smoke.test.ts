import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http"
import type { AddressInfo } from "node:net"
import { afterEach, describe, expect, it } from "vitest"

import { HealthSmokeError, smokeDeployedHealth } from "./health-smoke"

const SHA = "0123456789abcdef0123456789abcdef01234567"
const SECRET = "monitor-secret-sentinel-0123456789abcdef"

type Answer = { status: number; body?: unknown } | "hang" | "hang-body"
const closers: Array<() => Promise<void>> = []

/** A controlled deployment exposing the health endpoints over real HTTP. */
async function deployment(
  answer: (component: string, request: IncomingMessage) => Answer
) {
  const seen: Array<{ path: string; secret?: string }> = []
  const server = createServer(
    (request: IncomingMessage, response: ServerResponse) => {
      const component = (request.url ?? "").split("/").pop() ?? ""
      const header = request.headers["x-health-secret"]
      seen.push({
        path: request.url ?? "",
        ...(typeof header === "string" ? { secret: header } : {}),
      })
      const result = answer(component, request)
      if (result === "hang") return
      if (result === "hang-body") {
        // Headers arrive, the JSON body never does.
        response.writeHead(200, { "content-type": "application/json" })
        response.write("{")
        return
      }
      response.writeHead(result.status, { "content-type": "application/json" })
      response.end(JSON.stringify(result.body ?? {}))
    }
  )
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done))
  closers.push(
    () =>
      new Promise((done) => {
        server.closeAllConnections()
        server.close(() => done())
      })
  )
  const { port } = server.address() as AddressInfo
  return { origin: `http://127.0.0.1:${port}`, seen }
}

const ok = (component: string, release = SHA): Answer => ({
  status: 200,
  body: { component, status: "ok", release },
})

afterEach(async () => {
  await Promise.all(closers.splice(0).map((close) => close()))
})

async function failure(promise: Promise<unknown>) {
  const error = await promise.then(
    () => undefined,
    (reason: unknown) => reason
  )
  expect(error).toBeInstanceOf(HealthSmokeError)
  const smoke = error as HealthSmokeError
  expect(JSON.stringify([smoke.message, smoke.stack])).not.toMatch(
    new RegExp(`${SECRET}|127\\.0\\.0\\.1`)
  )
  return { component: smoke.component, reason: smoke.reason, code: smoke.code }
}

describe("TST-RUNTIME-001 deployed release and readiness smoke", () => {
  it("accepts the intended release with ready dependencies, sending the secret only to probes", async () => {
    const target = await deployment((component) => ok(component))
    await expect(
      smokeDeployedHealth({
        origin: `${target.origin}/some/path`,
        commitSha: SHA.toUpperCase(),
        secret: SECRET,
      })
    ).resolves.toEqual({ app: "ok", database: "ok", cms: "ok" })
    expect(target.seen).toEqual([
      { path: "/api/health/app" },
      { path: "/api/health/database", secret: SECRET },
      { path: "/api/health/cms", secret: SECRET },
    ])
  })

  it("rejects a deployment running a different release before checking dependencies", async () => {
    const target = await deployment((component) =>
      ok(component, "f".repeat(40))
    )
    await expect(
      failure(
        smokeDeployedHealth({
          origin: target.origin,
          commitSha: SHA,
          secret: SECRET,
        })
      )
    ).resolves.toEqual({
      component: "app",
      reason: "release_mismatch",
      code: undefined,
    })
    expect(target.seen).toHaveLength(1)
  })

  it("rejects an unknown release identity", async () => {
    const target = await deployment((component) => ok(component, "unknown"))
    await expect(
      failure(
        smokeDeployedHealth({
          origin: target.origin,
          commitSha: SHA,
          secret: SECRET,
        })
      )
    ).resolves.toMatchObject({ reason: "release_mismatch" })
  })

  it.each<[string, Answer, string, string | undefined]>([
    [
      "refused secret",
      { status: 401, body: { code: "unauthorized" } },
      "refused",
      "unauthorized",
    ],
    [
      "missing monitor configuration",
      {
        status: 503,
        body: { status: "unavailable", code: "monitor_unconfigured" },
      },
      "unavailable",
      "monitor_unconfigured",
    ],
    [
      "failed readiness",
      { status: 503, body: { status: "unavailable", code: "query_failed" } },
      "unavailable",
      "query_failed",
    ],
    [
      "a non-health response",
      { status: 200, body: "<html>" },
      "invalid_response",
      undefined,
    ],
  ])("rejects %s", async (_, answer, reason, code) => {
    const target = await deployment((component) =>
      component === "database" ? answer : ok(component)
    )
    await expect(
      failure(
        smokeDeployedHealth({
          origin: target.origin,
          commitSha: SHA,
          secret: SECRET,
          pauseMs: 1,
        })
      )
    ).resolves.toEqual({ component: "database", reason, code })
  })

  it("retries a cold dependency, then fails a persistent timeout without hanging", async () => {
    let calls = 0
    const warming = await deployment((component) =>
      component === "cms" && ++calls < 3
        ? { status: 503, body: { status: "unavailable", code: "timeout" } }
        : ok(component)
    )
    await expect(
      smokeDeployedHealth({
        origin: warming.origin,
        commitSha: SHA,
        secret: SECRET,
        pauseMs: 1,
      })
    ).resolves.toMatchObject({ cms: "ok" })
    expect(calls).toBe(3)

    const hanging = await deployment((component) =>
      component === "database" ? "hang" : ok(component)
    )
    const started = performance.now()
    await expect(
      failure(
        smokeDeployedHealth({
          origin: hanging.origin,
          commitSha: SHA,
          secret: SECRET,
          timeoutMs: 100,
          attempts: 2,
          pauseMs: 1,
        })
      )
    ).resolves.toEqual({
      component: "database",
      reason: "unreachable",
      code: undefined,
    })
    expect(performance.now() - started).toBeLessThan(2_000)
    expect(
      hanging.seen.filter((call) => call.path.endsWith("database"))
    ).toHaveLength(2)
  })

  it("retries a transport blip on the identity check but never a wrong release", async () => {
    let appCalls = 0
    const blip = await deployment((component) =>
      component === "app" && ++appCalls === 1 ? "hang" : ok(component)
    )
    await expect(
      smokeDeployedHealth({
        origin: blip.origin,
        commitSha: SHA,
        secret: SECRET,
        timeoutMs: 100,
        pauseMs: 1,
      })
    ).resolves.toMatchObject({ app: "ok" })
    expect(appCalls).toBe(2)
  })

  it("treats a body that times out as a retryable transport failure", async () => {
    let calls = 0
    const slow = await deployment((component) =>
      component === "database" && ++calls === 1 ? "hang-body" : ok(component)
    )
    await expect(
      smokeDeployedHealth({
        origin: slow.origin,
        commitSha: SHA,
        secret: SECRET,
        timeoutMs: 100,
        pauseMs: 1,
      })
    ).resolves.toMatchObject({ database: "ok" })
    const stuck = await deployment((component) =>
      component === "database" ? "hang-body" : ok(component)
    )
    await expect(
      failure(
        smokeDeployedHealth({
          origin: stuck.origin,
          commitSha: SHA,
          secret: SECRET,
          timeoutMs: 100,
          attempts: 1,
        })
      )
    ).resolves.toEqual({
      component: "database",
      reason: "unreachable",
      code: undefined,
    })
  })

  it("does not follow a redirect to a sign-in page as health", async () => {
    const target = await deployment(() => ({ status: 307, body: {} }))
    await expect(
      failure(
        smokeDeployedHealth({
          origin: target.origin,
          commitSha: SHA,
          secret: SECRET,
        })
      )
    ).resolves.toMatchObject({ component: "app" })
  })
})
