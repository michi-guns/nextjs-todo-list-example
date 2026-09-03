import { describe, expect, it, vi } from "vitest"

import {
  NEON_DEVELOPMENT_BRANCH,
  NEON_DEVELOPMENT_PROJECT_ID,
} from "./constants"
import {
  NeonDevelopmentError,
  parseNeonDevelopmentCommand,
  runNeonDevelopmentCommand,
  type NeonDevelopmentRuntime,
  type ObservedNeonBranch,
} from "./core"

const directHost = "ep-development.us-east-2.aws.neon.tech"
const pooledHost = "ep-development-pooler.us-east-2.aws.neon.tech"
const database = "neondb"
const directUrl = `postgresql://migration:migration-password@${directHost}:5432/${database}?sslmode=require`
const pooledUrl = `postgresql://runtime:runtime-password@${pooledHost}:5432/${database}?sslmode=require`

function developmentEnvironment(): Record<string, string | undefined> {
  return {
    APP_ENV: "development",
    NODE_ENV: "development",
    BETTER_AUTH_URL: "http://localhost:3000",
    BETTER_AUTH_SECRET: "development-auth-secret-for-tests",
    DATABASE_PROVIDER: "neon",
    DATABASE_PROJECT_ID: NEON_DEVELOPMENT_PROJECT_ID,
    DATABASE_BRANCH: NEON_DEVELOPMENT_BRANCH,
    DATABASE_URL: pooledUrl,
    DATABASE_URL_UNPOOLED: directUrl,
    NEXT_PUBLIC_SANITY_PROJECT_ID: "project-id",
    NEXT_PUBLIC_SANITY_DATASET: "production",
    NEXT_PUBLIC_SANITY_API_VERSION: "2026-08-27",
    SANITY_WRITE_POLICY: "read-only",
    APP_MAIL_TRANSPORT: "local-mailbox",
    BETTER_AUTH_LOCAL_MAILBOX: "true",
    DEPLOYMENT_OWNER: "github",
    SECRET_NAMESPACE: "development",
  }
}

function observedBranch(overrides: Partial<ObservedNeonBranch> = {}) {
  return {
    projectId: NEON_DEVELOPMENT_PROJECT_ID,
    branch: NEON_DEVELOPMENT_BRANCH,
    branchId: "br-development-test",
    isDefault: false,
    expiresAt: null,
    directHost,
    pooledHost,
    database,
    port: 5432,
    ...overrides,
  }
}

function unusedRuntime(): NeonDevelopmentRuntime {
  return {
    observeBranch: vi.fn().mockResolvedValue(observedBranch()),
    createBranch: vi.fn(),
    migrate: vi.fn(),
    seedOrdinary: vi.fn(),
    seedBehavior: vi.fn(),
    runPerformanceSeed: vi.fn(),
  }
}

