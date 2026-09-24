import type {
  DiagnosticsNotice,
  DiagnosticsStrategy,
  ExportGate,
  SafeLogEvent,
} from "./contracts"
import type { DiagnosticsConfig } from "./runtime"
import { createSentryCompatibleClient } from "./sentry-client"

export const MAX_PENDING_LOGS = 100

/** Better Stack HTTP log record: `dt` timestamp plus explicitly projected safe fields. */
function toRecord(event: SafeLogEvent) {
  return Object.fromEntries(
    Object.entries({
      dt: event.timestamp,
      level: event.level,
      message: event.event,
      module: event.module,
      event: event.event,
      environment: event.environment,
      correlation_id: event.correlationId,
      operation: event.operation,
      outcome: event.outcome,
      duration_ms: event.durationMs,
      transport: event.transport,
      error_kind: event.error?.kind,
      error_code: event.error?.code,
      release: event.release,
    }).filter(([, value]) => value !== undefined)
  )
}

/**
 * Better Stack: logs through its documented HTTP ingestion, errors through its
 * documented Sentry-compatible DSN. Error DSN support is not Logs API parity.
 */
export async function createBetterStackStrategy(
  config: Extract<DiagnosticsConfig, { provider: "better-stack" }>,
  gate: ExportGate,
  notice: (code: DiagnosticsNotice) => void
): Promise<DiagnosticsStrategy> {
  const errors = createSentryCompatibleClient({
    dsn: config.errorsDsn,
    environment: config.environment,
    release: config.release,
    gate,
    notice,
  })
  // No timers: records leave only at an awaited request/job flush.
  let pending: SafeLogEvent[] = []

  async function flushLogs(timeoutMs: number) {
    // Recheck current policy at transmission; disallowed records are discarded.
    const batch = pending.filter((event) => gate.allowsLog(event))
    pending = []
    if (batch.length === 0) return
    try {
      const response = await fetch(config.logsUrl, {
        method: "POST",
        headers: {
          authorization: `Bearer ${config.logsToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(batch.map(toRecord)),
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (!response.ok) notice("export_failed")
      await response.body?.cancel()
    } catch {
      notice("export_failed")
    }
  }

  return {
    log(event) {
      // Deterministic overflow: keep the oldest records, drop new ones.
      if (pending.length >= MAX_PENDING_LOGS) {
        notice("record_dropped")
        return
      }
      pending.push(event)
    },
    reportError: errors.report,
    async flush(timeoutMs) {
      await Promise.all([errors.flush(timeoutMs), flushLogs(timeoutMs)])
    },
  }
}
