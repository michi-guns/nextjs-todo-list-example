import "server-only"
import type { Pool } from "pg"
import type { LogEnvironment } from "./config"
import { createLogger } from "./logger"
import { createSettingsCache } from "./settings-cache"
import { createSettingsStore } from "./settings-store"

/** Compose once with db/db.ts's pool, outside the database-free logger core. */
export function createLoggingRuntime(pool: Pool, environment: LogEnvironment) {
  const settings = createSettingsCache(createSettingsStore(pool))
  return {
    logger: createLogger({ environment, policy: settings.current }),
    refresh: settings.refresh,
    current: settings.current,
  }
}
