import { Pool } from "pg"

import type { EnvironmentProfile } from "../environment/core"
import { LOCAL_SEED_USER } from "./constants"
import { assertProfileMatchesLocalCompose } from "./core"

export { LOCAL_SEED_USER } from "./constants"

const LOCAL_SEED_TASKS = [
  { title: "Welcome to the local app", status: "todo" as const, notes: null },
  {
    title: "Try adding another list",
    status: "in_progress" as const,
    notes: "This row is synthetic local seed data.",
  },
] as const

type BetterAuthHandler = {
  handler(request: Request): Promise<Response>
}

type MailboxReader = {
  clearMagicLinkMailbox(): Promise<void>
  readLatestMagicLink(email: string): Promise<{ url: string } | null>
}

const RUNTIME_KEYS = [
  "NODE_ENV",
  "DATABASE_URL",
  "BETTER_AUTH_URL",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_LOCAL_MAILBOX",
] as const

type RuntimeKey = (typeof RUNTIME_KEYS)[number]

export async function seedLocalPostgres(
  profile: EnvironmentProfile
): Promise<void> {
  assertProfileMatchesLocalCompose(profile)
  const original = rememberEnvironment()
  applyEnvironment(profile)

  const [{ auth }, mailbox, database] = await Promise.all([
    import("../../lib/auth"),
    import("../../src/modules/auth/infrastructure/local-mailbox"),
    import("../../db/db"),
  ])

  try {
    const userId = await ensureVerifiedUser(
      auth as unknown as BetterAuthHandler,
      mailbox,
      profile.betterAuth.url
    )
    await replaceSyntheticRecords(profile.database.runtimeUrl, userId)
    await mailbox.clearMagicLinkMailbox()
  } finally {
    restoreEnvironment(original)
    await database.pool.end()
  }
}

async function ensureVerifiedUser(
  auth: BetterAuthHandler,
  mailbox: MailboxReader,
  betterAuthUrl: string
): Promise<string> {
  const existingId = await findSeedUserId()
  if (existingId) return existingId

  const origin = new URL(betterAuthUrl).origin
  await mailbox.clearMagicLinkMailbox()

  const response = await auth.handler(
    new Request(`${origin}/api/auth/sign-up/email`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin,
      },
      body: JSON.stringify({
        name: LOCAL_SEED_USER.name,
        email: LOCAL_SEED_USER.email,
        password: LOCAL_SEED_USER.password,
      }),
    })
  )
  if (!response.ok) {
    throw new Error("Unable to create the local synthetic user")
  }

  const userId = readUserId(await response.json())
  if (!userId) {
    throw new Error("Local synthetic user response was invalid")
  }

  const message = await mailbox.readLatestMagicLink(LOCAL_SEED_USER.email)
  if (!message || !message.url.includes("/verify-email")) {
    throw new Error(
      "Local synthetic user verification message was not captured"
    )
  }

  const verificationResponse = await auth.handler(
    new Request(new URL(message.url, origin), {
      headers: { origin },
    })
  )
  if (verificationResponse.status < 300 || verificationResponse.status >= 400) {
    throw new Error("Unable to verify the local synthetic user")
  }

  return userId
}

async function findSeedUserId(): Promise<string | null> {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })
  try {
    const result = await pool.query<{ id: string }>(
      "SELECT id FROM users WHERE email = $1 LIMIT 1",
      [LOCAL_SEED_USER.email]
    )
    return result.rows[0]?.id ?? null
  } finally {
    await pool.end()
  }
}

async function replaceSyntheticRecords(
  databaseUrl: string,
  userId: string
): Promise<void> {
  const pool = new Pool({ connectionString: databaseUrl })
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    await client.query(
      `DELETE FROM lists
       WHERE user_id = $1 AND lower(name) = lower($2)`,
      [userId, LOCAL_SEED_USER.listName]
    )
    const list = await client.query<{ id: string }>(
      `INSERT INTO lists (user_id, name)
       VALUES ($1, $2)
       RETURNING id`,
      [userId, LOCAL_SEED_USER.listName]
    )
    const listId = list.rows[0]?.id
    if (!listId) {
      throw new Error("Local synthetic list was not created")
    }
    for (const task of LOCAL_SEED_TASKS) {
      await client.query(
        `INSERT INTO tasks (list_id, user_id, title, notes, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [listId, userId, task.title, task.notes, task.status]
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

function readUserId(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null
  const user = (payload as { user?: unknown }).user
  if (typeof user !== "object" || user === null) return null
  const id = (user as { id?: unknown }).id
  return typeof id === "string" && id.length > 0 ? id : null
}

function rememberEnvironment(): Record<RuntimeKey, string | undefined> {
  return Object.fromEntries(
    RUNTIME_KEYS.map((key) => [key, process.env[key]])
  ) as Record<RuntimeKey, string | undefined>
}

function applyEnvironment(profile: EnvironmentProfile) {
  const mutableEnvironment = process.env as Record<string, string | undefined>
  mutableEnvironment.NODE_ENV = "development"
  mutableEnvironment.DATABASE_URL = profile.database.runtimeUrl
  mutableEnvironment.BETTER_AUTH_URL = profile.betterAuth.url
  mutableEnvironment.BETTER_AUTH_SECRET = profile.betterAuth.secret
  mutableEnvironment.BETTER_AUTH_LOCAL_MAILBOX = "true"
}

function restoreEnvironment(original: Record<RuntimeKey, string | undefined>) {
  const mutableEnvironment = process.env as Record<string, string | undefined>
  for (const key of RUNTIME_KEYS) {
    const value = original[key]
    if (value === undefined) delete mutableEnvironment[key]
    else mutableEnvironment[key] = value
  }
}
