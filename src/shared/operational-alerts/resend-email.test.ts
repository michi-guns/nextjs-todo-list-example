import { createServer, type IncomingHttpHeaders } from "node:http"
import type { AddressInfo } from "node:net"
import { afterEach, describe, expect, it } from "vitest"

import { NotificationError, type OperationalAlert } from "./contracts"
import {
  createResendEmailNotifier,
  readResendAlertConfig,
} from "./resend-email"

const KEY = "re_alert_key_sentinel_0123456789"
const TO = "oncall-sentinel@example.com"
const FROM = "alerts@mail.example.com"
const SHA = "0123456789abcdef0123456789abcdef01234567"

const alert: OperationalAlert = {
  kind: "release_failed",
  environment: "production",
  repository: "michi-guns/nextjs-todo-list-example",
  runId: "4242",
  runAttempt: 1,
  runUrl:
    "https://github.com/michi-guns/nextjs-todo-list-example/actions/runs/4242",
  commitSha: SHA,
  stage: "migration",
}

type Captured = { headers: IncomingHttpHeaders; body: string }
type Reply = { status: number; body?: unknown } | "hang"
const closers: Array<() => Promise<void>> = []
afterEach(async () => {
  await Promise.all(closers.splice(0).map((close) => close()))
})

/** Local Resend-compatible collector; answers in order, then repeats the last. */
async function collector(...replies: Reply[]) {
  const captured: Captured[] = []
  const server = createServer((request, response) => {
    let body = ""
    request.on("data", (chunk) => (body += chunk))
    request.on("end", () => {
      captured.push({ headers: request.headers, body })
      const reply = replies[Math.min(captured.length, replies.length) - 1]
      if (reply === "hang") return
      response.writeHead(reply.status, { "content-type": "application/json" })
      response.end(JSON.stringify(reply.body ?? {}))
    })
  })
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done))
  closers.push(
    () =>
      new Promise((done) => {
        server.closeAllConnections()
        server.close(() => done())
      })
  )
  const endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}/emails`
  return { endpoint, captured }
}

function notifier(endpoint: string, overrides = {}) {
  return createResendEmailNotifier(
    { apiKey: KEY, from: FROM, to: TO },
    { endpoint, pauseMs: 1, timeoutMs: 200, ...overrides }
  )
}

async function refusal(promise: Promise<unknown>) {
  const error = await promise.then(
    () => undefined,
    (reason: unknown) => reason
  )
  expect(error).toBeInstanceOf(NotificationError)
  const notice = error as NotificationError
  expect(JSON.stringify([notice.message, notice.stack])).not.toMatch(
    new RegExp(`${KEY}|${TO}`)
  )
  return notice.reason
}

describe("TST-ALERTS-001 Resend release-failure Email adapter", () => {
  it("sends one safe release-failure Email with a stable idempotency key", async () => {
    const api = await collector({ status: 200, body: { id: "email_1" } })
    await expect(notifier(api.endpoint).send(alert)).resolves.toEqual({
      id: "email_1",
    })
    expect(api.captured).toHaveLength(1)
    const [{ headers, body }] = api.captured
    expect(headers.authorization).toBe(`Bearer ${KEY}`)
    expect(headers["idempotency-key"]).toBe(
      "release_failed/michi-guns/nextjs-todo-list-example/4242/1"
    )
    const payload = JSON.parse(body)
    expect(payload).toMatchObject({
      from: FROM,
      to: [TO],
      subject: "Production release failed: migration (0123456789ab)",
    })
    expect(payload.text).toContain("database migration")
    expect(payload.text).toContain(alert.runUrl)
    expect(payload.text).toContain(SHA)
    expect(body).not.toContain(KEY)
  })

  it("retries transient failures with the same key and identical payload", async () => {
    const api = await collector(
      { status: 500 },
      "hang",
      { status: 429 },
      { status: 200, body: { id: "email_2" } }
    )
    await expect(
      notifier(api.endpoint, { attempts: 4 }).send(alert)
    ).resolves.toEqual({ id: "email_2" })
    expect(api.captured).toHaveLength(4)
    expect(new Set(api.captured.map((c) => c.body)).size).toBe(1)
    expect(
      new Set(api.captured.map((c) => c.headers["idempotency-key"])).size
    ).toBe(1)
  })

  it("retries a 409 concurrent same-key request after a timed-out attempt", async () => {
    // Resend answers 409 while the first request with this key is still in
    // progress; retrying later with the same key and payload is safe.
    const api = await collector(
      "hang",
      { status: 409, body: { name: "concurrent_idempotent_requests" } },
      { status: 200, body: { id: "email_4" } }
    )
    await expect(notifier(api.endpoint).send(alert)).resolves.toEqual({
      id: "email_4",
    })
    expect(api.captured).toHaveLength(3)
    expect(new Set(api.captured.map((c) => c.body)).size).toBe(1)
    expect(
      new Set(api.captured.map((c) => c.headers["idempotency-key"])).size
    ).toBe(1)
  })

  it("gives a new workflow attempt a new identity", async () => {
    const api = await collector({ status: 200, body: { id: "email_3" } })
    await notifier(api.endpoint).send(alert)
    await notifier(api.endpoint).send({ ...alert, runAttempt: 2 })
    expect(api.captured.map((c) => c.headers["idempotency-key"])).toEqual([
      "release_failed/michi-guns/nextjs-todo-list-example/4242/1",
      "release_failed/michi-guns/nextjs-todo-list-example/4242/2",
    ])
  })

  it("stops at a definite refusal without retrying", async () => {
    const api = await collector({ status: 422, body: { message: TO } })
    await expect(refusal(notifier(api.endpoint).send(alert))).resolves.toBe(
      "rejected"
    )
    expect(api.captured).toHaveLength(1)
  })

  it("bounds a slow provider and reports it safely", async () => {
    const api = await collector("hang")
    const started = performance.now()
    await expect(
      refusal(notifier(api.endpoint, { attempts: 2 }).send(alert))
    ).resolves.toBe("timeout")
    expect(api.captured).toHaveLength(2)
    expect(performance.now() - started).toBeLessThan(2_000)
  })

  it("rejects an accepted response without an email id", async () => {
    const api = await collector({ status: 200, body: { ok: true } })
    await expect(refusal(notifier(api.endpoint).send(alert))).resolves.toBe(
      "invalid_response"
    )
  })

  it("reports persistent provider errors after the bounded attempts", async () => {
    const api = await collector({ status: 503 })
    await expect(refusal(notifier(api.endpoint).send(alert))).resolves.toBe(
      "rejected"
    )
    expect(api.captured).toHaveLength(3)
  })
})

describe("TST-ALERTS-001 alert configuration", () => {
  it("reads only the protected step's key, sender and recipient", () => {
    expect(
      readResendAlertConfig({
        RESEND_API_KEY: KEY,
        APP_MAIL_FROM: FROM,
        RELEASE_ALERT_EMAIL: TO,
      })
    ).toEqual({ apiKey: KEY, from: FROM, to: TO })
  })

  it.each([
    { RESEND_API_KEY: KEY, APP_MAIL_FROM: FROM },
    {
      RESEND_API_KEY: "not-a-key",
      APP_MAIL_FROM: FROM,
      RELEASE_ALERT_EMAIL: TO,
    },
    { RESEND_API_KEY: KEY, APP_MAIL_FROM: FROM, RELEASE_ALERT_EMAIL: "nobody" },
  ])("refuses incomplete configuration without echoing it", (environment) => {
    let error: unknown
    try {
      readResendAlertConfig(environment)
    } catch (caught) {
      error = caught
    }
    expect(error).toBeInstanceOf(NotificationError)
    expect((error as NotificationError).reason).toBe("not_configured")
    expect(JSON.stringify((error as Error).message)).not.toMatch(
      new RegExp(`${KEY}|${TO}|not-a-key`)
    )
  })
})
