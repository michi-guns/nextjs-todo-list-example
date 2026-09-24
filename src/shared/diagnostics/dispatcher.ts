import {
  allowsErrorReport,
  routeLog,
  type LogLevel,
  type LogPolicy,
} from "../logging/config"
import type { LogRecord } from "../logging/pino-writer"
import type {
  DiagnosticsNotice,
  DiagnosticsStrategy,
  ExportGate,
  SafeContext,
} from "./contracts"
import { projectErrorReport } from "./error-report"

export const MAX_RECORD_BYTES = 16 * 1024
export const FLUSH_TIMEOUT_MS = 1000
export const NOTICE_INTERVAL_MS = 5 * 60_000

export type DiagnosticsSink = ReturnType<typeof createDiagnosticsDispatcher>

/**
 * Owns the one startup-selected Strategy for a Node process. It never buffers:
 * inactive or disallowed records are dropped, so refreshed policy cannot replay them.
 */
export function createDiagnosticsDispatcher(options: {
  policy: () => LogPolicy
  /** Local console only. It must never route back into diagnostics. */
  notice: (code: DiagnosticsNotice) => void
}) {
  let strategy: DiagnosticsStrategy | undefined
  let release: string | undefined
  const lastNotice = new Map<DiagnosticsNotice, number>()

  function notice(code: DiagnosticsNotice) {
    const now = performance.now()
    const last = lastNotice.get(code)
    if (last !== undefined && now - last < NOTICE_INTERVAL_MS) return
    lastNotice.set(code, now)
    try {
      options.notice(code)
    } catch {
      // Best effort. A failing local sink cannot recurse or affect callers.
    }
  }

  const gate: ExportGate = {
    allowsLog: (event) =>
      routeLog(options.policy(), event.module, event.event, event.level)
        .diagnostics,
    allowsReport: (report) =>
      allowsErrorReport(options.policy(), report.module, report.event),
  }

  function send(record: object, deliver: () => void) {
    if (JSON.stringify(record).length > MAX_RECORD_BYTES) {
      notice("record_dropped")
      return
    }
    try {
      deliver()
    } catch {
      notice("export_failed")
    }
  }

  return {
    gate,
    notice,
    active: (): boolean => strategy !== undefined,
    /** Startup selection is final for the process lifetime. */
    install(selected: DiagnosticsStrategy, identity: { release?: string }) {
      if (strategy) return
      strategy = selected
      release = identity.release
    },
    log(level: LogLevel, record: LogRecord): void {
      try {
        const active = strategy
        if (!active) return
        const event = {
          ...record,
          timestamp: new Date().toISOString(),
          level,
          ...(release ? { release } : {}),
        }
        if (!gate.allowsLog(event)) return
        send(event, () => active.log(event))
      } catch {
        notice("export_failed")
      }
    },
    reportError(context: SafeContext, error: unknown): void {
      try {
        const active = strategy
        // Project (read stack/cause) only for an eligible report.
        if (
          !active ||
          !allowsErrorReport(options.policy(), context.module, context.event)
        )
          return
        const report = projectErrorReport(error, {
          ...context,
          ...(release ? { release } : {}),
        })
        send(report, () => active.reportError(report))
      } catch {
        notice("export_failed")
      }
    },
    /** Await at request/job completion. Resolves by the deadline even if I/O hangs. */
    async flush(timeoutMs = FLUSH_TIMEOUT_MS): Promise<void> {
      const active = strategy
      if (!active) return
      let timer: ReturnType<typeof setTimeout> | undefined
      const deadline = new Promise<"timeout">((resolve) => {
        timer = setTimeout(() => resolve("timeout"), timeoutMs)
      })
      try {
        const outcome = await Promise.race([
          Promise.resolve()
            .then(() => active.flush(timeoutMs))
            .then(() => "flushed" as const),
          deadline,
        ])
        if (outcome === "timeout") notice("flush_timeout")
      } catch {
        notice("export_failed")
      } finally {
        clearTimeout(timer)
      }
    },
  }
}
