import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it, vi } from "vitest"

import {
  LOCAL_POSTGRES_IMAGE,
  LOCAL_POSTGRES_PASSWORD,
  LOCAL_POSTGRES_URL,
  LocalPostgresError,
  composeFilePath,
  parseLocalPostgresCommand,
  runLocalPostgresCommand,
} from "./core"

const localDatabaseUrl = LOCAL_POSTGRES_URL

function localEnvironment(): Record<string, string | undefined> {
  return {
    APP_ENV: "local",
    NODE_ENV: "development",
    BETTER_AUTH_URL: "http://127.0.0.1:3000",
    BETTER_AUTH_SECRET: "local-auth-secret-for-tests",
    DATABASE_PROVIDER: "local-postgres",
    DATABASE_URL: localDatabaseUrl,
    DATABASE_URL_UNPOOLED: localDatabaseUrl,
    NEXT_PUBLIC_SANITY_PROJECT_ID: "project-id",
    NEXT_PUBLIC_SANITY_DATASET: "production",
    NEXT_PUBLIC_SANITY_API_VERSION: "2026-08-27",
    SANITY_WRITE_POLICY: "local-recovery",
    SANITY_REVALIDATE_SECRET: "sanity-webhook-secret",
    SANITY_MANUAL_RECOVERY_SECRET: "sanity-recovery-secret",
    APP_MAIL_TRANSPORT: "local-mailbox",
    BETTER_AUTH_LOCAL_MAILBOX: "true",
    DEPLOYMENT_OWNER: "local",
    SECRET_NAMESPACE: "local",
  }
}

