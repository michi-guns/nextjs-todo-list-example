import { readFile, readdir } from "node:fs/promises"
import path from "node:path"

import { drizzle } from "drizzle-orm/node-postgres"
import { eq } from "drizzle-orm"
import { Pool, type PoolClient } from "pg"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { usersTable } from "../../../../db/schema/auth"
import { listsTable } from "../../../../db/schema/lists"
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

function fixtureUuid(sequence: number) {
  return `0198f2c0-3a6b-7000-8000-${sequence.toString(16).padStart(12, "0")}`
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

  it("returns the renamed winner when an Inbox conflict is read back after a rename", async () => {
    const userId = `t06-inbox-race-${Date.now()}`
    await database.insert(usersTable).values({
      id: userId,
      name: "T-06 Inbox Race User",
      email: `${userId}@example.test`,
    })
    const repository = createDrizzleListRepository(database)

    let initialSelectCount = 0
    let initialSelectGateOpen = true
    let conflictPaused = false
    let releaseInitialSelects: () => void = () => undefined
    let initialSelectsReady: () => void = () => undefined
    let conflictReady: () => void = () => undefined
    let releaseConflictReadback: () => void = () => undefined
    const initialSelectGate = new Promise<void>((resolve) => {
      releaseInitialSelects = resolve
    })
    const initialSelectsObserved = new Promise<void>((resolve) => {
      initialSelectsReady = resolve
    })
    const conflictObserved = new Promise<void>((resolve) => {
      conflictReady = resolve
    })
    const conflictReadbackGate = new Promise<void>((resolve) => {
      releaseConflictReadback = resolve
    })

    const gatedPool = new Proxy(appPool!, {
      get(target, property, receiver) {
        if (property !== "query") {
          return Reflect.get(target, property, receiver)
        }

        return (...args: unknown[]) => {
          const firstArgument = args[0]
          const queryText =
            typeof firstArgument === "string"
              ? firstArgument
              : typeof firstArgument === "object" &&
                  firstArgument !== null &&
                  "text" in firstArgument &&
                  typeof firstArgument.text === "string"
                ? firstArgument.text
                : ""
          const normalizedQuery = queryText
            .replaceAll(/\s+/g, " ")
            .toLowerCase()

          return Promise.resolve(
            Reflect.apply(target.query, target, args)
          ).then(async (result: unknown) => {
            const rows =
              typeof result === "object" &&
              result !== null &&
              "rows" in result &&
              Array.isArray(result.rows)
                ? result.rows
                : []

            const isInitialEnsureSelect =
              initialSelectGateOpen &&
              normalizedQuery.includes('from "lists"') &&
              normalizedQuery.includes("order by") &&
              !normalizedQuery.includes("lower(")

            if (isInitialEnsureSelect) {
              initialSelectCount += 1
              if (initialSelectCount === 2) {
                initialSelectsReady()
              }
              await initialSelectGate
            }

            const isInboxInsert =
              normalizedQuery.includes('insert into "lists"') &&
              normalizedQuery.includes("on conflict do nothing") &&
              rows.length === 0

            if (isInboxInsert && !conflictPaused) {
              conflictPaused = true
              conflictReady()
              await conflictReadbackGate
            }

            return result
          })
        }
      },
    })
    const gatedDatabase = drizzle({ client: gatedPool })
    const gatedRepository = createDrizzleListRepository(gatedDatabase)
    const timestamp = new Date("2026-08-30T12:00:10.000Z")
    const ensureResults = Promise.all([
      gatedRepository.ensureDefaultInbox(userId, timestamp),
      gatedRepository.ensureDefaultInbox(userId, timestamp),
    ])

    await initialSelectsObserved
    initialSelectGateOpen = false
    releaseInitialSelects()
    await conflictObserved

    const winner = await repository.listByUser(userId, { limit: 20 })
    expect(winner.items).toHaveLength(1)
    await expect(
      repository.rename(
        userId,
        winner.items[0].id,
        "Projects",
        new Date("2026-08-30T12:00:11.000Z")
      )
    ).resolves.toMatchObject({ name: "Projects" })

    releaseConflictReadback()
    const results = await ensureResults
    expect(new Set(results.map((list) => list.id)).size).toBe(1)
    expect(results.some((list) => list.name === "Projects")).toBe(true)
    await expect(repository.listByUser(userId, { limit: 20 })).resolves.toEqual(
      {
        items: [expect.objectContaining({ name: "Projects" })],
        nextCursor: null,
      }
    )
  })

  it("does not add an Inbox when the user already has a list", async () => {
    const userId = `t06-existing-${Date.now()}`
    await database.insert(usersTable).values({
      id: userId,
      name: "T-06 Existing List User",
      email: `${userId}@example.test`,
    })

    const repository = createDrizzleListRepository(database)
    const existing = await repository.insert({
      userId,
      name: "Projects",
      now: new Date("2026-08-30T12:00:30.000Z"),
    })

    await expect(
      repository.ensureDefaultInbox(
        userId,
        new Date("2026-08-30T12:00:31.000Z")
      )
    ).resolves.toMatchObject({ id: existing.id, name: "Projects" })
    await expect(repository.listByUser(userId, { limit: 20 })).resolves.toEqual(
      {
        items: [expect.objectContaining({ id: existing.id, name: "Projects" })],
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

  it("uses the id tie-breaker when lists share a creation timestamp", async () => {
    const userId = `t06-page-tie-${Date.now()}`
    await database.insert(usersTable).values({
      id: userId,
      name: "T-06 Page Tie User",
      email: `${userId}@example.test`,
    })

    const repository = createDrizzleListRepository(database)
    const createdAt = new Date("2026-08-30T12:04:00.000Z")
    const firstId = "00000000-0000-4000-8000-000000000001"
    const secondId = "00000000-0000-4000-8000-000000000002"
    const thirdId = "00000000-0000-4000-8000-000000000003"
    await database.insert(listsTable).values([
      {
        id: thirdId,
        userId,
        name: "First inserted",
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: firstId,
        userId,
        name: "Second inserted",
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: secondId,
        userId,
        name: "Third inserted",
        createdAt,
        updatedAt: createdAt,
      },
    ])

    const firstPage = await repository.listByUser(userId, { limit: 2 })
    expect(firstPage.items.map((list) => list.id)).toEqual([firstId, secondId])
    expect(firstPage.nextCursor).toEqual(expect.any(String))
    expect(decodeListCursor(firstPage.nextCursor!, userId).id).toBe(secondId)

    const secondPage = await repository.listByUser(userId, {
      cursor: firstPage.nextCursor!,
      limit: 2,
    })
    expect(secondPage.items.map((list) => list.id)).toEqual([thirdId])
    expect(secondPage.nextCursor).toBeNull()
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
    const firstClient = await appPool!.connect()
    try {
      await firstClient.query("BEGIN")
      await firstClient.query(
        `UPDATE "lists"
         SET "name" = $1, "updated_at" = $2
         WHERE "user_id" = $3 AND "id" = $4`,
        ["First write", new Date("2026-08-30T12:06:00.000Z"), userId, list.id]
      )

      const laterWrite = repository.rename(
        userId,
        list.id,
        "Second write",
        new Date("2026-08-30T12:07:00.000Z")
      )
      await firstClient.query("COMMIT")
      await expect(laterWrite).resolves.toMatchObject({ name: "Second write" })
    } finally {
      firstClient.release()
    }

    const finalList = await repository.findByIdForUser(userId, list.id)
    expect(finalList?.name).toBe("Second write")
  })

  it("continues correctly at the maximum page size", async () => {
    const userId = `t08-list-max-page-${Date.now()}`
    await database.insert(usersTable).values({
      id: userId,
      name: "T-08 Maximum List Page User",
      email: `${userId}@example.test`,
    })

    const createdAt = new Date("2026-08-30T12:08:00.000Z")
    const listRows = Array.from({ length: 101 }, (_, index) => ({
      id: fixtureUuid(0x200 + index),
      userId,
      name: `Maximum page list ${index}`,
      createdAt,
      updatedAt: createdAt,
    }))
    await database.insert(listsTable).values(listRows)

    const repository = createDrizzleListRepository(database)
    const firstPage = await repository.listByUser(userId, { limit: 100 })
    expect(firstPage.items).toHaveLength(100)
    expect(firstPage.nextCursor).toEqual(expect.any(String))

    const secondPage = await repository.listByUser(userId, {
      cursor: firstPage.nextCursor!,
      limit: 100,
    })
    expect(secondPage.items).toHaveLength(1)
    expect(secondPage.items[0]?.name).toBe("Maximum page list 100")
    expect(secondPage.nextCursor).toBeNull()
  })
})
