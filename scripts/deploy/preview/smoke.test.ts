import { createServer } from "node:http"
import type { AddressInfo } from "node:net"
import { afterEach, describe, expect, it } from "vitest"

import { PREVIEW_SEED_USER } from "./constants"
import { smokePreview } from "./smoke"

const SHA = "0123456789abcdef0123456789abcdef01234567"
const SECRET = "preview-health-secret-0123456789abcdefghij"
const closers: Array<() => Promise<void>> = []

afterEach(async () => {
  await Promise.all(closers.splice(0).map((close) => close()))
})

/** A controlled Preview deployment answering over real HTTP. */
async function previewDeployment(release: string) {
  const server = createServer((request, response) => {
    const path = request.url ?? ""
    const json = (status: number, body: unknown, headers = {}) => {
      response.writeHead(status, {
        "content-type": "application/json",
        ...headers,
      })
      response.end(JSON.stringify(body))
    }
    if (path.startsWith("/api/health/")) {
      const component = path.split("/").pop()
      if (component !== "app" && request.headers["x-health-secret"] !== SECRET)
        return json(401, { status: "refused", code: "unauthorized" })
      return json(200, { component, status: "ok", release })
    }
    if (path === "/api/auth/sign-in/email")
      return json(200, {}, { "set-cookie": "session=synthetic; Path=/" })
    if (path === "/api/lists") return json(201, {})
    response.writeHead(200, { "content-type": "text/html" })
    response.end("<h1>landing</h1>")
  })
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done))
  closers.push(
    () =>
      new Promise((done) => {
        server.closeAllConnections()
        server.close(() => done())
      })
  )
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`
}

describe("TST-RUNTIME-001 Preview smoke binds the running release", () => {
  const input = (url: string) => ({
    url,
    email: PREVIEW_SEED_USER.email,
    password: PREVIEW_SEED_USER.password,
    commitSha: SHA,
    healthSecret: SECRET,
  })

  it("passes when the deployment runs the resolved commit with ready dependencies", async () => {
    await expect(
      smokePreview(input(await previewDeployment(SHA)))
    ).resolves.toEqual({ landing: true, signedIn: true, mutated: true })
  })

  it("fails a deployment running another release, without leaking the secret", async () => {
    const error = await smokePreview(
      input(await previewDeployment("f".repeat(40)))
    ).then(
      () => undefined,
      (reason: Error & { code?: string }) => reason
    )
    expect(error?.code).toBe("command_failed")
    expect(error?.message).toContain("release_mismatch")
    expect(JSON.stringify([error?.message, error?.stack])).not.toContain(SECRET)
  })
})
