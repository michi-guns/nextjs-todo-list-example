import { and, eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import type { Pool, PoolClient } from "pg"
import { loggingSettingsTable as settings } from "../../../db/schema/logging"
import { logPolicySchema, type LogPolicy } from "./config"

export const SETTINGS_QUERY_TIMEOUT_MS = 1000
export const SETTINGS_MAX_CONNECT_MS = 10_000

export class LoggingSettingsError extends Error {
  constructor(
    readonly code:
      "invalid_policy" | "revision_conflict" | "settings_unavailable"
  ) {
    super(code)
    this.name = "LoggingSettingsError"
  }
}

export function validateSettingsUpdate(
  input: unknown,
  expectedRevision: number
): LogPolicy {
  const parsed = logPolicySchema.safeParse(input)
  if (
    !parsed.success ||
    !Number.isSafeInteger(expectedRevision) ||
    expectedRevision < 0 ||
    parsed.data.revision !== expectedRevision + 1
  ) {
    throw new LoggingSettingsError("invalid_policy")
  }
  return parsed.data
}

/** Reuses the caller's bounded pool. Runtime readers never insert defaults. */
export function createSettingsStore(pool: Pool) {
  const connectTimeout = pool.options.connectionTimeoutMillis
  if (
    !connectTimeout ||
    connectTimeout < 1 ||
    connectTimeout > SETTINGS_MAX_CONNECT_MS
  ) {
    throw new LoggingSettingsError("settings_unavailable")
  }

  async function execute<T>(
    operation: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    let client: PoolClient | undefined
    let released = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const ignoreConnectionError = () => undefined
    try {
      // pg-pool itself times out/removes queued acquisitions and closes failed connects.
      client = await pool.connect()
      client.on("error", ignoreConnectionError)
      const activeClient = client
      const deadline = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          released = true
          // Destroy the active socket; a raced promise alone would leave SQL alive.
          activeClient.release(true)
          reject(new LoggingSettingsError("settings_unavailable"))
        }, SETTINGS_QUERY_TIMEOUT_MS)
      })
      return await Promise.race([operation(client), deadline])
    } catch (error) {
      if (error instanceof LoggingSettingsError) throw error
      throw new LoggingSettingsError("settings_unavailable")
    } finally {
      clearTimeout(timer)
      if (client && !released) {
        client.removeListener("error", ignoreConnectionError)
        client.release()
      }
    }
  }

  return {
    read(): Promise<LogPolicy | null> {
      return execute(async (client) => {
        const [row] = await drizzle({ client })
          .select()
          .from(settings)
          .where(eq(settings.id, 1))
        if (!row) return null
        const parsed = logPolicySchema.safeParse(row.policy)
        if (
          !parsed.success ||
          parsed.data.revision !== row.revision ||
          row.revision < 1
        ) {
          throw new LoggingSettingsError("invalid_policy")
        }
        return parsed.data
      })
    },
    async set(input: unknown, expectedRevision: number): Promise<LogPolicy> {
      const policy = validateSettingsUpdate(input, expectedRevision)
      return execute(async (client) => {
        const database = drizzle({ client })
        const values = { id: 1, revision: policy.revision, policy }
        const rows =
          expectedRevision === 0
            ? await database
                .insert(settings)
                .values(values)
                .onConflictDoNothing()
                .returning({ revision: settings.revision })
            : await database
                .update(settings)
                .set(values)
                .where(
                  and(
                    eq(settings.id, 1),
                    eq(settings.revision, expectedRevision)
                  )
                )
                .returning({ revision: settings.revision })
        if (rows.length !== 1)
          throw new LoggingSettingsError("revision_conflict")
        return policy
      })
    },
  }
}
