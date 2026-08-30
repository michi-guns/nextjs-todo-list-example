import { readFile, readdir } from "node:fs/promises"
import path from "node:path"

import { drizzle } from "drizzle-orm/node-postgres"
import { eq } from "drizzle-orm"
import { Pool, type PoolClient } from "pg"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { usersTable } from "../../../../db/schema/auth"
import { tasksTable } from "../../../../db/schema/tasks"
import { createListApplication } from "../application/list-use-cases"
import { decodeListCursor } from "../application/list-cursor"
import { InvalidPageRequestError } from "../domain/list-errors"
import { createDrizzleListRepository } from "./drizzle-list-repository"

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

describe.sequential("Drizzle list repository", () => {
  const databaseUrl = getLocalDatabaseUrl(testDatabaseUrl)
  const schemaName = `codex_t06_${process.pid}_${Date.now()}`
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

  it("creates one Inbox under concurrent listless loads and recreates it after final deletion", async () => {
    const userId = `t06-inbox-${Date.now()}`
    await database.insert(usersTable).values({
      id: userId,
      name: "T-06 Inbox User",
      email: `${userId}@example.test`,
    })

    const repository = createDrizzleListRepository(database)
    const timestamp = new Date("2026-08-30T12:00:00.000Z")
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        repository.ensureDefaultInbox(userId, timestamp)
      )
    )

    expect(new Set(results.map((list) => list.id)).size).toBe(1)
    await expect(repository.listByUser(userId, { limit: 20 })).resolves.toEqual(
      {
        items: [expect.objectContaining({ name: "Inbox" })],
        nextCursor: null,
      }
    )

    expect(await repository.delete(userId, results[0].id)).toBe(true)
    const recreated = await repository.ensureDefaultInbox(userId, timestamp)
    expect(recreated.id).not.toBe(results[0].id)
    await expect(repository.listByUser(userId, { limit: 20 })).resolves.toEqual(
      {
        items: [expect.objectContaining({ name: "Inbox" })],
        nextCursor: null,
      }
    )
  })

  it("keeps CRUD owner-scoped and maps database uniqueness conflicts", async () => {
    const ownerId = `t06-owner-${Date.now()}`
    const otherOwnerId = `${ownerId}-other`
    await database.insert(usersTable).values([
      {
        id: ownerId,
        name: "T-06 Owner",
        email: `${ownerId}@example.test`,
      },
      {
        id: otherOwnerId,
        name: "T-06 Other Owner",
        email: `${otherOwnerId}@example.test`,
      },
    ])

    const repository = createDrizzleListRepository(database)
    const application = createListApplication(
      repository,
      () => new Date("2026-08-30T12:01:00.000Z")
    )
    const ownerList = await application.createList(ownerId, {
      name: "  Projects  ",
    })

    await expect(
      application.createList(ownerId, { name: "projects" })
    ).rejects.toMatchObject({ code: "conflict" })
    const otherList = await application.createList(otherOwnerId, {
      name: "Projects",
    })
    expect(otherList.userId).toBe(otherOwnerId)

    await expect(
      application.renameList(otherOwnerId, ownerList.id, { name: "Nope" })
    ).rejects.toMatchObject({ code: "not_found" })
    await expect(
      application.renameList(ownerId, ownerList.id, { name: "  Archive " })
    ).resolves.toMatchObject({ name: "Archive" })

    const task = await database
      .insert(tasksTable)
      .values({
        listId: ownerList.id,
        userId: ownerId,
        title: "Cascade me",
      })
      .returning({ id: tasksTable.id })
    await application.deleteList(ownerId, ownerList.id)

    await expect(
      database
        .select({ id: tasksTable.id })
        .from(tasksTable)
        .where(eq(tasksTable.id, task[0].id))
    ).resolves.toEqual([])
    await expect(
      application.listLists(ownerId, { limit: 20 })
    ).resolves.toEqual({
      items: [],
      nextCursor: null,
    })
  })

  it("returns deterministic bounded cursor pages and rejects another owner's cursor", async () => {
    const userId = `t06-pages-${Date.now()}`
    const otherUserId = `${userId}-other`
    await database.insert(usersTable).values([
      {
        id: userId,
        name: "T-06 Page User",
        email: `${userId}@example.test`,
      },
      {
        id: otherUserId,
        name: "T-06 Other Page User",
        email: `${otherUserId}@example.test`,
      },
    ])

    const repository = createDrizzleListRepository(database)
    const first = new Date("2026-08-30T12:02:00.000Z")
    const second = new Date("2026-08-30T12:03:00.000Z")
    const third = new Date("2026-08-30T12:04:00.000Z")
    await repository.insert({ userId, name: "First", now: first })
    await repository.insert({ userId, name: "Second", now: second })
    await repository.insert({ userId, name: "Third", now: third })

    const firstPage = await repository.listByUser(userId, { limit: 2 })
    expect(firstPage.items.map((list) => list.name)).toEqual([
      "First",
      "Second",
    ])
    expect(firstPage.nextCursor).toEqual(expect.any(String))
    expect(decodeListCursor(firstPage.nextCursor!, userId).userId).toBe(userId)

    const secondPage = await repository.listByUser(userId, {
      cursor: firstPage.nextCursor!,
      limit: 2,
    })
    expect(secondPage.items.map((list) => list.name)).toEqual(["Third"])
    expect(secondPage.nextCursor).toBeNull()

    await expect(
      repository.listByUser(otherUserId, {
        cursor: firstPage.nextCursor!,
        limit: 2,
      })
    ).rejects.toBeInstanceOf(InvalidPageRequestError)
    await expect(
      repository.listByUser(userId, { cursor: "bad", limit: 2 })
    ).rejects.toBeInstanceOf(InvalidPageRequestError)
    await expect(
      repository.listByUser(userId, { limit: 0 })
    ).rejects.toBeInstanceOf(InvalidPageRequestError)
  })

  it("retains the last successfully committed rename", async () => {
    const userId = `t06-write-${Date.now()}`
    await database.insert(usersTable).values({
      id: userId,
      name: "T-06 Write User",
      email: `${userId}@example.test`,
    })

    const repository = createDrizzleListRepository(database)
    const list = await repository.insert({
      userId,
      name: "Initial",
      now: new Date("2026-08-30T12:05:00.000Z"),
    })
    const writes = await Promise.all([
      repository.rename(
        userId,
        list.id,
        "First write",
        new Date("2026-08-30T12:06:00.000Z")
      ),
      repository.rename(
        userId,
        list.id,
        "Second write",
        new Date("2026-08-30T12:07:00.000Z")
      ),
    ])

    expect(writes.every(Boolean)).toBe(true)
    const finalList = await repository.findByIdForUser(userId, list.id)
    expect(["First write", "Second write"]).toContain(finalList?.name)
  })
})
