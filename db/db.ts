import { attachDatabasePool } from "@vercel/functions"
import { drizzle } from "drizzle-orm/node-postgres"

import { createDatabasePool, reportIdlePoolError } from "./pool"
import { parseRuntimeEnvironment } from "../src/shared/environment/runtime"
import { createLoggingRuntime } from "../src/shared/logging/runtime"
import { loggingEnvironment } from "../src/shared/logging/environment"

// Refuse an unsafe profile/target before any client exists (TD-035).
const { databaseUrl } = parseRuntimeEnvironment()

// The asynchronous idle callback runs after composition, using the current policy.
export const pool = createDatabasePool(databaseUrl, (error) =>
  reportIdlePoolError(error, logging.logger)
)
attachDatabasePool(pool)

export const db = drizzle({ client: pool })

const LOGGING = Symbol.for("nextjs-todo.logging.runtime")
type LoggingRuntime = ReturnType<typeof createLoggingRuntime>
/**
 * Next compiles instrumentation, SSR and route handlers into separate module
 * copies. One process-wide runtime keeps a single settings cache, diagnostics
 * dispatcher and provider client, so startup selection reaches every request.
 */
export const logging = ((globalThis as { [LOGGING]?: LoggingRuntime })[
  LOGGING
] ??= createLoggingRuntime(pool, loggingEnvironment()))
