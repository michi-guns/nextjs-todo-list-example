import { Pool } from "pg"
import { createLogger } from "../src/shared/logging/logger"
import { withLogContext } from "../src/shared/logging/context"
import { loggingEnvironment } from "../src/shared/logging/environment"

const MAX_POOL_SIZE = 10
const IDLE_TIMEOUT_MILLISECONDS = 20_000
const CONNECTION_TIMEOUT_MILLISECONDS = 10_000

const defaultLogger = createLogger({ environment: loggingEnvironment() })

export function reportIdlePoolError(
  error: unknown,
  logger = defaultLogger
): void {
  withLogContext("database.pool.idle", () => {
    const log = logger("database.pool")
    log.emit("error", "database.pool.idle.failed", { outcome: "failed", error })
    // Swallowed process-level failure: this is its only reporting owner.
    log.reportError("database.pool.idle.failed", error)
  })
}

export function createDatabasePool(
  connectionString: string,
  reportIdleError: (error: Error) => void = reportIdlePoolError
): Pool {
  const normalizedConnectionString = connectionString.trim()

  if (!normalizedConnectionString) {
    throw new Error("DATABASE_URL is not defined")
  }

  const pool = new Pool({
    connectionString: normalizedConnectionString,
    max: MAX_POOL_SIZE,
    idleTimeoutMillis: IDLE_TIMEOUT_MILLISECONDS,
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MILLISECONDS,
  })

  pool.on("error", (error) => {
    reportIdleError(error)
  })

  return pool
}
