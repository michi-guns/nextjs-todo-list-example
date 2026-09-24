import { getClient, getGlobalScope, getIsolationScope } from "@sentry/core"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { createLogPolicy, defaultLogPolicy } from "../logging/config"
import { startCollector, parseEnvelopeBody } from "./collector.test-helper"
import type { DiagnosticsStrategy } from "./contracts"
import { createDiagnosticsDispatcher } from "./dispatcher"
import { createSentryStrategy } from "./sentry"

const sentinels =
  /person@example\.com|sk_live|secret-token|private-person|hostname-secret|Bearer/

const exporting = {
  ...defaultLogPolicy,
  revision: 1,
  diagnostics: {
    enabled: true,
    minimumLevel: "trace" as const,
    moduleLevels: {},
    errorReportsEnabled: true,
  },
}
const logRecord = {
  module: "lists",
  event: "list.read.completed",
  environment: "preview" as const,
  correlationId: "11111111-1111-4111-8111-111111111111",
  operation: "list.read",
  outcome: "completed" as const,
  durationMs: 12,
}
const reportContext = {
  module: "lists",
  event: "list.create.failed",
  environment: "preview" as const,
  correlationId: "22222222-2222-4222-8222-222222222222",
  operation: "list.create",
}

let collectors: Array<{ close(): Promise<void> }> = []
afterEach(async () => {
  for (const collector of collectors) await collector.close()
  collectors = []
})

beforeAll(() => {
  // Global enrichment that must never reach a payload.
  getGlobalScope().setUser({ email: "person@example.com", id: "sk_live" })
  getGlobalScope().setTag("secret", "secret-token")
  getIsolationScope().setExtra("host", "hostname-secret")
  getIsolationScope().addBreadcrumb({ message: "person@example.com" })
  // Scope attributes join logs after beforeSendLog, including allowlisted keys.
  getGlobalScope().setAttributes({
    leak: "secret-token",
    operation: "secret-token",
    "sentry.release": "secret-token",
  })
  getIsolationScope().setAttributes({ other: "hostname-secret" })
})

async function setup(
  respond?: Parameters<typeof startCollector>[0],
  policyInput = exporting
) {
  const collector = await startCollector(respond)
  collectors.push(collector)
  const policy = createLogPolicy()
  policy.update(policyInput)
  const notice = vi.fn()
  const dispatcher = createDiagnosticsDispatcher({
    policy: policy.current,
    notice,
  })
  const strategy: DiagnosticsStrategy = await createSentryStrategy(
    {
      provider: "sentry",
      dsn: `http://publickey@127.0.0.1:${collector.port}/42`,
      environment: "preview",
      release: "abc1234",
    },
    dispatcher.gate,
    dispatcher.notice
  )
  dispatcher.install(strategy, { release: "abc1234" })
  return { collector, policy, notice, dispatcher }
}

