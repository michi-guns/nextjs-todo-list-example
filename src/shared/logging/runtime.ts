import type { Pool } from "pg"
import type { LogEnvironment } from "./config"
import { createLogger } from "./logger"
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
  const logger = createLogger({ environment, policy: settings.current })
  return {
    logger,
    refresh: settings.refresh,
    current: settings.current,
  }
}
