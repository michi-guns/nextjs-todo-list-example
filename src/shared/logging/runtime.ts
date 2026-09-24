import type { Pool } from "pg"
import { createDiagnosticsDispatcher } from "../diagnostics/dispatcher"
import type { LogEnvironment } from "./config"
import { createLogger } from "./logger"
import { createPinoWriter } from "./pino-writer"
import { createSettingsCache } from "./settings-cache"
import { createSettingsStore } from "./settings-store"

/** Compose once with db/db.ts's pool, outside the database-free logger core. */
export function createLoggingRuntime(pool: Pool, environment: LogEnvironment) {
  const settings = createSettingsCache(
    createSettingsStore(pool),
    (transition) => {
      logger("logging.settings").emit(
        transition === "failed" ? "warn" : "info",
        `logging.settings.${transition}`,
        {
          outcome: transition === "failed" ? "fallback" : "completed",
        }
      )
    }
  )
  const write = createPinoWriter(environment)
  // Diagnostics failure notices use a console-only logger so they cannot re-export.
  const local = createLogger({ environment, policy: settings.current, write })
  const diagnostics = createDiagnosticsDispatcher({
    policy: settings.current,
    notice: (code) =>
      local("diagnostics").emit("warn", `diagnostics.${code}`, {
        outcome: "fallback",
      }),
  })
  const logger = createLogger({
    environment,
    policy: settings.current,
    write,
    diagnostics,
  })
  return {
    logger,
    diagnostics,
    refresh: settings.refresh,
    current: settings.current,
  }
}
