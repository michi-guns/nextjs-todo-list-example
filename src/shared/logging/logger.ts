// The Node context import also prevents this core from entering a browser bundle.
import {
  defaultLogPolicy,
  logEnvironmentSchema,
  logLevels,
  logName,
  permits,
  type LogEnvironment,
  type LogLevel,
  type LogPolicy,
} from "./config"
import { currentLogContext } from "./context"
import { createPinoWriter, type LogWriter } from "./pino-writer"
import { sanitizeMetadata } from "./sanitize"

export function createLogger(options: {
  environment: LogEnvironment
  policy?: () => LogPolicy
  write?: LogWriter
}) {
  const policy = options.policy ?? (() => defaultLogPolicy)
  const environment = logEnvironmentSchema.safeParse(options.environment)
  const write =
    options.write ??
    createPinoWriter(environment.success ? environment.data : "production")

  // Module/event/operation names are code-owned constants, never request data.
  return (module: string) => ({
    emit(level: LogLevel, event: string, metadata?: unknown): void {
      try {
        if (
          !environment.success ||
          !logLevels.includes(level) ||
          !logName.safeParse(module).success ||
          !logName.safeParse(event).success
        )
          return
        if (!permits(policy(), module, event, level)) return
        const safe = sanitizeMetadata(
          typeof metadata === "function" ? metadata() : metadata
        )
        write(level, {
          ...safe,
          module,
          event,
          environment: environment.data,
          ...currentLogContext(),
        })
      } catch {
        // Logging is best-effort. Never recurse, fail business work or replace its error.
      }
    },
  })
}
