import { afterEach, describe, expect, it, vi } from "vitest"
import { createLogPolicy, defaultLogPolicy } from "../logging/config"
import { createBetterStackStrategy, MAX_PENDING_LOGS } from "./better-stack"
import { parseEnvelopeBody, startCollector } from "./collector.test-helper"
import { createDiagnosticsDispatcher } from "./dispatcher"

const sentinels = /person@example\.com|sk_live|secret-token|private-person/
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
  environment: "production" as const,
  correlationId: "11111111-1111-4111-8111-111111111111",
  operation: "list.read",
  outcome: "completed" as const,
  durationMs: 7,
}
const reportContext = {
  module: "lists",
  event: "list.create.failed",
  environment: "production" as const,
}

let collectors: Array<{ close(): Promise<void> }> = []
afterEach(async () => {
  for (const collector of collectors) await collector.close()
  collectors = []
})

async function setup(respond?: Parameters<typeof startCollector>[0]) {
  const logs = await startCollector(respond)
  const errors = await startCollector(respond)
  collectors.push(logs, errors)
  const policy = createLogPolicy()
  policy.update(exporting)
  const notice = vi.fn()
  const dispatcher = createDiagnosticsDispatcher({
    policy: policy.current,
    notice,
  })
  dispatcher.install(
    await createBetterStackStrategy(
      {
        provider: "better-stack",
        errorsDsn: `http://errortoken@127.0.0.1:${errors.port}/7`,
        logsUrl: logs.origin,
        logsToken: "source-token-value",
        environment: "production",
        release: "abc1234",
      },
      dispatcher.gate,
      dispatcher.notice
    ),
    { release: "abc1234" }
  )
  return { logs, errors, policy, notice, dispatcher }
}

describe("TST-DIAGNOSTICS-002 Better Stack adapter local wire evidence", () => {
  it("sends logs to HTTP ingestion and errors to the Sentry-compatible path separately", async () => {
    const { logs, errors, dispatcher } = await setup()
    dispatcher.log("info", logRecord)
    dispatcher.log("error", {
      ...logRecord,
      event: "list.read.failed",
      error: { kind: "unavailable", code: "ECONNREFUSED" },
    })
    dispatcher.reportError(
      reportContext,
      new Error("person@example.com secret-token")
    )
    await dispatcher.flush(2000)

    expect(logs.requests).toHaveLength(1)
    const [request] = logs.requests
    expect(request.method).toBe("POST")
    expect(request.headers.authorization).toBe("Bearer source-token-value")
    expect(request.headers["content-type"]).toBe("application/json")
    const body = JSON.parse(request.body) as Array<Record<string, unknown>>
    expect(body).toEqual([
      {
        dt: expect.any(String),
        level: "info",
        message: "list.read.completed",
        module: "lists",
        event: "list.read.completed",
        environment: "production",
        correlation_id: logRecord.correlationId,
        operation: "list.read",
        outcome: "completed",
        duration_ms: 7,
        release: "abc1234",
      },
      expect.objectContaining({
        level: "error",
        event: "list.read.failed",
        error_kind: "unavailable",
        error_code: "ECONNREFUSED",
      }),
    ])
    expect(Date.parse(body[0].dt as string)).not.toBeNaN()

    const items = errors.requests.flatMap(
      (collected) => parseEnvelopeBody(collected.body).items
    )
    expect(items.map((item) => item.type)).toEqual(["event"])
    expect(items[0].payload).toMatchObject({
      tags: { module: "lists", event: "list.create.failed" },
      exception: { values: [expect.objectContaining({ type: "Error" })] },
    })
    expect(errors.requests[0].path).toMatch(/^\/api\/7\/envelope\//)
    for (const collected of [...logs.requests, ...errors.requests])
      expect(collected.body).not.toMatch(sentinels)
  })

  it("drops pending logs disallowed by refreshed policy and never replays them", async () => {
    const { logs, dispatcher, policy } = await setup()
    dispatcher.log("info", logRecord)
    dispatcher.log("info", {
      ...logRecord,
      module: "tasks",
      event: "task.read.completed",
    })
    policy.update({
      ...exporting,
      revision: 2,
      suppressedEvents: [logRecord.event],
    })
    await dispatcher.flush(2000)
    policy.update({ ...exporting, revision: 3 })
    await dispatcher.flush(2000)
    expect(logs.requests).toHaveLength(1)
    expect(
      (JSON.parse(logs.requests[0].body) as Array<{ module: string }>).map(
        (log) => log.module
      )
    ).toEqual(["tasks"])
  })

  it("bounds pending logs deterministically and notices the overflow once", async () => {
    const { logs, dispatcher, notice } = await setup()
    for (let i = 0; i < MAX_PENDING_LOGS + 25; i++)
      dispatcher.log("info", { ...logRecord, durationMs: i })
    await dispatcher.flush(2000)
    const body = JSON.parse(logs.requests[0].body) as Array<{
      duration_ms: number
    }>
    expect(body).toHaveLength(MAX_PENDING_LOGS)
    expect(body.at(-1)?.duration_ms).toBe(MAX_PENDING_LOGS - 1)
    expect(notice.mock.calls).toEqual([["record_dropped"]])
  })

  it.each([402, 403, 406, 413, 500])(
    "contains a %i ingestion refusal with a local notice",
    async (status) => {
      const { dispatcher, notice } = await setup(() => ({ status }))
      dispatcher.log("info", logRecord)
      await expect(dispatcher.flush(2000)).resolves.toBeUndefined()
      expect(notice.mock.calls).toEqual([["export_failed"]])
    }
  )

  it("aborts a hanging log request at the flush deadline", async () => {
    const { logs, dispatcher, notice } = await setup(() => "hang")
    dispatcher.log("info", logRecord)
    const started = performance.now()
    await dispatcher.flush(300)
    expect(performance.now() - started).toBeLessThan(1000)
    await vi.waitFor(() => expect(logs.aborted()).toBe(1), { timeout: 2000 })
    expect(notice).toHaveBeenCalled()
  })
})
