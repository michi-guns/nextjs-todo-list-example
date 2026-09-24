import type {
  DiagnosticsNotice,
  DiagnosticsStrategy,
  ExportGate,
} from "./contracts"
import type { DiagnosticsConfig } from "./runtime"
import { createSentryCompatibleClient } from "./sentry-client"

/** Sentry: structured logs through the Logs API, errors as explicit safe events. */
export async function createSentryStrategy(
  config: Extract<DiagnosticsConfig, { provider: "sentry" }>,
  gate: ExportGate,
  notice: (code: DiagnosticsNotice) => void
): Promise<DiagnosticsStrategy> {
  const client = createSentryCompatibleClient({
    dsn: config.dsn,
    environment: config.environment,
    release: config.release,
    gate,
    notice,
  })
  return {
    log: client.log,
    reportError: client.report,
    flush: client.flush,
  }
}
