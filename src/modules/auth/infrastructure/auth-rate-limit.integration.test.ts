import { Pool } from "pg"
import { afterAll, describe, expect, inject, it } from "vitest"

import {
  assertLocalPostgresUrl,
  readMigrationSqlFiles,
  splitMigrationStatements,
} from "@/src/test/postgres-harness"

import { createAdmissionStore, createAuthAdmission } from "./auth-rate-limit"

const databaseUrl = assertLocalPostgresUrl(inject("testDatabaseUrl"))
const admin = new Pool({
  connectionString: databaseUrl,
  connectionTimeoutMillis: 1000,
})
const schemas: string[] = []
const pools: Pool[] = []
const isAdmissionMigration = (migration: string) =>
  migration.includes('CREATE TABLE "auth_rate_limit"')

/** One isolated schema; every returned pool is an independent connection set. */
async function isolatedTarget(name: string, options: { prior?: boolean } = {}) {
  const schema = `admission_${name}_${process.pid}_${Date.now()}`
  schemas.push(schema)
  await admin.query(`CREATE SCHEMA "${schema}"`)
  const connect = () => {
    const pool = new Pool({
      connectionString: databaseUrl,
      options: `-c search_path=${schema}`,
      connectionTimeoutMillis: 1000,
      max: 10,
    })
    pools.push(pool)
    return pool
  }
  const first = connect()
  const migrations = await readMigrationSqlFiles()
  const prior = migrations.slice(0, migrations.findIndex(isAdmissionMigration))
  for (const migration of options.prior ? prior : migrations)
    for (const statement of splitMigrationStatements(migration))
      await first.query(statement)
  return { first, connect }
}

const RULE = { window: 60, max: 3 }

async function row(pool: Pool, key: string) {
  const result = await pool.query<{ count: number; expires: Date }>(
    "SELECT count, window_expires_at AS expires FROM auth_rate_limit WHERE key = $1",
    [key]
  )
  return result.rows[0]
}

