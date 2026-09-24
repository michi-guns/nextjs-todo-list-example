import { afterEach, describe, expect, it, vi } from "vitest"
import {
  createLogPolicy,
  defaultLogPolicy,
  type LogPolicy,
} from "../logging/config"
import type {
  DiagnosticsStrategy,
  ExportGate,
  SafeErrorReport,
  SafeLogEvent,
} from "./contracts"
import { createDiagnosticsDispatcher, NOTICE_INTERVAL_MS } from "./dispatcher"

afterEach(() => vi.useRealTimers())

const exporting: LogPolicy = {
  ...defaultLogPolicy,
  revision: 1,
  diagnostics: {
    ...defaultLogPolicy.diagnostics,
    enabled: true,
    minimumLevel: "info",
    errorReportsEnabled: true,
  },
}
const record = {
  module: "lists",
  event: "list.read.completed",
  environment: "local" as const,
  outcome: "completed" as const,
}
const reportContext = {
  module: "lists",
  event: "list.read.failed",
  environment: "local" as const,
}

/** Queues like an SDK buffer and consults the gate only at transmission. */
function bufferingStrategy(gate: () => ExportGate) {
  const pending: Array<SafeLogEvent | SafeErrorReport> = []
  const sent: Array<SafeLogEvent | SafeErrorReport> = []
  const strategy: DiagnosticsStrategy = {
    log: (event) => void pending.push(event),
    reportError: (report) => void pending.push(report),
    async flush() {
      for (const item of pending.splice(0))
        if (
          "occurrenceId" in item
            ? gate().allowsReport(item)
            : gate().allowsLog(item)
        )
          sent.push(item)
    },
  }
  return { strategy, pending, sent }
}

function fixture(initial: LogPolicy = exporting) {
  const policy = createLogPolicy()
  policy.update(initial)
  const notice = vi.fn()
  const dispatcher = createDiagnosticsDispatcher({
    policy: policy.current,
    notice,
  })
  return { policy, notice, dispatcher }
}

describe("TST-DIAGNOSTICS-001 dispatcher", () => {
  it("stays inactive until one startup strategy is installed and ignores a later switch", async () => {
    const { dispatcher } = fixture()
    expect(dispatcher.active()).toBe(false)
    dispatcher.log("info", record)
    const first = bufferingStrategy(() => dispatcher.gate)
    const second = bufferingStrategy(() => dispatcher.gate)
    dispatcher.install(first.strategy, { release: "abc1234" })
    dispatcher.install(second.strategy, {})
    expect(dispatcher.active()).toBe(true)
    dispatcher.log("info", record)
    await dispatcher.flush()
    expect(first.sent).toEqual([
      expect.objectContaining({
        ...record,
        level: "info",
        release: "abc1234",
        timestamp: expect.any(String),
      }),
    ])
    expect(second.pending).toEqual([])
  })

  it("drops unsent buffered records disallowed by a refreshed policy and never replays them", async () => {
    const { dispatcher, policy } = fixture()
    const buffered = bufferingStrategy(() => dispatcher.gate)
    dispatcher.install(buffered.strategy, {})
    dispatcher.log("warn", record)
    dispatcher.reportError(reportContext, new Error("private"))
    policy.update({
      ...exporting,
      revision: 2,
      suppressedEvents: [record.event],
    })
    await dispatcher.flush()
    expect(buffered.sent).toEqual([
      expect.objectContaining({ event: "list.read.failed" }),
    ])
    dispatcher.reportError(reportContext, new Error("private"))
    policy.update({
      ...exporting,
      revision: 3,
      diagnostics: { ...exporting.diagnostics, errorReportsEnabled: false },
    })
    await dispatcher.flush()
    policy.update({ ...exporting, revision: 4 })
    await dispatcher.flush()
    expect(buffered.sent).toHaveLength(1)
  })

  it("refuses records that the current policy disallows before they reach the strategy", () => {
    const { dispatcher, policy } = fixture()
    const buffered = bufferingStrategy(() => dispatcher.gate)
    dispatcher.install(buffered.strategy, {})
    policy.update({ ...exporting, revision: 2, enabled: false })
    dispatcher.log("fatal", record)
    dispatcher.reportError(reportContext, new Error("x"))
    expect(buffered.pending).toEqual([])
  })

  it("contains strategy failures and emits bounded local-only notices", async () => {
    vi.useFakeTimers()
    const { dispatcher, notice } = fixture()
    const failing: DiagnosticsStrategy = {
      log: vi.fn(() => {
        throw new Error("quota exceeded for person@example.com")
      }),
      reportError: vi.fn(() => {
        throw new Error("401 invalid key")
      }),
      flush: vi.fn(async () => {
        throw new Error("network")
      }),
    }
    dispatcher.install(failing, {})
    for (let i = 0; i < 5; i++) {
      expect(() => dispatcher.log("error", record)).not.toThrow()
      expect(() =>
        dispatcher.reportError(reportContext, new Error("x"))
      ).not.toThrow()
      await expect(dispatcher.flush()).resolves.toBeUndefined()
    }
    expect(notice.mock.calls).toEqual([["export_failed"]])
    await vi.advanceTimersByTimeAsync(NOTICE_INTERVAL_MS)
    dispatcher.log("error", record)
    expect(notice.mock.calls).toEqual([["export_failed"], ["export_failed"]])
    expect(failing.log).toHaveBeenCalledTimes(6)
  })

  it("bounds an awaited flush by its deadline without leaving timers behind", async () => {
    vi.useFakeTimers()
    const { dispatcher, notice } = fixture()
    dispatcher.install(
      {
        log: () => {},
        reportError: () => {},
        flush: () => new Promise(() => {}),
      },
      {}
    )
    const settled = vi.fn()
    const flushes = [dispatcher.flush(1000), dispatcher.flush(1000)]
    for (const flush of flushes) void flush.then(settled)
    await vi.advanceTimersByTimeAsync(999)
    expect(settled).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(settled).toHaveBeenCalledTimes(2)
    expect(notice.mock.calls).toEqual([["flush_timeout"]])
    expect(vi.getTimerCount()).toBe(0)
  })

  it("resolves immediately when inactive and contains a throwing notice sink", async () => {
    const notice = vi.fn(() => {
      throw new Error("console broken")
    })
    const dispatcher = createDiagnosticsDispatcher({
      policy: () => exporting,
      notice,
    })
    await expect(dispatcher.flush()).resolves.toBeUndefined()
    dispatcher.install(
      {
        log: () => {
          throw new Error("x")
        },
        reportError: () => {},
        flush: async () => {},
      },
      {}
    )
    expect(() => dispatcher.log("info", record)).not.toThrow()
    expect(notice).toHaveBeenCalledOnce()
  })
})

describe("TST-DIAGNOSTICS-001 dispatcher report eligibility", () => {
  it("checks report policy before reading or projecting a disallowed failure", () => {
    const { dispatcher } = fixture({
      ...exporting,
      diagnostics: { ...exporting.diagnostics, errorReportsEnabled: false },
    })
    const reportError = vi.fn()
    dispatcher.install(
      { log: () => {}, reportError, flush: async () => {} },
      {}
    )
    const stackReads = vi.fn(() => "Error: x")
    const failure = new Error("x")
    Object.defineProperty(failure, "stack", { get: stackReads })
    dispatcher.reportError(reportContext, failure)
    expect(stackReads).not.toHaveBeenCalled()
    expect(reportError).not.toHaveBeenCalled()
  })
})
