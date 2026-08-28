import { describe, expect, it } from "vitest"

import { createDatabasePool } from "../../db/pool"

describe("createDatabasePool", () => {
  it("creates a bounded pool with connection timeouts", async () => {
    const pool = createDatabasePool("postgresql://app@localhost:5432/todo_test")

    try {
      expect(pool.options.connectionString).toBe(
        "postgresql://app@localhost:5432/todo_test"
      )
      expect(pool.options.max).toBe(10)
      expect(pool.options.idleTimeoutMillis).toBe(20_000)
      expect(pool.options.connectionTimeoutMillis).toBe(10_000)
    } finally {
      await pool.end()
    }
  })

  it("rejects an empty connection string", () => {
    expect(() => createDatabasePool("   ")).toThrow(
      "DATABASE_URL is not defined"
    )
  })
})
