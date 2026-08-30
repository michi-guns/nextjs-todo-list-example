import { spawn, type ChildProcess } from "node:child_process"
import { mkdtemp } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { clearMagicLinkMailbox } from "../src/modules/auth/infrastructure/local-mailbox"
import {
  startPostgresHarness,
  stopPostgresHarness,
  type PostgresHarness,
} from "../src/test/postgres-harness"
import {
  assertPortAvailable,
  createPlaywrightRuntimeEnvironment,
  PLAYWRIGHT_BASE_URL,
  PLAYWRIGHT_SERVER_HOST,
  PLAYWRIGHT_SERVER_PORT,
  runCleanupSteps,
  waitForServerReady,
} from "../src/test/playwright-lifecycle"

const RUNTIME_ENVIRONMENT_KEYS = [
  "NODE_ENV",
  "DATABASE_URL",
  "BETTER_AUTH_URL",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_LOCAL_MAILBOX",
  "BETTER_AUTH_MAILBOX_DIR",
  "PLAYWRIGHT_E2E",
] as const

type RuntimeEnvironmentKey = (typeof RUNTIME_ENVIRONMENT_KEYS)[number]

function rememberEnvironment(): Record<
  RuntimeEnvironmentKey,
  string | undefined
> {
  return Object.fromEntries(
    RUNTIME_ENVIRONMENT_KEYS.map((key) => [key, process.env[key]])
  ) as Record<RuntimeEnvironmentKey, string | undefined>
}

function restoreEnvironment(
  original: Record<RuntimeEnvironmentKey, string | undefined>
) {
  const mutableEnvironment = process.env as Record<string, string | undefined>
  for (const key of RUNTIME_ENVIRONMENT_KEYS) {
    const value = original[key]
    if (value === undefined) delete mutableEnvironment[key]
    else mutableEnvironment[key] = value
  }
}

function startNextServer(): ChildProcess & { readonly output: string[] } {
  const isWindows = process.platform === "win32"
  const command = isWindows ? process.env.ComSpec || "cmd.exe" : "pnpm"
  const serverArguments = isWindows
    ? [
        "/d",
        "/s",
        "/c",
        `pnpm exec next dev --hostname ${PLAYWRIGHT_SERVER_HOST} --port ${PLAYWRIGHT_SERVER_PORT}`,
      ]
    : [
        "exec",
        "next",
        "dev",
        "--hostname",
        PLAYWRIGHT_SERVER_HOST,
        "--port",
        String(PLAYWRIGHT_SERVER_PORT),
      ]
  const output: string[] = []
  const server = spawn(command, serverArguments, {
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: "development" },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  }) as ChildProcess & { readonly output: string[] }

  Object.defineProperty(server, "output", {
    configurable: false,
    enumerable: false,
    value: output,
    writable: false,
  })
  const capture = (chunk: Buffer) => {
    output.push(chunk.toString())
    if (output.join("").length > 8_000) output.splice(0, 1)
  }
  server.stdout?.on("data", capture)
  server.stderr?.on("data", capture)
  return server
}

function waitForServerFailure(
  server: ChildProcess & { readonly output: string[] }
): Promise<never> {
  return new Promise((_, reject) => {
    const fail = (message: string) => {
      const output = server.output.join("").trim()
      reject(new Error(`${message}${output ? `\n${output}` : ""}`))
    }

    server.once("error", (error) =>
      fail(`Next server failed to start: ${error.message}`)
    )
    server.once("exit", (code, signal) => {
      if (code !== null && code !== 0) {
        fail(
          `Next server exited before readiness (code ${code}, signal ${signal ?? "none"})`
        )
      } else if (code === 0) {
        fail("Next server exited before readiness")
      }
    })
  })
}

async function stopNextServer(server: ChildProcess | undefined): Promise<void> {
  if (!server || server.exitCode !== null) return

  await new Promise<void>((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      resolve()
    }

    server.once("exit", finish)
    if (!server.pid) {
      finish()
      return
    }

    if (process.platform === "win32") {
      const killer = spawn(
        "taskkill",
        ["/pid", String(server.pid), "/t", "/f"],
        { windowsHide: true, stdio: "ignore" }
      )
      killer.once("close", finish)
      killer.once("error", finish)
    } else {
      server.kill("SIGTERM")
      setTimeout(() => {
        if (!settled) server.kill("SIGKILL")
        finish()
      }, 5_000).unref()
    }
  })
}

async function cleanRuntime(
  server: ChildProcess | undefined,
  mailboxDirectory: string | undefined,
  harness: PostgresHarness | undefined
) {
  await runCleanupSteps([
    { name: "Next.js server", run: () => stopNextServer(server) },
    {
      name: "Better Auth mailbox",
      run: async () => {
        if (mailboxDirectory) await clearMagicLinkMailbox()
      },
    },
    {
      name: "PostgreSQL Testcontainer",
      run: () => stopPostgresHarness(harness),
    },
  ])
}

export default async function globalSetup(): Promise<() => Promise<void>> {
  const originalEnvironment = rememberEnvironment()
  let harness: PostgresHarness | undefined
  let mailboxDirectory: string | undefined
  let server: (ChildProcess & { readonly output: string[] }) | undefined

  try {
    await assertPortAvailable(PLAYWRIGHT_SERVER_HOST, PLAYWRIGHT_SERVER_PORT)
    harness = await startPostgresHarness()
    mailboxDirectory = await mkdtemp(
      path.join(os.tmpdir(), "nextjs-todo-list-example-playwright-")
    )

    Object.assign(
      process.env,
      createPlaywrightRuntimeEnvironment(harness.databaseUrl, mailboxDirectory)
    )

    server = startNextServer()
    await Promise.race([
      waitForServerReady(PLAYWRIGHT_BASE_URL),
      waitForServerFailure(server),
    ])

    return async () => {
      try {
        await cleanRuntime(server, mailboxDirectory, harness)
      } finally {
        restoreEnvironment(originalEnvironment)
      }
    }
  } catch (error) {
    try {
      await cleanRuntime(server, mailboxDirectory, harness)
    } catch (cleanupError) {
      error = new Error("Playwright local runtime setup and cleanup failed", {
        cause: { setup: error, cleanup: cleanupError },
      })
    } finally {
      restoreEnvironment(originalEnvironment)
    }

    throw new Error("Playwright local runtime setup failed", { cause: error })
  }
}
