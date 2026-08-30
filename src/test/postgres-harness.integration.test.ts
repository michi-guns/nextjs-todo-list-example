import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import { describe, expect, inject, it } from "vitest"

import { assertLocalPostgresUrl } from "./postgres-harness"

const databaseUrl = assertLocalPostgresUrl(inject("testDatabaseUrl"))

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`
}

describe.sequential("PostgreSQL Testcontainers harness", () => {
  it("starts one local PostgreSQL 18 database with the migration chain", async () => {
    const pool = new Pool({ connectionString: databaseUrl })
    const database = drizzle({ client: pool })

    try {
      const result = await database.execute(sql`
        SELECT
          current_database() AS database_name,
          current_setting('server_version_num') AS server_version_num,
          to_regclass('public.lists') AS lists_table,
          to_regtype('public.task_status') AS task_status
      `)

      expect(result.rows[0]).toMatchObject({
        database_name: "todo_test",
        lists_table: "lists",
        task_status: "task_status",
      })
      expect(Number(result.rows[0]?.server_version_num)).toBeGreaterThanOrEqual(
        180000
      )
    } finally {
      await pool.end()
    }
  })

  it("keeps separately created schemas isolated on the shared container", async () => {
    const suffix = `${process.pid}_${Date.now()}`
    const firstSchema = `harness_first_${suffix}`
    const secondSchema = `harness_second_${suffix}`
    const pool = new Pool({ connectionString: databaseUrl })

    try {
      await pool.query(`CREATE SCHEMA ${quoteIdentifier(firstSchema)}`)
      await pool.query(`CREATE SCHEMA ${quoteIdentifier(secondSchema)}`)
      await pool.query(
        `CREATE TABLE ${quoteIdentifier(firstSchema)}."markers" (value text NOT NULL)`
      )
      await pool.query(
        `CREATE TABLE ${quoteIdentifier(secondSchema)}."markers" (value text NOT NULL)`
      )
      await pool.query(
        `INSERT INTO ${quoteIdentifier(firstSchema)}."markers" (value) VALUES ('first')`
      )
      await pool.query(
        `INSERT INTO ${quoteIdentifier(secondSchema)}."markers" (value) VALUES ('second')`
      )

      const firstRows = await pool.query(
        `SELECT value FROM ${quoteIdentifier(firstSchema)}."markers"`
      )
      const secondRows = await pool.query(
        `SELECT value FROM ${quoteIdentifier(secondSchema)}."markers"`
      )

      expect(firstRows.rows).toEqual([{ value: "first" }])
      expect(secondRows.rows).toEqual([{ value: "second" }])
    } finally {
      assertLocalPostgresUrl(databaseUrl)
      await pool.query(
        `DROP SCHEMA IF EXISTS ${quoteIdentifier(firstSchema)} CASCADE`
      )
      await pool.query(
        `DROP SCHEMA IF EXISTS ${quoteIdentifier(secondSchema)} CASCADE`
      )
      await pool.end()
    }
  })
})
