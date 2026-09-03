import { Pool } from "pg"

import type { EnvironmentProfile } from "../../environment/core"
import { PREVIEW_SEED_USER } from "./constants"

export { PREVIEW_SEED_USER } from "./constants"

type BetterAuthHandler = {
  handler(request: Request): Promise<Response>
}

const RUNTIME_KEYS = [
  "NODE_ENV",
  "APP_ENV",
  "DATABASE_URL",
  "BETTER_AUTH_URL",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_LOCAL_MAILBOX",
] as const

type RuntimeKey = (typeof RUNTIME_KEYS)[number]

const PREVIEW_TASKS = [
  { title: "Welcome to preview", status: "todo" as const, notes: null },
  {
    title: "Try the isolated Preview branch",
    status: "in_progress" as const,
    notes: "This row is synthetic Preview seed data.",
  },
] as const

export async function seedPreview(profile: EnvironmentProfile): Promise<void> {
  if (profile.appEnv !== "preview") {
    throw new Error("Preview seed requires APP_ENV=preview")
  }

  const original = rememberEnvironment()
  applyEnvironment(profile)

  const [{ auth }, database] = await Promise.all([
    import("../../../lib/auth"),
    import("../../../db/db"),
  ])

  try {
    const userId = await ensureVerifiedUser(
      auth as unknown as BetterAuthHandler,
      profile.betterAuth.url
    )
    await replaceSyntheticRecords(profile.database.runtimeUrl, userId)
  } finally {
    restoreEnvironment(original)
    await database.pool.end()
  }
}

async function ensureVerifiedUser(
  auth: BetterAuthHandler,
  betterAuthUrl: string
): Promise<string> {
  const existingId = await findSeedUserId()
  if (existingId) {
    await markEmailVerified(existingId)
    return existingId
  }

  const origin = new URL(betterAuthUrl).origin
  const response = await auth.handler(
    new Request(`${origin}/api/auth/sign-up/email`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin,
      },
      body: JSON.stringify({
        name: PREVIEW_SEED_USER.name,
        email: PREVIEW_SEED_USER.email,
        password: PREVIEW_SEED_USER.password,
      }),
    })
  )
  if (!response.ok) {
    throw new Error("Unable to create the Preview synthetic user")
  }

  const userId = readUserId(await response.json())
  if (!userId) {
    throw new Error("Preview synthetic user response was invalid")
  }

  await markEmailVerified(userId)
  return userId
}

async function findSeedUserId(): Promise<string | null> {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })
  try {
    const result = await pool.query<{ id: string }>(
      "SELECT id FROM users WHERE email = $1 LIMIT 1",
      [PREVIEW_SEED_USER.email]
    )
    return result.rows[0]?.id ?? null
  } finally {
    await pool.end()
  }
}

async function markEmailVerified(userId: string): Promise<void> {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })
  try {
    await pool.query("UPDATE users SET email_verified = true WHERE id = $1", [
      userId,
    ])
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
    await client.query("DELETE FROM lists WHERE user_id = $1", [userId])
    const list = await client.query<{ id: string }>(
      `INSERT INTO lists (user_id, name)
       VALUES ($1, $2)
       RETURNING id`,
      [userId, PREVIEW_SEED_USER.listName]
    )
    const listId = list.rows[0]?.id
    if (!listId) {
      throw new Error("Preview synthetic list was not created")
    }

    for (const task of PREVIEW_TASKS) {
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
  mutableEnvironment.APP_ENV = "preview"
  mutableEnvironment.NODE_ENV = "production"
  mutableEnvironment.DATABASE_URL = profile.database.runtimeUrl
  mutableEnvironment.BETTER_AUTH_URL = profile.betterAuth.url
  mutableEnvironment.BETTER_AUTH_SECRET = profile.betterAuth.secret
  delete mutableEnvironment.BETTER_AUTH_LOCAL_MAILBOX
}

function restoreEnvironment(original: Record<RuntimeKey, string | undefined>) {
  const mutableEnvironment = process.env as Record<string, string | undefined>
  for (const key of RUNTIME_KEYS) {
    const value = original[key]
    if (value === undefined) delete mutableEnvironment[key]
    else mutableEnvironment[key] = value
  }
}
