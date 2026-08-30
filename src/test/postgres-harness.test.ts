import { describe, expect, it, vi } from "vitest"

import {
  assertLocalPostgresUrl,
  splitMigrationStatements,
  startPostgresHarness,
  stopPostgresHarness,
} from "./postgres-harness"

describe("PostgreSQL integration harness", () => {
  it("accepts loopback PostgreSQL URLs and refuses external targets", () => {
    expect(
      assertLocalPostgresUrl("postgresql://postgres@127.0.0.1:5432/test")
    ).toBe("postgresql://postgres@127.0.0.1:5432/test")
    expect(
      assertLocalPostgresUrl("postgres://postgres@[::1]:5432/test")
    ).toContain("[::1]")

    for (const databaseUrl of [
      undefined,
      "",
      "postgresql://postgres@database.example/test",
      "mysql://root@127.0.0.1/test",
      "not-a-url",
    ]) {
      expect(() => assertLocalPostgresUrl(databaseUrl)).toThrow(
        /local PostgreSQL/i
      )
    }
  })

  it("splits only Drizzle statement breakpoints into executable statements", () => {
    expect(
      splitMigrationStatements(
        " CREATE TABLE first (id integer);\n--> statement-breakpoint\n\n CREATE TABLE second (id integer); "
      )
    ).toEqual([
      "CREATE TABLE first (id integer);",
      "CREATE TABLE second (id integer);",
    ])
  })

  it("stops a partially started container when migration setup fails", async () => {
    const stop = vi.fn().mockResolvedValue(undefined)
    const container = {
      getConnectionUri: () => "postgresql://postgres@127.0.0.1:5432/todo_test",
      stop,
    }

    await expect(
      startPostgresHarness({
        startContainer: async () => container,
        applyMigrations: async () => {
          throw new Error("migration failed")
        },
      })
    ).rejects.toThrow(/Testcontainer setup failed/i)
    expect(stop).toHaveBeenCalledOnce()
  })

  it("reports container startup failures without silently skipping the suite", async () => {
    await expect(
      startPostgresHarness({
        startContainer: async () => {
          throw new Error("Docker daemon unavailable")
        },
      })
    ).rejects.toThrow(/Testcontainer setup failed/i)
  })

  it("stops a harness-owned container during teardown", async () => {
    const stop = vi.fn().mockResolvedValue(undefined)
    await stopPostgresHarness({
      container: {
        getConnectionUri: () =>
          "postgresql://postgres@127.0.0.1:5432/todo_test",
        stop,
      },
      databaseUrl: "postgresql://postgres@127.0.0.1:5432/todo_test",
    })

    expect(stop).toHaveBeenCalledOnce()
  })
})
