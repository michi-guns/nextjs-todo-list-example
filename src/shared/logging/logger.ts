// The Node context import also prevents this core from entering a browser bundle.
import {
  allowsErrorReport,
  defaultLogPolicy,
  logEnvironmentSchema,
  logLevels,
  logName,
  routeLog,
  type LogEnvironment,
  type LogLevel,
  type LogPolicy,
} from "./config"
import { currentLogContext } from "./context"
import { createPinoWriter, type LogRecord, type LogWriter } from "./pino-writer"
import { sanitizeMetadata } from "./sanitize"

/** The diagnostics dispatcher's facade-facing surface; absent means console only. */
export type DiagnosticsRoute = {
  active(): boolean
  log(level: LogLevel, record: LogRecord): void
  reportError(
    context: Pick<
      LogRecord,
      "module" | "event" | "environment" | "correlationId" | "operation"
    >,
    error: unknown
  ): void
}

export function createLogger(options: {
  environment: LogEnvironment
  policy?: () => LogPolicy
  write?: LogWriter
  diagnostics?: DiagnosticsRoute
}) {
  const policy = options.policy ?? (() => defaultLogPolicy)
  const environment = logEnvironmentSchema.safeParse(options.environment)
  const write =
    options.write ??
    createPinoWriter(environment.success ? environment.data : "production")
  const diagnostics = options.diagnostics

  function valid(module: string, event: string) {
    return (
      environment.success &&
      logName.safeParse(module).success &&
      logName.safeParse(event).success
    )
  }

  // Module/event/operation names are code-owned constants, never request data.
  return (module: string) => ({
    emit(level: LogLevel, event: string, metadata?: unknown): void {
      try {
        if (!logLevels.includes(level) || !valid(module, event)) return
        const route = routeLog(policy(), module, event, level)
        const remote = route.diagnostics && diagnostics?.active() === true
        // Build lazy metadata only when at least one destination accepts the event.
        if (!route.console && !remote) return
        const record: LogRecord = {
          ...sanitizeMetadata(
            typeof metadata === "function" ? metadata() : metadata
          ),
          module,
          event,
          environment: environment.data!,
          ...currentLogContext(),
        }
        // Each destination fails independently of the other.
        if (route.console) {
          try {
            write(level, record)
          } catch {
            /* No fallback output: a failing destination must not recurse. */
          }
        }
        if (remote) {
          try {
            diagnostics!.log(level, record)
          } catch {
            /* Diagnostics are optional and cannot affect console output. */
          }
        }
      } catch {
        // Logging is best-effort. Never recurse, fail business work or replace its error.
      }
    },
    /** Explicit issue report, independent of numeric log thresholds. It emits no log. */
    reportError(event: string, error: unknown): void {
      try {
        if (!valid(module, event) || diagnostics?.active() !== true) return
        if (!allowsErrorReport(policy(), module, event)) return
        diagnostics.reportError(
          {
            module,
            event,
            environment: environment.data!,
            ...currentLogContext(),
          },
          error
        )
      } catch {
        // Reporting is best-effort and must never replace the original failure.
      }
    },
  })
}
