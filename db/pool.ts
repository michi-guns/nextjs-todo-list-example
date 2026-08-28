import { Pool } from "pg"

const MAX_POOL_SIZE = 10
const IDLE_TIMEOUT_MILLISECONDS = 20_000
const CONNECTION_TIMEOUT_MILLISECONDS = 10_000

export function createDatabasePool(connectionString: string): Pool {
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
    console.error("[db] Unexpected idle PostgreSQL client error", error)
  })

  return pool
}
