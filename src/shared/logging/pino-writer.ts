import "server-only"
import pino from "pino"
import type { LogEnvironment, LogLevel } from "./config"
import type { SafeMetadata } from "./sanitize"

export type LogRecord = SafeMetadata & {
  event: string
  module: string
  environment: LogEnvironment
  correlationId?: string
  operation?: string
}
export type LogWriter = (level: LogLevel, record: LogRecord) => void
type ConsoleDestination = Pick<Console, "log" | "warn" | "error">

/** Internal writer: accepts only the facade's projected data, never raw inputs.
 * Pino's synchronous custom destination avoids transports, workers and queues.
 * https://github.com/pinojs/pino/blob/v10.3.1/docs/api.md#destination
 * Console methods preserve Vercel's severity channel independently of JSON fields:
 * https://vercel.com/docs/logs/runtime#log-level
 */
export function createPinoWriter(
  environment: LogEnvironment,
  destination: ConsoleDestination = console
): LogWriter {
  const logger = pino(
    {
      level: "trace",
      base: null,
      serializers: {},
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level: (label, number) => ({ level: number, severity: label }),
      },
      redact: {
        paths: ["password", "token", "authorization", "cookie", "email"],
        remove: true,
      },
    },
    {
      write(line) {
        const record = JSON.parse(line)
        const { time, severity, module, event, ...details } = record
        const output =
          environment === "local"
            ? `${time} ${severity.toUpperCase()} ${module} ${event} ${JSON.stringify(details)}`
            : line.trimEnd()
        if (record.level >= 50) destination.error(output)
        else if (record.level >= 40) destination.warn(output)
        else destination.log(output)
      },
    }
  )
  return (level, record) => {
    try {
      logger[level](record)
    } catch {
      // No fallback output: a failing destination must not cause recursion.
    }
  }
}
