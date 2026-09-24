import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const createDatabasePool = vi.fn()
const betterAuth = vi.fn()
const createClient = vi.fn()
vi.mock("server-only", () => ({}))
vi.mock("../../../db/pool", () => ({
  createDatabasePool,
  reportIdlePoolError: vi.fn(),
}))
vi.mock("better-auth", () => ({ betterAuth }))
vi.mock("next-sanity", () => ({ createClient }))

const SECRET = "composition-secret-sentinel"
const PASSWORD = "composition-password-sentinel"

beforeEach(() => {
  vi.resetModules()
  // A hosted deployment whose profile is missing, plus a direct Neon URL.
  vi.stubEnv("VERCEL", "1")
  vi.stubEnv("APP_ENV", "")
  vi.stubEnv("BETTER_AUTH_SECRET", SECRET)
  vi.stubEnv(
    "DATABASE_URL",
    `postgresql://app:${PASSWORD}@ep-quiet-sun-123456.eu-central-1.aws.neon.tech/todo`
  )
  vi.stubEnv("NEXT_PUBLIC_SANITY_PROJECT_ID", "project-id")
  vi.stubEnv("NEXT_PUBLIC_SANITY_DATASET", "production")
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

async function refusal(load: () => Promise<unknown>) {
  const error = await load().then(
    () => undefined,
    (reason: unknown) => reason as Error
  )
  expect(error?.name).toBe("EnvironmentProfileError")
  expect(JSON.stringify([error?.message, error?.stack])).not.toMatch(
    new RegExp(`${SECRET}|${PASSWORD}|neon\\.tech`)
  )
}

describe("TST-RUNTIME-001 refusal before client construction", () => {
  it("creates no database pool for an unsafe runtime profile", async () => {
    await refusal(() => import("../../../db/db"))
    expect(createDatabasePool).not.toHaveBeenCalled()
  })

  it("creates no auth client for an unsafe runtime profile", async () => {
    await refusal(() => import("../../../lib/auth"))
    expect(betterAuth).not.toHaveBeenCalled()
  })

  it("creates no CMS client for an unsafe runtime profile", async () => {
    await refusal(() => import("../../sanity/client"))
    expect(createClient).not.toHaveBeenCalled()
  })

  it("constructs clients once the profile is coherent", async () => {
    vi.stubEnv("VERCEL", "")
    await import("../../sanity/client")
    expect(createClient).toHaveBeenCalledOnce()
  })
})
