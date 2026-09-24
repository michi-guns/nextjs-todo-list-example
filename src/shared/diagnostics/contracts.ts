import type { LogEnvironment, LogLevel } from "../logging/config"
import type { SafeMetadata } from "../logging/sanitize"

/** TD-030: exactly these startup choices; no plugin registry or live switching. */
export const diagnosticsProviders = ["none", "sentry", "better-stack"] as const
export type DiagnosticsProvider = (typeof diagnosticsProviders)[number]

/** Trusted, code-owned context. Caller metadata cannot override these fields. */
export type SafeContext = Readonly<{
  module: string
  event: string
  environment: LogEnvironment
  correlationId?: string
  operation?: string
  release?: string
}>

export type SafeLogEvent = Readonly<
  SafeMetadata &
    SafeContext & {
      timestamp: string
      level: LogLevel
    }
>

export type SafeFrame = Readonly<{
  file: string
  function?: string
  line: number
  column: number
}>

export type SafeErrorFacts = Readonly<{
  class: string
  kind: string
  code?: string
}>

/** One occurrence. `fingerprint` groups issues; it never contains request/occurrence IDs. */
export type SafeErrorReport = Readonly<
  SafeContext & {
    timestamp: string
    occurrenceId: string
    error: SafeErrorFacts &
      Readonly<{ message: string; frames: readonly SafeFrame[] }>
    causes: readonly SafeErrorFacts[]
    fingerprint: readonly string[]
  }
>

/**
 * Re-evaluates current shared policy. Adapters call it at their last supported
 * point before transmission so refreshed policy drops unsent buffered records.
 */
export interface ExportGate {
  allowsLog(event: SafeLogEvent): boolean
  allowsReport(report: SafeErrorReport): boolean
}

/** The Strategy each provider adapter implements. Log and report stay distinct. */
export interface DiagnosticsStrategy {
  log(event: SafeLogEvent): void
  reportError(report: SafeErrorReport): void
  /** Bounded by `timeoutMs`; never closes the shared client. */
  flush(timeoutMs: number): Promise<void>
}

/** Fixed local-only notice codes; never carry provider responses or config values. */
export type DiagnosticsNotice =
  | "config_invalid"
  | "provider_unavailable"
  | "export_failed"
  | "flush_timeout"
  | "record_dropped"
