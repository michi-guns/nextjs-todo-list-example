import { sql } from "drizzle-orm"
import { Pool } from "pg"
import { describe, expect, it } from "vitest"

const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim()

if (!testDatabaseUrl) {
  throw new Error(
    "TEST_DATABASE_URL is required for the local PostgreSQL integration suite"
  )
}

function getLocalDatabaseUrl(databaseUrl: string) {
  const parsedUrl = new URL(databaseUrl)
  const localHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"])

  if (!localHosts.has(parsedUrl.hostname)) {
    throw new Error("TEST_DATABASE_URL must point to local PostgreSQL")
  }

  if (!/^postgres(?:ql)?:$/.test(parsedUrl.protocol)) {
    throw new Error("TEST_DATABASE_URL must use the PostgreSQL URL scheme")
  }

  return databaseUrl
}

describe("local PostgreSQL runtime", () => {
  it("queries through the app pool and Better Auth database adapter", async () => {
    const databaseUrl = getLocalDatabaseUrl(testDatabaseUrl)
    const schemaName = `codex_t03_${process.pid}_${Date.now()}`
    const setupPool = new Pool({ connectionString: databaseUrl })
    const originalDatabaseUrl = process.env.DATABASE_URL
    let appPool: Pool | undefined

    try {
      await setupPool.query(`CREATE SCHEMA "${schemaName}"`)
      await setupPool.query(
        `CREATE TABLE "${schemaName}"."users" ("id" text PRIMARY KEY)`
      )

      const appDatabaseUrl = new URL(databaseUrl)
      appDatabaseUrl.searchParams.set("options", `-c search_path=${schemaName}`)
      process.env.DATABASE_URL = appDatabaseUrl.toString()

      const [{ db, pool }, { auth }] = await Promise.all([
        import("../../db/db"),
        import("../../lib/auth"),
      ])
      appPool = pool

      const runtimeResult = await db.execute(
        sql`SELECT 1 AS ok, current_schema() AS schema_name`
      )
      expect(runtimeResult.rows).toEqual([{ ok: 1, schema_name: schemaName }])
      expect((db as typeof db & { $client?: unknown }).$client).toBe(pool)

      const databaseAdapter = auth.options.database
      expect(typeof databaseAdapter).toBe("function")

      if (typeof databaseAdapter !== "function") {
        return
      }

      await expect(
        databaseAdapter(auth.options).count({ model: "user" })
      ).resolves.toBe(0)
    } finally {
      await setupPool.end()
      if (appPool) {
        await appPool.end()
      }

      if (originalDatabaseUrl === undefined) {
        delete process.env.DATABASE_URL
      } else {
        process.env.DATABASE_URL = originalDatabaseUrl
      }

      const cleanupPool = new Pool({ connectionString: databaseUrl })
      try {
        await cleanupPool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`)
      } finally {
        await cleanupPool.end()
      }
    }
  })
})
