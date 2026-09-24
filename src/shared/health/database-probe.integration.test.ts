import { Pool } from "pg"
import { afterEach, describe, expect, it } from "vitest"

import { createDatabaseProbe } from "./probes"

const databaseUrl = process.env.TEST_DATABASE_URL?.trim()
if (!databaseUrl || !/@(127\.0\.0\.1|localhost)[:/]/.test(databaseUrl)) {
  throw new Error(
    "TEST_DATABASE_URL must point to the local PostgreSQL harness"
  )
}

const pools: Pool[] = []
function pool(options: { max?: number; connectionString?: string } = {}) {
  const created = new Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 2_000,
    ...options,
  })
  pools.push(created)
  return created
}

afterEach(async () => {
  await Promise.allSettled(pools.splice(0).map((created) => created.end()))
})

async function until(check: () => boolean | Promise<boolean>, ms = 3_000) {
  const stop = Date.now() + ms
  while (!(await check())) {
    if (Date.now() > stop) throw new Error("condition not reached")
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
}

describe("TST-RUNTIME-001 database probe against real PostgreSQL", () => {
  it("answers through the shared pool and returns its connection", async () => {
    const shared = pool()
    await expect(createDatabaseProbe(shared)()).resolves.toEqual({
      status: "ok",
    })
    expect({
      total: shared.totalCount,
      idle: shared.idleCount,
      waiting: shared.waitingCount,
    }).toEqual({ total: 1, idle: 1, waiting: 0 })
  })

  it("runs read-only: a mutation inside the probe is refused by the server", async () => {
    const shared = pool()
    await expect(
      createDatabaseProbe(shared, {
        statement: "CREATE TABLE health_probe_must_not_exist (id int)",
      })()
    ).resolves.toEqual({ status: "unavailable", code: "query_failed" })
    const { rows } = await shared.query(
      "SELECT to_regclass('health_probe_must_not_exist') AS name"
    )
    expect(rows[0].name).toBeNull()
  })

  it("reports an unreachable database without waiting for the deadline", async () => {
    const unreachable = pool({
      connectionString: databaseUrl!.replace(/:(\d+)\//, ":1/"),
    })
    const started = performance.now()
    await expect(createDatabaseProbe(unreachable)()).resolves.toEqual({
      status: "unavailable",
      code: "unreachable",
    })
    expect(performance.now() - started).toBeLessThan(2_500)
  })

  it("bounds acquisition and releases a late connection as soon as it arrives", async () => {
    const shared = pool({ max: 1 })
    const holder = await shared.connect()
    const probe = createDatabaseProbe(shared, { deadlineMs: 200 })
    const started = performance.now()
    await expect(probe()).resolves.toEqual({
      status: "unavailable",
      code: "timeout",
    })
    expect(performance.now() - started).toBeLessThan(1_000)
    // Still saturated: no second acquisition is queued behind the first.
    await expect(probe()).resolves.toMatchObject({ code: "timeout" })
    expect(shared.waitingCount).toBe(1)

    holder.release()
    await until(() => shared.waitingCount === 0 && shared.idleCount === 1)
    await expect(probe()).resolves.toEqual({ status: "ok" })
  })

  it("stops slow work on the server at the deadline and discards the connection", async () => {
    const shared = pool()
    const observer = pool()
    const started = performance.now()
    await expect(
      createDatabaseProbe(shared, {
        deadlineMs: 300,
        statement: "SELECT pg_sleep(5)",
      })()
    ).resolves.toEqual({ status: "unavailable", code: "timeout" })
    expect(performance.now() - started).toBeLessThan(1_500)
    expect(shared.totalCount).toBe(0)
    await until(async () => {
      const { rows } = await observer.query(
        "SELECT count(*)::int AS running FROM pg_stat_activity WHERE query LIKE '%pg_sleep(5)%' AND state = 'active' AND pid <> pg_backend_pid()"
      )
      return rows[0].running === 0
    }, 1_000)
  })
})
