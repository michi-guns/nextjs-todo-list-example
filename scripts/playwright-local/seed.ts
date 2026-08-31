import { Pool } from "pg"

import { assertLocalPostgresUrl } from "../../src/test/postgres-harness"
import type { MagicLinkMessage } from "../../src/modules/auth/infrastructure/local-mailbox"

export const PLAYWRIGHT_PASSWORD = "Playwright local password 123!"

export const PLAYWRIGHT_USER_KEYS = [
  "core",
  "pagination",
  "skipLink",
  "magicLink",
  "privacyPrimary",
  "privacySecondary",
] as const

export type PlaywrightUserKey = (typeof PLAYWRIGHT_USER_KEYS)[number]

export interface PlaywrightUserFixture {
  readonly email: string
  readonly password: string
  readonly listName: string
}

export const PLAYWRIGHT_USERS: Readonly<
  Record<PlaywrightUserKey, PlaywrightUserFixture>
> = {
  core: {
    email: "playwright-core@example.test",
    password: PLAYWRIGHT_PASSWORD,
    listName: "Core Inbox",
  },
  pagination: {
    email: "playwright-pagination@example.test",
    password: PLAYWRIGHT_PASSWORD,
    listName: "Pagination Inbox",
  },
  skipLink: {
    email: "playwright-skip-link@example.test",
    password: PLAYWRIGHT_PASSWORD,
    listName: "Skip Inbox",
  },
  magicLink: {
    email: "playwright-magic-link@example.test",
    password: PLAYWRIGHT_PASSWORD,
    listName: "Magic Inbox",
  },
  privacyPrimary: {
    email: "playwright-privacy-primary@example.test",
    password: PLAYWRIGHT_PASSWORD,
    listName: "Private Primary",
  },
  privacySecondary: {
    email: "playwright-privacy-secondary@example.test",
    password: PLAYWRIGHT_PASSWORD,
    listName: "Private Secondary",
  },
}

export interface PlaywrightSeedUser extends PlaywrightUserFixture {
  readonly id: string
  readonly name: string
}

export interface PlaywrightSeedList {
  readonly id: string
  readonly userKey: PlaywrightUserKey
  readonly name: string
  readonly createdAt: string
}

export type PlaywrightSeedTaskStatus = "todo" | "in_progress" | "done"

export interface PlaywrightSeedTask {
  readonly id: string
  readonly listId: string
  readonly userKey: PlaywrightUserKey
  readonly title: string
  readonly notes: string | null
  readonly status: PlaywrightSeedTaskStatus
  readonly createdAt: string
}

export interface PlaywrightSeedPlan {
  readonly lists: readonly PlaywrightSeedList[]
  readonly tasks: readonly PlaywrightSeedTask[]
}

export interface PlaywrightSeed {
  readonly users: Readonly<Record<PlaywrightUserKey, PlaywrightSeedUser>>
  readonly lists: readonly PlaywrightSeedList[]
  readonly tasks: readonly PlaywrightSeedTask[]
}

const PLAN_EPOCH = Date.parse("2026-08-31T00:00:00.000Z")

function fixedUuid(number: number): string {
  return `00000000-0000-4000-8000-${number.toString(16).padStart(12, "0")}`
}

function planTime(offsetSeconds: number): string {
  return new Date(PLAN_EPOCH + offsetSeconds * 1_000).toISOString()
}

function createList(
  userKey: PlaywrightUserKey,
  id: number,
  name: string,
  offsetSeconds: number
): PlaywrightSeedList {
  return {
    id: fixedUuid(id),
    userKey,
    name,
    createdAt: planTime(offsetSeconds),
  }
}

function createTask(
  userKey: PlaywrightUserKey,
  listId: string,
  id: number,
  title: string,
  status: PlaywrightSeedTaskStatus,
  offsetSeconds: number,
  notes: string | null = null
): PlaywrightSeedTask {
  return {
    id: fixedUuid(id),
    listId,
    userKey,
    title,
    notes,
    status,
    createdAt: planTime(offsetSeconds),
  }
}

export function createPlaywrightSeedPlan(): PlaywrightSeedPlan {
  const coreList = createList("core", 1, PLAYWRIGHT_USERS.core.listName, 0)
  const paginationLists = Array.from({ length: 21 }, (_, index) =>
    createList(
      "pagination",
      100 + index,
      index === 0
        ? PLAYWRIGHT_USERS.pagination.listName
        : `Pagination List ${String(index + 1).padStart(2, "0")}`,
      index
    )
  )
  const skipList = createList(
    "skipLink",
    200,
    PLAYWRIGHT_USERS.skipLink.listName,
    0
  )
  const magicList = createList(
    "magicLink",
    300,
    PLAYWRIGHT_USERS.magicLink.listName,
    0
  )
  const privacyPrimaryList = createList(
    "privacyPrimary",
    400,
    PLAYWRIGHT_USERS.privacyPrimary.listName,
    0
  )
  const privacySecondaryList = createList(
    "privacySecondary",
    500,
    PLAYWRIGHT_USERS.privacySecondary.listName,
    0
  )

  const lists = [
    coreList,
    ...paginationLists,
    skipList,
    magicList,
    privacyPrimaryList,
    privacySecondaryList,
  ]

  const paginationTasks = Array.from({ length: 21 }, (_, index) => {
    const taskNumber = index + 1
    return createTask(
      "pagination",
      paginationLists[0].id,
      1_000 + taskNumber,
      `Pagination seeded task ${String(taskNumber).padStart(2, "0")}`,
      taskNumber % 5 === 0 ? "done" : "todo",
      10_000 - taskNumber,
      taskNumber % 3 === 0 ? `Seeded note ${taskNumber}` : null
    )
  })

  const tasks = [
    createTask(
      "core",
      coreList.id,
      600,
      "Core seeded task",
      "todo",
      0,
      "A deterministic core task."
    ),
    ...paginationTasks,
    createTask(
      "skipLink",
      skipList.id,
      700,
      "Skip-link seeded task",
      "todo",
      0
    ),
    createTask(
      "magicLink",
      magicList.id,
      800,
      "Magic-link seeded task",
      "todo",
      0
    ),
    createTask(
      "privacyPrimary",
      privacyPrimaryList.id,
      900,
      "Primary private task",
      "todo",
      0
    ),
    createTask(
      "privacySecondary",
      privacySecondaryList.id,
      901,
      "Secondary private task",
      "todo",
      0
    ),
  ]

  return { lists, tasks }
}