describe("TST-DIAGNOSTICS-002 Sentry adapter local wire evidence", () => {
  it("sends allowlisted structured logs and safe error events through the real SDK", async () => {
    const { collector, dispatcher } = await setup()
    dispatcher.log("info", logRecord)
    dispatcher.log("warn", {
      ...logRecord,
      event: "list.read.slow",
      error: { kind: "timeout", code: "ETIMEDOUT" },
    })
    const failure = Object.assign(
      new Error("Bearer secret-token person@example.com"),
      { cause: new Error("private-person") }
    )
    dispatcher.reportError(reportContext, failure)
    // No console recapture and no process-global client registration.
    console.warn("person@example.com")
    expect(getClient()).toBeUndefined()
    await dispatcher.flush(2000)

    const envelopes = collector.requests.map((request) => {
      expect(request.path).toMatch(/^\/api\/42\/envelope\//)
      return parseEnvelopeBody(request.body)
    })
    const items = envelopes.flatMap((envelope) => envelope.items)
    expect(items.map((item) => item.type).sort()).toEqual(["event", "log"])
    for (const envelope of envelopes)
      expect(Object.keys(envelope.header).sort()).toEqual(
        expect.not.arrayContaining(["trace"])
      )

    const logs = items.find((item) => item.type === "log")!.payload
      .items as Array<Record<string, unknown>>
    expect(logs).toHaveLength(2)
    expect(logs[0]).toMatchObject({
      level: "info",
      body: "list.read.completed",
    })
    const attributes = logs[1].attributes as Record<string, { value: unknown }>
    expect(
      Object.fromEntries(
        Object.entries(attributes).map(([key, value]) => [key, value.value])
      )
    ).toEqual({
      module: "lists",
      event: "list.read.slow",
      environment: "preview",
      correlation_id: logRecord.correlationId,
      operation: "list.read",
      outcome: "completed",
      duration_ms: 12,
      "error.kind": "timeout",
      "error.code": "ETIMEDOUT",
      release: "abc1234",
      "sentry.environment": "preview",
      "sentry.release": "abc1234",
      "sentry.timestamp.sequence": expect.any(Number),
    })

    const event = items.find((item) => item.type === "event")!.payload
    expect(Object.keys(event).sort()).toEqual(
      [
        "contexts",
        "environment",
        "event_id",
        "exception",
        "fingerprint",
        "level",
        "platform",
        "release",
        "tags",
        "timestamp",
      ].sort()
    )
    expect(event).toMatchObject({
      level: "error",
      environment: "preview",
      release: "abc1234",
      tags: {
        module: "lists",
        event: "list.create.failed",
        operation: "list.create",
        correlation_id: reportContext.correlationId,
        "error.kind": "unexpected",
      },
      fingerprint: expect.arrayContaining(["lists", "list.create.failed"]),
      exception: {
        values: [
          expect.objectContaining({
            type: "Error",
            value: "Unexpected failure",
          }),
        ],
      },
      contexts: {
        diagnostics: {
          occurrence_id: expect.any(String),
          causes: ["Error:unexpected"],
        },
      },
    })
    expect(event.event_id).toMatch(/^[0-9a-f]{32}$/)
    for (const request of collector.requests)
      expect(request.body).not.toMatch(sentinels)
  })

  it("drops SDK-buffered logs that a refreshed policy disallows", async () => {
    const { collector, dispatcher, policy } = await setup()
    dispatcher.log("info", logRecord)
    dispatcher.log("info", { ...logRecord, module: "tasks" })
    policy.update({ ...exporting, revision: 2, disabledModules: ["lists"] })
    await dispatcher.flush(2000)
    const logs = collector.requests
      .flatMap((request) => parseEnvelopeBody(request.body).items)
      .filter((item) => item.type === "log")
      .flatMap(
        (item) =>
          item.payload.items as Array<{
            body: string
            attributes: Record<string, { value: string }>
          }>
      )
    expect(logs.map((log) => log.attributes.module.value)).toEqual(["tasks"])
    policy.update({ ...exporting, revision: 3 })
    await dispatcher.flush(2000)
    expect(
      collector.requests
        .flatMap((request) => parseEnvelopeBody(request.body).items)
        .filter((item) => item.type === "log")
    ).toHaveLength(1)
  })

  it.each([401, 413, 429, 500])(
    "contains a %i response with a bounded local notice",
    async (status) => {
      const { collector, dispatcher, notice } = await setup(() => ({ status }))
      for (let i = 0; i < 3; i++)
        dispatcher.reportError(reportContext, new Error("x"))
      dispatcher.log("error", logRecord)
      await expect(dispatcher.flush(2000)).resolves.toBeUndefined()
      expect(collector.requests.length).toBeGreaterThan(0)
      expect(notice.mock.calls).toEqual([["export_failed"]])
    }
  )

  it("aborts hanging requests at the flush deadline and bounds pending sends", async () => {
    const { collector, dispatcher, notice } = await setup(() => "hang")
    for (let i = 0; i < 40; i++)
      dispatcher.reportError(reportContext, new Error("x"))
    const started = performance.now()
    await dispatcher.flush(300)
    expect(performance.now() - started).toBeLessThan(1000)
    // Real sockets close when the flush deadline aborts the in-flight requests,
    // well before the one-second per-request fallback.
    await vi.waitFor(() => expect(collector.aborted()).toBeGreaterThan(0), {
      timeout: 500,
    })
    expect(performance.now() - started).toBeLessThan(900)
    expect(collector.requests.length).toBeLessThanOrEqual(10)
    expect(notice).toHaveBeenCalled()
  })

  it("does not send when every destination is disabled", async () => {
    const { collector, dispatcher } = await setup(undefined, {
      ...exporting,
      diagnostics: { ...exporting.diagnostics, enabled: false },
    })
    dispatcher.log("fatal", logRecord)
    dispatcher.reportError(reportContext, new Error("x"))
    await dispatcher.flush(500)
    expect(collector.requests).toEqual([])
  })

  it("drops scope-attached attributes and gives each request its own trace id", async () => {
    const { collector, dispatcher } = await setup()
    dispatcher.log("info", {
      module: "lists",
      event: "list.read.started",
      environment: "preview",
    })
    dispatcher.log("info", logRecord)
    dispatcher.log("info", {
      ...logRecord,
      correlationId: "33333333-3333-4333-8333-333333333333",
    })
    await dispatcher.flush(2000)
    const logs = collector.requests
      .flatMap((request) => parseEnvelopeBody(request.body).items)
      .filter((item) => item.type === "log")
      .flatMap(
        (item) =>
          item.payload.items as Array<{
            trace_id: string
            attributes: Record<string, { value: unknown }>
          }>
      )
    expect(Object.keys(logs[0].attributes).sort()).toEqual(
      [
        "environment",
        "event",
        "module",
        "release",
        "sentry.environment",
        "sentry.release",
        "sentry.timestamp.sequence",
      ].sort()
    )
    expect(logs[0].attributes["sentry.release"].value).toBe("abc1234")
    expect(logs.map((log) => log.trace_id)).toEqual([
      expect.stringMatching(/^[0-9a-f]{32}$/),
      "11111111111141118111111111111111",
      "33333333333343338333333333333333",
    ])
    for (const request of collector.requests)
      expect(request.body).not.toMatch(sentinels)
  })
})