describe("Neon Development commands", () => {
  it("parses inspect, provision, migrate, and seed modes and rejects extras", () => {
    expect(parseNeonDevelopmentCommand(["inspect"])).toEqual({
      command: "inspect",
    })
    expect(parseNeonDevelopmentCommand(["provision"])).toEqual({
      command: "provision",
    })
    expect(parseNeonDevelopmentCommand(["migrate"])).toEqual({
      command: "migrate",
    })
    expect(parseNeonDevelopmentCommand(["seed"])).toEqual({
      command: "seed",
      seedMode: "ordinary",
    })
    expect(parseNeonDevelopmentCommand(["seed", "--mode", "behavior"])).toEqual(
      {
        command: "seed",
        seedMode: "behavior",
      }
    )
    expect(
      parseNeonDevelopmentCommand(["seed", "--mode", "performance"])
    ).toEqual({
      command: "seed",
      seedMode: "performance",
    })
    expect(() => parseNeonDevelopmentCommand(["reset"])).toThrow(
      NeonDevelopmentError
    )
    expect(() => parseNeonDevelopmentCommand(["migrate", "--force"])).toThrow(
      NeonDevelopmentError
    )
  })

  it("refuses inspect, migrate, and seed when the observed project does not match", async () => {
    const runtime = unusedRuntime()
    runtime.observeBranch = vi
      .fn()
      .mockResolvedValue(observedBranch({ projectId: "other-project" }))

    for (const argv of [["inspect"], ["migrate"], ["seed"]] as const) {
      await expect(
        runNeonDevelopmentCommand(parseNeonDevelopmentCommand(argv), {
          environment: developmentEnvironment(),
          runtime,
        })
      ).rejects.toMatchObject({ code: "target_mismatch" })
    }

    expect(runtime.migrate).not.toHaveBeenCalled()
    expect(runtime.seedOrdinary).not.toHaveBeenCalled()
    expect(runtime.createBranch).not.toHaveBeenCalled()
  })

  it("refuses a default or main branch before mutation", async () => {
    const runtime = unusedRuntime()
    runtime.observeBranch = vi.fn().mockResolvedValue(
      observedBranch({
        branch: "main",
        isDefault: true,
        directHost: "ep-main.us-east-2.aws.neon.tech",
        pooledHost: "ep-main-pooler.us-east-2.aws.neon.tech",
      })
    )
    const environment = developmentEnvironment()
    environment.DATABASE_BRANCH = "main"
    environment.DATABASE_URL =
      "postgresql://runtime:runtime-password@ep-main-pooler.us-east-2.aws.neon.tech:5432/neondb?sslmode=require"
    environment.DATABASE_URL_UNPOOLED =
      "postgresql://migration:migration-password@ep-main.us-east-2.aws.neon.tech:5432/neondb?sslmode=require"

    await expect(
      runNeonDevelopmentCommand(parseNeonDevelopmentCommand(["migrate"]), {
        environment,
        runtime,
      })
    ).rejects.toMatchObject({ code: "database_target_mismatch" })
    expect(runtime.migrate).not.toHaveBeenCalled()
  })

  it("refuses an expiring development branch before provision or migrate", async () => {
    const runtime = unusedRuntime()
    runtime.observeBranch = vi
      .fn()
      .mockResolvedValue(observedBranch({ expiresAt: "2026-12-31T00:00:00Z" }))

    for (const command of ["provision", "migrate"] as const) {
      await expect(
        runNeonDevelopmentCommand(parseNeonDevelopmentCommand([command]), {
          environment: developmentEnvironment(),
          runtime,
        })
      ).rejects.toMatchObject({ code: "target_mismatch" })
    }

    expect(runtime.createBranch).not.toHaveBeenCalled()
    expect(runtime.migrate).not.toHaveBeenCalled()
  })

  it("creates the durable branch only when it is missing", async () => {
    const runtime = unusedRuntime()
    runtime.observeBranch = vi.fn().mockResolvedValue(null)
    runtime.createBranch = vi.fn().mockResolvedValue(observedBranch())

    await runNeonDevelopmentCommand(
      parseNeonDevelopmentCommand(["provision"]),
      {
        environment: {},
        runtime,
      }
    )

    expect(runtime.createBranch).toHaveBeenCalledOnce()
  })

  it("does not recreate an existing durable development branch", async () => {
    const runtime = unusedRuntime()

    await runNeonDevelopmentCommand(
      parseNeonDevelopmentCommand(["provision"]),
      {
        environment: developmentEnvironment(),
        runtime,
      }
    )

    expect(runtime.createBranch).not.toHaveBeenCalled()
    expect(runtime.migrate).not.toHaveBeenCalled()
  })

  it("migrates through the direct URL only after the identity matches", async () => {
    const runtime = unusedRuntime()

    await runNeonDevelopmentCommand(parseNeonDevelopmentCommand(["migrate"]), {
      environment: developmentEnvironment(),
      runtime,
    })

    expect(runtime.migrate).toHaveBeenCalledWith(directUrl)
    expect(runtime.seedOrdinary).not.toHaveBeenCalled()
  })

  it("does not migrate a pooled URL even when the profile is otherwise valid", async () => {
    const runtime = unusedRuntime()
    const environment = developmentEnvironment()
    environment.DATABASE_URL_UNPOOLED = pooledUrl

    await expect(
      runNeonDevelopmentCommand(parseNeonDevelopmentCommand(["migrate"]), {
        environment,
        runtime,
      })
    ).rejects.toMatchObject({ code: "database_role_mismatch" })
    expect(runtime.migrate).not.toHaveBeenCalled()
  })

  it("seeds ordinary and behavior modes without calling performance", async () => {
    const runtime = unusedRuntime()

    await runNeonDevelopmentCommand(parseNeonDevelopmentCommand(["seed"]), {
      environment: developmentEnvironment(),
      runtime,
    })
    await runNeonDevelopmentCommand(
      parseNeonDevelopmentCommand(["seed", "--mode", "behavior"]),
      { environment: developmentEnvironment(), runtime }
    )

    expect(runtime.seedOrdinary).toHaveBeenCalledOnce()
    expect(runtime.seedBehavior).toHaveBeenCalledOnce()
    expect(runtime.runPerformanceSeed).not.toHaveBeenCalled()
  })

  it("runs the existing performance seed only after identity checks", async () => {
    const runtime = unusedRuntime()

    await runNeonDevelopmentCommand(
      parseNeonDevelopmentCommand(["seed", "--mode", "performance"]),
      { environment: developmentEnvironment(), runtime }
    )

    expect(runtime.runPerformanceSeed).toHaveBeenCalledOnce()
    expect(runtime.seedOrdinary).not.toHaveBeenCalled()
  })

  it("prints redacted inspect output without secrets or connection strings", async () => {
    const runtime = unusedRuntime()
    const lines: string[] = []
    const write = (line: string) => {
      lines.push(line)
    }

    await runNeonDevelopmentCommand(parseNeonDevelopmentCommand(["inspect"]), {
      environment: developmentEnvironment(),
      runtime,
      write,
    })

    const output = lines.join("\n")
    expect(output).toContain(`projectId=${NEON_DEVELOPMENT_PROJECT_ID}`)
    expect(output).toContain(`branch=${NEON_DEVELOPMENT_BRANCH}`)
    expect(output).toContain("expiresAt=none")
    expect(output).not.toContain("postgresql://")
    expect(output).not.toContain("migration-password")
    expect(output).not.toContain("runtime-password")
    expect(output).not.toContain("development-auth-secret-for-tests")
  })
})
