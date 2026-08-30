import { readFile, readdir } from "node:fs/promises"
import path from "node:path"

import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool, type PoolClient } from "pg"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { usersTable } from "../../../../db/schema/auth"
import { listsTable } from "../../../../db/schema/lists"
import { tasksTable } from "../../../../db/schema/tasks"
import { InvalidTaskPageRequestError } from "../domain/task-errors"
import { createDrizzleTaskRepository } from "./drizzle-task-repository"

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
    directories.map(async (directory) =>
      readFile(path.join(migrationsRoot, directory, "migration.sql"), "utf8")
    )
  )
}

describe.sequential("Drizzle task repository", () => {
  const databaseUrl = getLocalDatabaseUrl(testDatabaseUrl)
  const schemaName = `codex_t07_${process.pid}_${Date.now()}`
  let setupPool: Pool | undefined
  let appPool: Pool | undefined
  let database: ReturnType<typeof drizzle>

  beforeAll(async () => {
    setupPool = new Pool({ connectionString: databaseUrl })
    const setupClient = await setupPool.connect()

    try {
      await setupClient.query(`CREATE SCHEMA ${quoteIdentifier(schemaName)}`)
      await setupClient.query(
        `SET search_path TO ${quoteIdentifier(schemaName)}, public`
      )

      for (const migrationSql of await getMigrationSqlFiles()) {
        await applyMigration(setupClient, migrationSql)
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
    await appPool?.end()
    if (!setupPool) {
      return
    }

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

  it("keeps task CRUD owner-scoped, enforces list membership, and maps conflicts", async () => {
    const ownerId = `t07-owner-${Date.now()}`
    const otherOwnerId = `${ownerId}-other`
    const ownerListId = "0198f2c0-3a6b-7000-8000-000000000101"
    const ownerSecondListId = "0198f2c0-3a6b-7000-8000-000000000103"
    const otherListId = "0198f2c0-3a6b-7000-8000-000000000102"
    await database.insert(usersTable).values([
      {
        id: ownerId,
        name: "T-07 Owner",
        email: `${ownerId}@example.test`,
      },
      {
        id: otherOwnerId,
        name: "T-07 Other Owner",
        email: `${otherOwnerId}@example.test`,
      },
    ])
    await database.insert(listsTable).values([
      {
        id: ownerListId,
        userId: ownerId,
        name: "Owner list",
      },
      {
        id: ownerSecondListId,
        userId: ownerId,
        name: "Owner second list",
      },
      {
        id: otherListId,
        userId: otherOwnerId,
        name: "Other list",
      },
    ])

    const repository = createDrizzleTaskRepository(database)
    const created = await repository.insert({
      userId: ownerId,
      listId: ownerListId,
      title: "Buy milk",
      notes: "Remember oat milk",
      status: "todo",
      now: new Date("2026-08-30T13:01:00.000Z"),
    })
    if (created === "list_not_found") {
      throw new Error("expected the owned list to accept a task")
    }
    expect(created).toMatchObject({
      userId: ownerId,
      listId: ownerListId,
      title: "Buy milk",
      notes: "Remember oat milk",
      status: "todo",
    })

    await expect(
      repository.insert({
        userId: ownerId,
        listId: ownerListId,
        title: "buy milk",
        notes: null,
        status: "todo",
        now: new Date("2026-08-30T13:01:01.000Z"),
      })
    ).rejects.toMatchObject({ code: "conflict" })

    const sameTitleInOtherList = await repository.insert({
      userId: ownerId,
      listId: ownerSecondListId,
      title: "Buy milk",
      notes: null,
      status: "todo",
      now: new Date("2026-08-30T13:01:02.000Z"),
    })
    expect(sameTitleInOtherList).not.toBe("list_not_found")
    await expect(
      repository.insert({
        userId: otherOwnerId,
        listId: ownerListId,
        title: "Private task",
        notes: null,
        status: "todo",
        now: new Date("2026-08-30T13:01:03.000Z"),
      })
    ).resolves.toBe("list_not_found")

    await expect(
      repository.findByIdForUser(otherOwnerId, created.id)
    ).resolves.toBeNull()
    await expect(
      repository.listByOwnedList(otherOwnerId, ownerListId, {
        includeCompleted: true,
        limit: 20,
      })
    ).resolves.toEqual({ items: [], nextCursor: null })
    await expect(
      repository.updateForUser(
        otherOwnerId,
        created.id,
        { title: "Nope" },
        new Date()
      )
    ).resolves.toBeNull()

    await expect(
      repository.updateForUser(
        ownerId,
        created.id,
        { status: "done" },
        new Date("2026-08-30T13:01:04.000Z")
      )
    ).resolves.toMatchObject({
      title: "Buy milk",
      notes: "Remember oat milk",
      status: "done",
    })
    await expect(
      repository.updateForUser(
        ownerId,
        created.id,
        { notes: null },
        new Date("2026-08-30T13:01:05.000Z")
      )
    ).resolves.toMatchObject({ notes: null, status: "done" })

    await expect(
      repository.deleteForUser(otherOwnerId, created.id)
    ).resolves.toBe(false)
    await expect(repository.deleteForUser(ownerId, created.id)).resolves.toBe(
      true
    )
    await expect(
      repository.findByIdForUser(ownerId, created.id)
    ).resolves.toBeNull()
  })

  it("pages newest-first, filters completed tasks, and rejects incompatible cursors", async () => {
    const userId = `t07-pages-${Date.now()}`
    const otherUserId = `${userId}-other`
    const listId = "0198f2c0-3a6b-7000-8000-000000000111"
    const otherListId = "0198f2c0-3a6b-7000-8000-000000000112"
    const firstId = "0198f2c0-3a6b-7000-8000-000000000121"
    const secondId = "0198f2c0-3a6b-7000-8000-000000000122"
    const thirdId = "0198f2c0-3a6b-7000-8000-000000000123"
    const createdAt = new Date("2026-08-30T13:02:00.000Z")
    await database.insert(usersTable).values([
      {
        id: userId,
        name: "T-07 Page User",
        email: `${userId}@example.test`,
      },
      {
        id: otherUserId,
        name: "T-07 Other Page User",
        email: `${otherUserId}@example.test`,
      },
    ])
    await database.insert(listsTable).values([
      { id: listId, userId, name: "Tasks" },
      { id: otherListId, userId: otherUserId, name: "Other tasks" },
    ])
    await database.insert(tasksTable).values([
      {
        id: firstId,
        userId,
        listId,
        title: "First",
        status: "todo",
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: secondId,
        userId,
        listId,
        title: "Second",
        status: "done",
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: thirdId,
        userId,
        listId,
        title: "Third",
        status: "in_progress",
        createdAt,
        updatedAt: createdAt,
      },
    ])

    const repository = createDrizzleTaskRepository(database)
    const firstPage = await repository.listByOwnedList(userId, listId, {
      limit: 2,
      includeCompleted: true,
    })
    expect(firstPage.items.map((task) => task.id)).toEqual([thirdId, secondId])
    expect(firstPage.nextCursor).toEqual(expect.any(String))

    const secondPage = await repository.listByOwnedList(userId, listId, {
      cursor: firstPage.nextCursor!,
      limit: 2,
      includeCompleted: true,
    })
    expect(secondPage.items.map((task) => task.id)).toEqual([firstId])
    expect(secondPage.nextCursor).toBeNull()

    const activePage = await repository.listByOwnedList(userId, listId, {
      limit: 20,
      includeCompleted: false,
    })
    expect(activePage.items.map((task) => task.id)).toEqual([thirdId, firstId])

    await expect(
      repository.listByOwnedList(otherUserId, listId, {
        cursor: firstPage.nextCursor!,
        limit: 2,
        includeCompleted: true,
      })
    ).rejects.toBeInstanceOf(InvalidTaskPageRequestError)
    await expect(
      repository.listByOwnedList(userId, otherListId, {
        cursor: firstPage.nextCursor!,
        limit: 2,
        includeCompleted: true,
      })
    ).rejects.toBeInstanceOf(InvalidTaskPageRequestError)
    await expect(
      repository.listByOwnedList(userId, listId, {
        cursor: firstPage.nextCursor!,
        limit: 2,
        includeCompleted: false,
      })
    ).rejects.toBeInstanceOf(InvalidTaskPageRequestError)
    await expect(
      repository.listByOwnedList(userId, listId, {
        cursor: "bad",
        limit: 2,
        includeCompleted: true,
      })
    ).rejects.toBeInstanceOf(InvalidTaskPageRequestError)
    await expect(
      repository.listByOwnedList(userId, listId, {
        limit: 0,
        includeCompleted: true,
      })
    ).rejects.toBeInstanceOf(InvalidTaskPageRequestError)
  })

  it("retains later task writes and preserves disjoint fields", async () => {
    const userId = `t07-write-${Date.now()}`
    const listId = "0198f2c0-3a6b-7000-8000-000000000131"
    await database.insert(usersTable).values({
      id: userId,
      name: "T-07 Write User",
      email: `${userId}@example.test`,
    })
    await database.insert(listsTable).values({
      id: listId,
      userId,
      name: "Writes",
    })

    const repository = createDrizzleTaskRepository(database)
    const task = await repository.insert({
      userId,
      listId,
      title: "Initial",
      notes: "Keep me",
      status: "todo",
      now: new Date("2026-08-30T13:03:00.000Z"),
    })
    if (task === "list_not_found") {
      throw new Error("expected the owned list to accept a task")
    }

    const firstClient = await appPool!.connect()
    try {
      await firstClient.query("BEGIN")
      await firstClient.query(
        `UPDATE "tasks"
         SET "title" = $1, "updated_at" = $2
         WHERE "user_id" = $3 AND "id" = $4`,
        ["First write", new Date("2026-08-30T13:03:01.000Z"), userId, task.id]
      )

      const laterTitle = repository.updateForUser(
        userId,
        task.id,
        { title: "Second write" },
        new Date("2026-08-30T13:03:02.000Z")
      )
      await firstClient.query("COMMIT")
      await expect(laterTitle).resolves.toMatchObject({
        title: "Second write",
        notes: "Keep me",
        status: "todo",
      })

      await firstClient.query("BEGIN")
      await firstClient.query(
        `UPDATE "tasks"
         SET "title" = $1, "updated_at" = $2
         WHERE "user_id" = $3 AND "id" = $4`,
        ["Third write", new Date("2026-08-30T13:03:03.000Z"), userId, task.id]
      )
      const disjointStatus = repository.updateForUser(
        userId,
        task.id,
        { status: "done" },
        new Date("2026-08-30T13:03:04.000Z")
      )
      await firstClient.query("COMMIT")
      await expect(disjointStatus).resolves.toMatchObject({
        title: "Third write",
        notes: "Keep me",
        status: "done",
      })
    } finally {
      firstClient.release()
    }

    await expect(
      repository.findByIdForUser(userId, task.id)
    ).resolves.toMatchObject({
      title: "Third write",
      notes: "Keep me",
      status: "done",
    })
  })

  it("cascades task deletion when its list is removed", async () => {
    const userId = `t07-cascade-${Date.now()}`
    const listId = "0198f2c0-3a6b-7000-8000-000000000141"
    await database.insert(usersTable).values({
      id: userId,
      name: "T-07 Cascade User",
      email: `${userId}@example.test`,
    })
    await database.insert(listsTable).values({
      id: listId,
      userId,
      name: "Cascade",
    })
    const repository = createDrizzleTaskRepository(database)
    const task = await repository.insert({
      userId,
      listId,
      title: "Cascade me",
      notes: null,
      status: "todo",
      now: new Date("2026-08-30T13:04:00.000Z"),
    })
    if (task === "list_not_found") {
      throw new Error("expected the owned list to accept a task")
    }

    await database.delete(listsTable).where(eq(listsTable.id, listId))
    await expect(
      database
        .select({ id: tasksTable.id })
        .from(tasksTable)
        .where(eq(tasksTable.id, task.id))
    ).resolves.toEqual([])
  })
})
