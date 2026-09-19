import { attachDatabasePool } from "@vercel/functions"
import { drizzle } from "drizzle-orm/node-postgres"

import { createDatabasePool, reportIdlePoolError } from "./pool"
import { createLoggingRuntime } from "../src/shared/logging/runtime"
import { loggingEnvironment } from "../src/shared/logging/environment"

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not defined")
}

// The asynchronous idle callback runs after composition, using the current policy.
export const pool = createDatabasePool(databaseUrl, (error) =>
  reportIdlePoolError(error, logging.logger)
)
attachDatabasePool(pool)

export const db = drizzle({ client: pool })
export const logging = createLoggingRuntime(pool, loggingEnvironment())
