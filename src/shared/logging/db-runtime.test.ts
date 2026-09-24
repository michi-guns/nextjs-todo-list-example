import { afterEach, expect, it, vi } from "vitest"

afterEach(() => vi.unstubAllEnvs())

it("TST-DIAGNOSTICS-001 composes one logging runtime per process across bundle copies", async () => {
  vi.stubEnv(
    "DATABASE_URL",
    "postgresql://synthetic:synthetic@127.0.0.1:1/todo"
  )
  const first = await import("../../../db/db")
  vi.resetModules()
  const second = await import("../../../db/db")
  expect(second.logging).toBe(first.logging)
  expect(second.logging.diagnostics).toBe(first.logging.diagnostics)
  await Promise.allSettled([first.pool.end(), second.pool.end()])
})
