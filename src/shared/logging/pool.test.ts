import { expect, it, vi } from "vitest"
import { createDatabasePool } from "../../../db/pool"
import { withLogContext } from "./context"

vi.mock("server-only", () => ({}))

it("projects idle pool errors without inheriting an unrelated request or leaking driver text", async () => {
  const output = vi.spyOn(console, "error").mockImplementation(() => {})
  const pool = createDatabasePool(
    "postgresql://synthetic:synthetic@127.0.0.1:1/todo_test"
  )
  try {
    withLogContext("unrelated.request", () =>
      pool.emit(
        "error",
        Object.assign(
          new Error("postgresql://password@example.test private-sql"),
          { code: "ECONNRESET" }
        )
      )
    )
    expect(output).toHaveBeenCalledOnce()
    const line = String(output.mock.calls[0][0])
    expect(line).toContain("database.pool.idle.failed")
    expect(line).toContain("ECONNRESET")
    expect(line).not.toContain("private-sql")
    expect(line).not.toContain("unrelated.request")
  } finally {
    output.mockRestore()
    await pool.end()
  }
})
