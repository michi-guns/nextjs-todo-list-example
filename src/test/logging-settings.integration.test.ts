import { Pool } from "pg"
import { afterAll, beforeAll, describe, expect, inject, it, vi } from "vitest"
import { defaultLogPolicy } from "../shared/logging/config"
import { createSettingsCache } from "../shared/logging/settings-cache"
import { createSettingsStore } from "../shared/logging/settings-store"
import {
  assertLocalPostgresUrl,
  readMigrationSqlFiles,
  splitMigrationStatements,
} from "./postgres-harness"

vi.mock("server-only", () => ({}))
const databaseUrl = assertLocalPostgresUrl(inject("testDatabaseUrl"))
const admin = new Pool({
  connectionString: databaseUrl,
  connectionTimeoutMillis: 1000,
})
const schemas: string[] = []
const pools: Pool[] = []
async function isolatedTarget(name: string, priorOnly = false) {
  const schema = `logging_${name}_${process.pid}_${Date.now()}`
  schemas.push(schema)
  await admin.query(`CREATE SCHEMA "${schema}"`)
  const pool = new Pool({
    connectionString: databaseUrl,
    options: `-c search_path=${schema}`,
    connectionTimeoutMillis: 1000,
    max: 2,
  })
  pools.push(pool)
  const migrations = await readMigrationSqlFiles()
  for (const migration of priorOnly ? migrations.slice(0, -1) : migrations) {
    for (const statement of splitMigrationStatements(migration))
      await pool.query(statement)
  }
  return pool
}

describe("TST-LOGGING-002 real settings persistence", () => {
  let first: Pool
  let second: Pool
  beforeAll(async () => {
    first = await isolatedTarget("first")
    second = await isolatedTarget("second")
  })
  afterAll(async () => {
    for (const pool of pools) await pool.end()
    for (const schema of schemas)
      await admin.query(`DROP SCHEMA "${schema}" CASCADE`)
    await admin.end()
  })

  it("reads without creating defaults; independent caches converge and targets stay isolated", async () => {
    const store = createSettingsStore(first)
    expect(await store.read()).toBeNull()
    const a = createSettingsCache(store)
    const peer = new Pool({ ...first.options })
    pools.push(peer)
    const b = createSettingsCache(createSettingsStore(peer))
    const saved = await store.set(
      { ...defaultLogPolicy, revision: 1, enabled: false },
      0
    )
    await Promise.all([a.refresh(), b.refresh()])
    expect(a.current()).toEqual(saved)
    expect(b.current()).toEqual(saved)
    expect(await createSettingsStore(second).read()).toBeNull()
    const clock = vi
      .spyOn(performance, "now")
      .mockReturnValue(performance.now() + 31_000)
    try {
      const next = await store.set({ ...defaultLogPolicy, revision: 2 }, 1)
      await Promise.all([a.refresh(), b.refresh()])
      expect(a.current()).toEqual(next)
      expect(b.current()).toEqual(next)
    } finally {
      clock.mockRestore()
    }
  })

  it("rejects invalid writes and atomically accepts only one concurrent revision", async () => {
    const store = createSettingsStore(first)
    await expect(
      store.set({ ...defaultLogPolicy, revision: 3, minimumLevel: "bogus" }, 2)
    ).rejects.toMatchObject({ code: "invalid_policy" })
    const updates = await Promise.allSettled([
      store.set({ ...defaultLogPolicy, revision: 3, minimumLevel: "debug" }, 2),
      createSettingsStore(first).set(
        { ...defaultLogPolicy, revision: 3, minimumLevel: "error" },
        2
      ),
    ])
    expect(
      updates.filter((result) => result.status === "fulfilled")
    ).toHaveLength(1)
    expect(
      updates.find((result) => result.status === "rejected")
    ).toMatchObject({ reason: { code: "revision_conflict" } })
    expect((await store.read())?.revision).toBe(3)
    await expect(
      store.set({ ...defaultLogPolicy, revision: 1 }, 0)
    ).rejects.toMatchObject({ code: "revision_conflict" })
  })

  it("retains old policy after malformed reads and a real locked-table timeout, then frees the pool", async () => {
    const store = createSettingsStore(first)
    const cache = createSettingsCache(store)
    await cache.refresh()
    const last = cache.current()
    await first.query("UPDATE logging_settings SET policy = '{}'::jsonb")
    await expect(store.read()).rejects.toMatchObject({ code: "invalid_policy" })
    expect(cache.current()).toEqual(last)
    const locker = await first.connect()
    await locker.query("BEGIN")
    await locker.query("LOCK TABLE logging_settings IN ACCESS EXCLUSIVE MODE")
    try {
      const start = performance.now()
      await expect(store.read()).rejects.toMatchObject({
        code: "settings_unavailable",
      })
      expect(performance.now() - start).toBeLessThan(2500)
    } finally {
      await locker.query("ROLLBACK")
      locker.release()
    }
    expect(first.waitingCount).toBe(0)
    await first.query("SELECT 1")
    const sessions = await admin.query(
      "SELECT count(*)::int AS count FROM pg_stat_activity WHERE pid <> pg_backend_pid() AND state = 'active' AND query LIKE '%logging_settings%'"
    )
    expect(sessions.rows[0].count).toBe(0)
  })

  it("upgrades the prior schema without losing existing data", async () => {
    const prior = await isolatedTarget("upgrade", true)
    const cache = createSettingsCache(createSettingsStore(prior))
    await cache.refresh()
    expect(cache.current()).toEqual(defaultLogPolicy)
    await expect(createSettingsStore(prior).read()).rejects.toMatchObject({
      code: "settings_unavailable",
    })
    await prior.query(
      "INSERT INTO users (id, name, email, email_verified, created_at, updated_at) VALUES ('upgrade-user', 'Synthetic', 'upgrade@example.test', true, now(), now())"
    )
    const migrations = await readMigrationSqlFiles()
    for (const statement of splitMigrationStatements(migrations.at(-1)!))
      await prior.query(statement)
    expect((await prior.query("SELECT id FROM users")).rows).toEqual([
      { id: "upgrade-user" },
    ])
    expect(await createSettingsStore(prior).read()).toBeNull()
  })

  it("times out a full pool acquisition and removes its waiter without queuing SQL", async () => {
    const pool = new Pool({
      connectionString: databaseUrl,
      max: 1,
      connectionTimeoutMillis: 100,
    })
    pools.push(pool)
    const held = await pool.connect()
    try {
      await expect(createSettingsStore(pool).read()).rejects.toMatchObject({
        code: "settings_unavailable",
      })
      expect(pool.waitingCount).toBe(0)
      expect(pool.totalCount).toBe(1)
    } finally {
      held.release()
    }
    expect(await createSettingsStore(pool).read()).toBeNull()
  })
})
