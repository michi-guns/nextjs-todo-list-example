import { readFile, readdir } from "node:fs/promises"
import path from "node:path"

import { drizzle } from "drizzle-orm/node-postgres"
import { eq, sql } from "drizzle-orm"
import { Pool, type PoolClient } from "pg"
import { beforeAll, afterAll, describe, expect, it } from "vitest"

import { listsTable } from "../../db/schema/lists"
import { tasksTable } from "../../db/schema/tasks"
import { usersTable } from "../../db/schema/auth"

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

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`
}

function qualifiedTable(schemaName: string, tableName: string) {
  return `${quoteIdentifier(schemaName)}.${quoteIdentifier(tableName)}`
}

async function applyMigration(client: PoolClient, migrationSql: string) {
  const statements = migrationSql
    .split(/--> statement-breakpoint\s*/)
    .map((statement) => statement.trim())
    .filter(Boolean)

  for (const statement of statements) {
    await client.query(statement)
  }
}

async function getMigrationSqlFiles() {
  const migrationsRoot = path.resolve("migrations")
  const entries = await readdir(migrationsRoot, { withFileTypes: true })
  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()

  return Promise.all(
    directories.map(async (directory) => ({
      directory,
      sql: await readFile(
        path.join(migrationsRoot, directory, "migration.sql"),
        "utf8"
      ),
    }))
  )
}

async function expectUniqueViolation(action: () => Promise<unknown>) {
  try {
    await action()
    throw new Error("Expected the database operation to violate a unique key")
  } catch (error) {
    const queryError = error as {
      code?: string
      cause?: { code?: string }
    }
    expect(queryError.code ?? queryError.cause?.code).toBe("23505")
  }
}

describe.sequential("lists and tasks PostgreSQL schema", () => {
  const databaseUrl = getLocalDatabaseUrl(testDatabaseUrl)
  const schemaName = `codex_t04_${process.pid}_${Date.now()}`
  let setupPool: Pool
  let appPool: Pool
  let database: ReturnType<typeof drizzle>

  beforeAll(async () => {
    setupPool = new Pool({ connectionString: databaseUrl })
    const setupClient = await setupPool.connect()

    try {
      await setupClient.query(`CREATE SCHEMA ${quoteIdentifier(schemaName)}`)
      await setupClient.query(
        `SET search_path TO ${quoteIdentifier(schemaName)}, public`
      )

      const migrations = await getMigrationSqlFiles()
      for (const migration of migrations) {
        await applyMigration(setupClient, migration.sql)
      }
    } finally {
      setupClient.release()
    }

    const appDatabaseUrl = new URL(databaseUrl)
    appDatabaseUrl.searchParams.set(
      "options",
      `-c search_path=${schemaName},public`
    )
    appPool = new Pool({ connectionString: appDatabaseUrl.toString() })
    database = drizzle({ client: appPool })
  })

  afterAll(async () => {
    await appPool.end()
    const cleanupPool = new Pool({ connectionString: databaseUrl })
    try {
      await cleanupPool.query(
        `DROP SCHEMA IF EXISTS ${quoteIdentifier(schemaName)} CASCADE`
      )
    } finally {
      await cleanupPool.end()
      await setupPool.end()
    }
  })

  it("applies the migration chain with the required columns and status enum", async () => {
    const columns = await appPool.query<{
      table_name: string
      column_name: string
      data_type: string
      udt_name: string
      is_nullable: string
      column_default: string | null
    }>(
      `
        SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = $1
          AND table_name IN ('lists', 'tasks')
        ORDER BY table_name, ordinal_position
      `,
      [schemaName]
    )

    const findColumn = (tableName: string, columnName: string) => {
      const column = columns.rows.find(
        (row) => row.table_name === tableName && row.column_name === columnName
      )
      expect(column).toBeDefined()
      return column!
    }

    expect(findColumn("lists", "id")).toMatchObject({
      data_type: "text",
      is_nullable: "NO",
    })
    expect(findColumn("lists", "user_id")).toMatchObject({
      data_type: "text",
      is_nullable: "NO",
    })
    expect(findColumn("lists", "name")).toMatchObject({
      data_type: "text",
      is_nullable: "NO",
    })
    expect(findColumn("lists", "created_at")).toMatchObject({
      data_type: "timestamp with time zone",
      is_nullable: "NO",
    })
    expect(findColumn("lists", "updated_at")).toMatchObject({
      data_type: "timestamp with time zone",
      is_nullable: "NO",
    })

    expect(findColumn("tasks", "list_id")).toMatchObject({
      data_type: "text",
      is_nullable: "NO",
    })
    expect(findColumn("tasks", "user_id")).toMatchObject({
      data_type: "text",
      is_nullable: "NO",
    })
    expect(findColumn("tasks", "title")).toMatchObject({
      data_type: "text",
      is_nullable: "NO",
    })
    expect(findColumn("tasks", "notes")).toMatchObject({
      data_type: "text",
      is_nullable: "YES",
    })
    expect(findColumn("tasks", "status")).toMatchObject({
      data_type: "USER-DEFINED",
      udt_name: "task_status",
      is_nullable: "NO",
    })
    expect(findColumn("tasks", "created_at")).toMatchObject({
      data_type: "timestamp with time zone",
      is_nullable: "NO",
    })
    expect(findColumn("tasks", "updated_at")).toMatchObject({
      data_type: "timestamp with time zone",
      is_nullable: "NO",
    })

    const enumValues = await appPool.query<{ enumlabel: string }>(
      `
        SELECT enumlabel
        FROM pg_enum
        JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
        JOIN pg_namespace ON pg_namespace.oid = pg_type.typnamespace
        WHERE pg_namespace.nspname = $1 AND pg_type.typname = 'task_status'
        ORDER BY enumsortorder
      `,
      [schemaName]
    )
    expect(enumValues.rows.map((row) => row.enumlabel)).toEqual([
      "todo",
      "in_progress",
      "done",
    ])
  })

  it("enforces owner-scoped case-insensitive uniqueness and cascades tasks", async () => {
    const ownerId = "t04-owner-a"
    const otherOwnerId = "t04-owner-b"
    await database.insert(usersTable).values([
      {
        id: ownerId,
        name: "T-04 Owner A",
        email: "t04-owner-a@example.test",
      },
      {
        id: otherOwnerId,
        name: "T-04 Owner B",
        email: "t04-owner-b@example.test",
      },
    ])

    const ownerListId = "t04-list-owner"
    const otherOwnerListId = "t04-list-other-owner"
    const secondOwnerListId = "t04-list-second"
    await database.insert(listsTable).values([
      {
        id: ownerListId,
        userId: ownerId,
        name: "Inbox",
      },
      {
        id: otherOwnerListId,
        userId: otherOwnerId,
        name: "INBOX",
      },
      {
        id: secondOwnerListId,
        userId: ownerId,
        name: "Projects",
      },
    ])

    await expectUniqueViolation(() =>
      database.insert(listsTable).values({
        id: "t04-list-duplicate",
        userId: ownerId,
        name: "inBOX",
      })
    )

    const ownerTaskId = "t04-task-owner"
    const otherListTaskId = "t04-task-other-list"
    await database.insert(tasksTable).values([
      {
        id: ownerTaskId,
        listId: ownerListId,
        userId: ownerId,
        title: "Ship schema",
        status: "todo",
      },
      {
        id: otherListTaskId,
        listId: secondOwnerListId,
        userId: ownerId,
        title: "SHIP SCHEMA",
        status: "done",
      },
    ])

    await expectUniqueViolation(() =>
      database.insert(tasksTable).values({
        id: "t04-task-duplicate",
        listId: ownerListId,
        userId: ownerId,
        title: "ship schema",
        status: "todo",
      })
    )

    const ownerTask = await database
      .select({ id: tasksTable.id, createdAt: tasksTable.createdAt })
      .from(tasksTable)
      .where(eq(tasksTable.id, ownerTaskId))
    expect(ownerTask).toHaveLength(1)
    expect(ownerTask[0].createdAt).toBeInstanceOf(Date)

    await database.delete(listsTable).where(eq(listsTable.id, ownerListId))

    const cascadedTasks = await appPool.query(
      `SELECT id FROM ${qualifiedTable(schemaName, "tasks")} WHERE list_id = $1`,
      [ownerListId]
    )
    expect(cascadedTasks.rows).toEqual([])

    const survivingTasks = await database
      .select({ id: tasksTable.id })
      .from(tasksTable)
      .where(eq(tasksTable.id, otherListTaskId))
    expect(survivingTasks).toEqual([{ id: otherListTaskId }])
  })

  it("defines cascading foreign keys and query-shaped cursor indexes", async () => {
    const constraints = await appPool.query<{
      child_table: string
      parent_table: string
      delete_action: string
    }>(
      `
        SELECT child.relname AS child_table,
               parent.relname AS parent_table,
               constraint_data.confdeltype AS delete_action
        FROM pg_constraint AS constraint_data
        JOIN pg_class AS child ON child.oid = constraint_data.conrelid
        JOIN pg_class AS parent ON parent.oid = constraint_data.confrelid
        JOIN pg_namespace AS namespace_data
          ON namespace_data.oid = constraint_data.connamespace
        WHERE constraint_data.contype = 'f'
          AND namespace_data.nspname = $1
          AND child.relname IN ('lists', 'tasks')
      `,
      [schemaName]
    )
    expect(constraints.rows).toEqual(
      expect.arrayContaining([
        {
          child_table: "lists",
          parent_table: "users",
          delete_action: "c",
        },
        {
          child_table: "tasks",
          parent_table: "lists",
          delete_action: "c",
        },
        {
          child_table: "tasks",
          parent_table: "users",
          delete_action: "c",
        },
      ])
    )

    const indexes = await appPool.query<{
      tablename: string
      indexname: string
      indexdef: string
    }>(
      `
        SELECT tablename, indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = $1 AND tablename IN ('lists', 'tasks')
      `,
      [schemaName]
    )
    const indexDefinitions = indexes.rows.map((row) => row.indexdef)

    const normalizedIndexDefinitions = indexDefinitions.map((definition) =>
      definition.replace(/\s+/g, " ")
    )
    expect(normalizedIndexDefinitions).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`USING btree (user_id, created_at, id)`),
      ])
    )
    const taskCursorIndex = normalizedIndexDefinitions.find((definition) =>
      definition.includes(`USING btree (user_id, list_id, created_at DESC`)
    )
    expect(taskCursorIndex).toBeDefined()
    expect(taskCursorIndex).toContain(`id DESC`)
    expect(
      indexDefinitions.some(
        (definition) =>
          definition.includes(`UNIQUE INDEX`) &&
          definition.includes(`user_id`) &&
          definition.includes(`lower(name)`)
      )
    ).toBe(true)
    expect(
      indexDefinitions.some(
        (definition) =>
          definition.includes(`UNIQUE INDEX`) &&
          definition.includes(`list_id`) &&
          definition.includes(`lower(title)`)
      )
    ).toBe(true)

    const tableCount = await database.execute(
      sql`SELECT count(*)::int AS count FROM ${listsTable}`
    )
    expect(tableCount.rows[0]).toMatchObject({ count: 2 })
  })
})