function neonEnvironment(): Record<string, string | undefined> {
  return {
    APP_ENV: "development",
    NODE_ENV: "development",
    BETTER_AUTH_URL: "http://localhost:3000",
    BETTER_AUTH_SECRET: "development-auth-secret-for-tests",
    DATABASE_PROVIDER: "neon",
    DATABASE_PROJECT_ID: "project-id",
    DATABASE_BRANCH: "development",
    DATABASE_URL:
      "postgresql://runtime:runtime-password@ep-app-pooler.neon.tech:5432/todo?sslmode=require",
    DATABASE_URL_UNPOOLED:
      "postgresql://migration:migration-password@ep-development.neon.tech:5432/todo?sslmode=require",
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

function unusedRuntime() {
  return {
    upDetached: vi.fn(),
    waitReady: vi.fn(),
    down: vi.fn(),
    migrate: vi.fn(),
    seed: vi.fn(),
    startApp: vi.fn(),
  }
}

describe("local Docker PostgreSQL commands", () => {
  it("parses the documented lifecycle commands and rejects extras", () => {
    expect(parseLocalPostgresCommand(["start"])).toBe("start")
    expect(parseLocalPostgresCommand(["dev"])).toBe("dev")
    expect(() => parseLocalPostgresCommand(["start", "--force"])).toThrow(
      LocalPostgresError
    )
    expect(() => parseLocalPostgresCommand(["deploy"])).toThrow(
      LocalPostgresError
    )
  })

  it("binds Postgres 18 to loopback in the committed Compose file", async () => {
    const compose = await readFile(
      path.join(path.dirname(fileURLToPath(import.meta.url)), "compose.yaml"),
      "utf8"
    )

    expect(composeFilePath()).toContain("compose.yaml")
    expect(compose).toContain(LOCAL_POSTGRES_IMAGE)
    expect(compose).toContain("127.0.0.1:5432:5432")
    expect(compose).toContain("/var/lib/postgresql")
    expect(compose).not.toContain("0.0.0.0")
  })

  it("starts the Compose database without reading a remote profile", async () => {
    const runtime = unusedRuntime()

    await runLocalPostgresCommand("start", {
      environment: neonEnvironment(),
      runtime,
    })

    expect(runtime.upDetached).toHaveBeenCalledOnce()
    expect(runtime.waitReady).toHaveBeenCalledOnce()
    expect(runtime.migrate).not.toHaveBeenCalled()
    expect(runtime.down).not.toHaveBeenCalled()
  })

  it("refuses migrate, seed, reset, and dev against a Neon Development profile", async () => {
    for (const command of ["migrate", "seed", "reset", "dev"] as const) {
      const runtime = unusedRuntime()

      await expect(
        runLocalPostgresCommand(command, {
          environment: neonEnvironment(),
          runtime,
        })
      ).rejects.toMatchObject({ code: "target_mismatch" })

      expect(runtime.migrate).not.toHaveBeenCalled()
      expect(runtime.seed).not.toHaveBeenCalled()
      expect(runtime.down).not.toHaveBeenCalled()
      expect(runtime.startApp).not.toHaveBeenCalled()
    }
  })

  it("refuses migrate when the Local URL is not the Compose endpoint", async () => {
    const runtime = unusedRuntime()
    const environment = localEnvironment()
    environment.DATABASE_URL = "postgresql://todo:todo@127.0.0.1:65432/todo"
    environment.DATABASE_URL_UNPOOLED = environment.DATABASE_URL

    await expect(
      runLocalPostgresCommand("migrate", { environment, runtime })
    ).rejects.toMatchObject({ code: "target_mismatch" })
    expect(runtime.migrate).not.toHaveBeenCalled()
  })

  it("does not destroy volumes when reset is refused", async () => {
    const runtime = unusedRuntime()

    await expect(
      runLocalPostgresCommand("reset", {
        environment: neonEnvironment(),
        runtime,
      })
    ).rejects.toMatchObject({ code: "target_mismatch" })
    expect(runtime.down).not.toHaveBeenCalled()
  })

  it("resets only after the Local Compose identity is proven, then recreates the container", async () => {
    const runtime = unusedRuntime()
    const order: string[] = []
    runtime.down.mockImplementation(async () => {
      order.push("down")
    })
    runtime.upDetached.mockImplementation(async () => {
      order.push("up")
    })
    runtime.waitReady.mockImplementation(async () => {
      order.push("ready")
    })

    await runLocalPostgresCommand("reset", {
      environment: localEnvironment(),
      runtime,
    })

    expect(runtime.down).toHaveBeenCalledWith({ volumes: true })
    expect(order).toEqual(["down", "up", "ready"])
    expect(runtime.migrate).not.toHaveBeenCalled()
  })

  it("leaves the container running and does not start the app when migrate fails", async () => {
    const runtime = unusedRuntime()
    runtime.migrate.mockRejectedValue(new Error("migration failed"))

    await expect(
      runLocalPostgresCommand("dev", {
        environment: localEnvironment(),
        runtime,
      })
    ).rejects.toThrow(/migration failed/)

    expect(runtime.upDetached).toHaveBeenCalledOnce()
    expect(runtime.waitReady).toHaveBeenCalledOnce()
    expect(runtime.migrate).toHaveBeenCalledOnce()
    expect(runtime.seed).not.toHaveBeenCalled()
    expect(runtime.startApp).not.toHaveBeenCalled()
    expect(runtime.down).not.toHaveBeenCalled()
  })

  it("does not seed when migrate fails", async () => {
    const runtime = unusedRuntime()
    runtime.migrate.mockRejectedValue(new Error("migration failed"))

    await expect(
      runLocalPostgresCommand("migrate", {
        environment: localEnvironment(),
        runtime,
      })
    ).rejects.toThrow(/migration failed/)
    expect(runtime.seed).not.toHaveBeenCalled()
  })

  it("stops the Compose project without deleting the volume", async () => {
    const runtime = unusedRuntime()

    await runLocalPostgresCommand("stop", {
      environment: localEnvironment(),
      runtime,
    })

    expect(runtime.down).toHaveBeenCalledWith()
    expect(runtime.down).not.toHaveBeenCalledWith({ volumes: true })
  })

  it("starts the app only after start, ready, and migrate succeed", async () => {
    const runtime = unusedRuntime()
    const order: string[] = []
    runtime.upDetached.mockImplementation(async () => {
      order.push("up")
    })
    runtime.waitReady.mockImplementation(async () => {
      order.push("ready")
    })
    runtime.migrate.mockImplementation(async () => {
      order.push("migrate")
    })
    runtime.startApp.mockImplementation(async () => {
      order.push("app")
    })

    await runLocalPostgresCommand("dev", {
      environment: localEnvironment(),
      runtime,
    })

    expect(order).toEqual(["up", "ready", "migrate", "app"])
  })

  it("migrates the matching Local Compose URL and then seeds when asked", async () => {
    const runtime = unusedRuntime()

    await runLocalPostgresCommand("migrate", {
      environment: localEnvironment(),
      runtime,
    })
    await runLocalPostgresCommand("seed", {
      environment: localEnvironment(),
      runtime,
    })

    expect(runtime.migrate).toHaveBeenCalledWith(LOCAL_POSTGRES_URL)
    expect(runtime.seed).toHaveBeenCalledOnce()
  })

  it("keeps the documented local password out of command errors", async () => {
    const runtime = unusedRuntime()
    const environment = localEnvironment()
    environment.DATABASE_URL = "postgresql://todo:todo@127.0.0.1:5432/other"
    environment.DATABASE_URL_UNPOOLED = environment.DATABASE_URL

    await expect(
      runLocalPostgresCommand("migrate", { environment, runtime })
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(LocalPostgresError)
      expect(String(error)).not.toContain(LOCAL_POSTGRES_PASSWORD)
      expect(String(error)).not.toContain(LOCAL_POSTGRES_URL)
      return true
    })
  })
})

describe("local Docker PostgreSQL seed plan", () => {
  it("uses a synthetic local user distinct from Playwright fixtures", async () => {
    const { LOCAL_SEED_USER } = await import("./constants")
    const { PLAYWRIGHT_USERS } = await import("../playwright-local/seed")

    expect(LOCAL_SEED_USER.email).toBe("local-dev@example.test")
    expect(LOCAL_SEED_USER.password.length).toBeGreaterThanOrEqual(8)
    expect(
      Object.values(PLAYWRIGHT_USERS).some(
        (user) => user.email === LOCAL_SEED_USER.email
      )
    ).toBe(false)
  })
})