type BetterAuthHandler = {
  handler(request: Request): Promise<Response>
}

type MailboxReader = {
  clearMagicLinkMailbox(): Promise<void>
  readLatestMagicLink(email: string): Promise<MagicLinkMessage | null>
}

function readUserId(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null
  const user = (payload as { user?: unknown }).user
  if (typeof user !== "object" || user === null) return null
  const id = (user as { id?: unknown }).id
  return typeof id === "string" && id.length > 0 ? id : null
}

async function createVerifiedUser(
  auth: BetterAuthHandler,
  mailbox: MailboxReader,
  baseUrl: string,
  userKey: PlaywrightUserKey,
  fixture: PlaywrightUserFixture
): Promise<PlaywrightSeedUser> {
  const origin = new URL(baseUrl).origin
  await mailbox.clearMagicLinkMailbox()

  const response = await auth.handler(
    new Request(`${origin}/api/auth/sign-up/email`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin,
      },
      body: JSON.stringify({
        name: `Playwright ${userKey}`,
        email: fixture.email,
        password: fixture.password,
      }),
    })
  )
  if (!response.ok) {
    throw new Error(`Unable to create Playwright ${userKey} user`)
  }

  const userId = readUserId(await response.json())
  if (!userId)
    throw new Error(`Playwright ${userKey} user response was invalid`)

  const message = await mailbox.readLatestMagicLink(fixture.email)
  if (!message || !message.url.includes("/verify-email")) {
    throw new Error(
      `Playwright ${userKey} verification message was not captured`
    )
  }

  const verificationResponse = await auth.handler(
    new Request(new URL(message.url, origin), {
      headers: { origin },
    })
  )
  if (verificationResponse.status < 300 || verificationResponse.status >= 400) {
    throw new Error(`Unable to verify Playwright ${userKey} user`)
  }

  return {
    ...fixture,
    id: userId,
    name: `Playwright ${userKey}`,
  }
}

async function insertSeedPlan(
  databaseUrl: string,
  users: Readonly<Record<PlaywrightUserKey, PlaywrightSeedUser>>,
  plan: PlaywrightSeedPlan
): Promise<void> {
  const pool = new Pool({
    connectionString: assertLocalPostgresUrl(databaseUrl),
  })
  const client = await pool.connect()

  try {
    await client.query("BEGIN")
    for (const list of plan.lists) {
      await client.query(
        `INSERT INTO lists (id, user_id, name, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $4)`,
        [list.id, users[list.userKey].id, list.name, list.createdAt]
      )
    }
    for (const task of plan.tasks) {
      await client.query(
        `INSERT INTO tasks
          (id, list_id, user_id, title, notes, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`,
        [
          task.id,
          task.listId,
          users[task.userKey].id,
          task.title,
          task.notes,
          task.status,
          task.createdAt,
        ]
      )
    }
    await client.query("COMMIT")
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

export async function seedPlaywrightDatabase(
  databaseUrl: string,
  baseUrl: string
): Promise<PlaywrightSeed> {
  assertLocalPostgresUrl(databaseUrl)
  const origin = new URL(baseUrl).origin
  if (!/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(origin)) {
    throw new Error("Playwright seed requires a loopback base URL")
  }

  const [{ auth }, mailbox, database] = await Promise.all([
    import("../../lib/auth"),
    import("../../src/modules/auth/infrastructure/local-mailbox"),
    import("../../db/db"),
  ])
  const authDatabasePool = database.pool
  const users: Partial<Record<PlaywrightUserKey, PlaywrightSeedUser>> = {}

  try {
    const authHandler = auth as unknown as BetterAuthHandler
    for (const userKey of PLAYWRIGHT_USER_KEYS) {
      users[userKey] = await createVerifiedUser(
        authHandler,
        mailbox,
        origin,
        userKey,
        PLAYWRIGHT_USERS[userKey]
      )
    }

    const completeUsers = users as Readonly<
      Record<PlaywrightUserKey, PlaywrightSeedUser>
    >
    const plan = createPlaywrightSeedPlan()
    await insertSeedPlan(databaseUrl, completeUsers, plan)
    await mailbox.clearMagicLinkMailbox()

    return { users: completeUsers, ...plan }
  } finally {
    await authDatabasePool.end()
  }
}