describe("TST-AUTH-006 shared PostgreSQL admission", () => {
  afterAll(async () => {
    for (const pool of pools) await pool.end()
    for (const schema of schemas)
      await admin.query(`DROP SCHEMA "${schema}" CASCADE`)
    await admin.end()
  })

  it("admits exactly the maximum under simultaneous first use across independent limiters", async () => {
    const target = await isolatedTarget("first_use")
    const limiters = [target.first, target.connect(), target.connect()].map(
      createAdmissionStore
    )
    const decisions = await Promise.all(
      Array.from({ length: 24 }, (_, index) =>
        limiters[index % limiters.length].consume("first-use", RULE)
      )
    )
    expect(decisions.filter((decision) => decision.allowed)).toHaveLength(3)
    expect((await row(target.first, "first-use")).count).toBe(3)
  })

  it("rejects an exhausted window without counting or extending it", async () => {
    const target = await isolatedTarget("exhausted")
    const store = createAdmissionStore(target.first)
    for (let index = 0; index < RULE.max; index += 1)
      expect((await store.consume("exhausted", RULE)).allowed).toBe(true)
    const before = await row(target.first, "exhausted")
    const denied = await store.consume("exhausted", RULE)
    expect(denied.allowed).toBe(false)
    expect(denied.retryAfter).toBeGreaterThanOrEqual(1)
    expect(denied.retryAfter).toBeLessThanOrEqual(RULE.window)
    expect(await row(target.first, "exhausted")).toEqual(before)
  })

  it("restarts an expired window at one, atomically across independent limiters", async () => {
    const target = await isolatedTarget("expired")
    const store = createAdmissionStore(target.first)
    for (let index = 0; index < RULE.max; index += 1)
      await store.consume("expired", RULE)
    // Database time decides expiry: move the window into the past.
    await target.first.query(
      "UPDATE auth_rate_limit SET window_expires_at = now() - interval '1 second' WHERE key = 'expired'"
    )
    const limiters = [target.first, target.connect()].map(createAdmissionStore)
    const decisions = await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        limiters[index % 2].consume("expired", RULE)
      )
    )
    expect(decisions.filter((decision) => decision.allowed)).toHaveLength(3)
    const restarted = await row(target.first, "expired")
    expect(restarted.count).toBe(3)
    expect(restarted.expires.getTime()).toBeGreaterThan(Date.now())
  })

  it("deletes only a bounded batch of expired rows", async () => {
    const target = await isolatedTarget("cleanup")
    await target.first.query(
      "INSERT INTO auth_rate_limit (key, count, window_expires_at) SELECT 'old-' || n, 1, now() - interval '1 minute' FROM generate_series(1, 150) AS n"
    )
    await target.first.query(
      "INSERT INTO auth_rate_limit (key, count, window_expires_at) VALUES ('live', 1, now() + interval '1 minute')"
    )
    const store = createAdmissionStore(target.first)
    expect(await store.cleanupExpired(100)).toBe(100)
    const left = await target.first.query<{ expired: number; live: number }>(
      "SELECT count(*) FILTER (WHERE window_expires_at <= now())::int AS expired, count(*) FILTER (WHERE key = 'live')::int AS live FROM auth_rate_limit"
    )
    expect(left.rows[0]).toEqual({ expired: 50, live: 1 })
  })

  it("bounds a recipient across IP rotation, keeps environments apart and stores only opaque keys", async () => {
    const target = await isolatedTarget("recipient")
    const admit = (environment: string, pool = target.first) =>
      createAuthAdmission({
        store: createAdmissionStore(pool),
        secret: "integration-secret-0123456789abcdef",
        environment,
      })
    const email = "Rotating.Recipient+a@example.test"
    // Each send may come from a different instance or client address.
    const sends = await Promise.all(
      Array.from({ length: 8 }, () =>
        admit("development", target.connect()).consumeRecipient("send", email)
      )
    )
    expect(sends.filter((send) => send.allowed)).toHaveLength(5)
    expect(sends.find((send) => !send.allowed)).toMatchObject({
      reason: "limited",
    })
    // The request budget is separate from the send budget.
    await expect(
      admit("development").consumeRecipient("request", email)
    ).resolves.toEqual({ allowed: true, retryAfter: null })
    // Another environment on the same database has its own budget.
    await expect(
      admit("preview").consumeRecipient("send", email)
    ).resolves.toEqual({ allowed: true, retryAfter: null })
    const keys = await target.first.query<{ key: string }>(
      "SELECT key FROM auth_rate_limit"
    )
    expect(keys.rows).toHaveLength(3)
    for (const { key } of keys.rows) {
      expect(key).toMatch(/^[a-z-]+:[0-9a-f]{64}$/)
      expect(key.toLowerCase()).not.toContain("recipient+a")
    }
  })

  it("denies mail admission when the database cannot be reached", async () => {
    const unreachable = new Pool({
      connectionString: "postgresql://postgres:postgres@127.0.0.1:1/none",
      connectionTimeoutMillis: 500,
    })
    pools.push(unreachable)
    const admission = createAuthAdmission({
      store: createAdmissionStore(unreachable),
      secret: "integration-secret-0123456789abcdef",
      environment: "development",
    })
    await expect(
      admission.consumeRecipient("send", "someone@example.test")
    ).resolves.toEqual({
      allowed: false,
      retryAfter: null,
      reason: "unavailable",
    })
  })

  it("upgrades the prior schema without losing existing data", async () => {
    const target = await isolatedTarget("upgrade", { prior: true })
    await expect(
      createAdmissionStore(target.first).consume("before", RULE)
    ).rejects.toMatchObject({ code: "42P01" })
    await target.first.query(
      "INSERT INTO users (id, name, email, email_verified, created_at, updated_at) VALUES ('upgrade-user', 'Synthetic', 'upgrade@example.test', true, now(), now())"
    )
    const migrations = await readMigrationSqlFiles()
    for (const statement of splitMigrationStatements(
      migrations.find(isAdmissionMigration)!
    ))
      await target.first.query(statement)
    expect((await target.first.query("SELECT id FROM users")).rows).toEqual([
      { id: "upgrade-user" },
    ])
    await expect(
      createAdmissionStore(target.first).consume("after", RULE)
    ).resolves.toEqual({ allowed: true, retryAfter: null })
    await expect(
      target.first.query(
        "INSERT INTO auth_rate_limit (key, count, window_expires_at) VALUES ('zero', 0, now())"
      )
    ).rejects.toMatchObject({ code: "23514" })
  })
})
