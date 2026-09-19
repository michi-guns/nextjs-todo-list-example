import { describe, expect, it, vi } from "vitest"
import { defaultLogPolicy } from "../../src/shared/logging/config"
import { parseLoggingCommand, runLoggingCommand } from "./core"

const connection = "postgresql://operator:private-password@127.0.0.1:5432/todo"
const environment = {
  APP_ENV: "local",
  NODE_ENV: "test",
  BETTER_AUTH_URL: "http://localhost:3000",
  BETTER_AUTH_SECRET: "local-auth-secret-for-tests",
  DATABASE_PROVIDER: "local-postgres",
  DATABASE_URL: connection,
  DATABASE_URL_UNPOOLED: connection,
  NEXT_PUBLIC_SANITY_PROJECT_ID: "test-project",
  NEXT_PUBLIC_SANITY_DATASET: "production",
  SANITY_WRITE_POLICY: "read-only",
  APP_MAIL_TRANSPORT: "local-mailbox",
  BETTER_AUTH_LOCAL_MAILBOX: "true",
  DEPLOYMENT_OWNER: "local",
  SECRET_NAMESPACE: "local",
}
const selection = [
  "--environment",
  "local",
  "--host",
  "127.0.0.1",
  "--port",
  "5432",
  "--database",
  "todo",
]
const target = {
  provider: "local-postgres" as const,
  host: "127.0.0.1",
  port: 5432,
  database: "todo",
  ownership: "developer" as const,
}
function runtime() {
  const store = {
    read: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockImplementation(async (policy: unknown) => policy),
  }
  return {
    observe: vi.fn().mockResolvedValue(target),
    readPolicy: vi
      .fn()
      .mockResolvedValue({ ...defaultLogPolicy, revision: 1, enabled: false }),
    connect: vi.fn().mockResolvedValue({ store, close: vi.fn() }),
    verifyProduction: vi.fn().mockRejectedValue(new Error("not approved")),
    store,
  }
}

describe("TST-LOGGING-002 protected settings CLI", () => {
  it("inspects persisted policy/revision without writing and emits no credentials", async () => {
    const dependencies = runtime()
    const result = await runLoggingCommand(
      parseLoggingCommand(["inspect", ...selection]),
      environment,
      dependencies
    )
    expect(result).toMatchObject({
      environment: "local",
      policy: null,
      revision: 0,
    })
    expect(dependencies.store.set).not.toHaveBeenCalled()
    expect(JSON.stringify(result)).not.toMatch(
      /private-password|postgresql|local-auth-secret/
    )
    expect(
      (await dependencies.connect.mock.results[0].value).close
    ).toHaveBeenCalledOnce()
  })

  it("publishes one validated snapshot using the expected revision", async () => {
    const dependencies = runtime()
    const result = await runLoggingCommand(
      parseLoggingCommand([
        "set",
        ...selection,
        "--file",
        "policy.json",
        "--expected-revision",
        "0",
      ]),
      environment,
      dependencies
    )
    expect(result).toMatchObject({ revision: 1, policy: { enabled: false } })
    expect(dependencies.store.set).toHaveBeenCalledExactlyOnceWith(
      { ...defaultLogPolicy, revision: 1, enabled: false },
      0
    )
  })

  it.each([
    ["inspect"],
    ["inspect", ...selection, "--api-key", "private"],
    ["inspect", ...selection, "--environment", "local"],
    ["set", ...selection, "--file", "p.json", "--expected-revision", "-1"],
    ["inspect", ...selection, "--file", "p.json"],
  ])("refuses incomplete, duplicate and unexpected arguments", (...args) => {
    expect(() => parseLoggingCommand(args)).toThrow()
  })

  it.each([
    { APP_ENV: "development" },
    {
      DATABASE_URL_UNPOOLED:
        "postgresql://private:password@remote.example/todo",
    },
    { SECRET_NAMESPACE: "production" },
  ])(
    "refuses a mismatched environment before opening storage",
    async (overrides) => {
      const dependencies = runtime()
      await expect(
        runLoggingCommand(
          parseLoggingCommand(["inspect", ...selection]),
          { ...environment, ...overrides },
          dependencies
        )
      ).rejects.toThrow()
      expect(dependencies.connect).not.toHaveBeenCalled()
    }
  )

  it("rejects wrong observed target and invalid policy before storage access", async () => {
    const dependencies = runtime()
    dependencies.observe.mockResolvedValueOnce({ ...target, database: "wrong" })
    await expect(
      runLoggingCommand(
        parseLoggingCommand(["inspect", ...selection]),
        environment,
        dependencies
      )
    ).rejects.toThrow()
    dependencies.readPolicy.mockResolvedValueOnce({ enabled: false } as never)
    await expect(
      runLoggingCommand(
        parseLoggingCommand([
          "set",
          ...selection,
          "--file",
          "p.json",
          "--expected-revision",
          "0",
        ]),
        environment,
        dependencies
      )
    ).rejects.toThrow()
    expect(dependencies.connect).not.toHaveBeenCalled()
  })

  it("preserves a stale-write refusal and closes the connection", async () => {
    const dependencies = runtime()
    dependencies.store.set.mockRejectedValueOnce(new Error("revision_conflict"))
    await expect(
      runLoggingCommand(
        parseLoggingCommand([
          "set",
          ...selection,
          "--file",
          "p.json",
          "--expected-revision",
          "0",
        ]),
        environment,
        dependencies
      )
    ).rejects.toThrow("revision_conflict")
    expect(
      (await dependencies.connect.mock.results[0].value).close
    ).toHaveBeenCalledOnce()
  })
})
