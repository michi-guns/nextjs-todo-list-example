import { spawn, type ChildProcess } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { Pool } from "pg"

import {
  parseEnvironmentProfile,
  type EnvironmentProfile,
  type EnvironmentVariables,
} from "../environment/core"
import {
  assertLocalResetAllowed,
  assertMigrationAllowed,
  assertSeedReplacementAllowed,
  executeAfterGuard,
  type DatabaseConnectionObservation,
  type DatabaseTargetIdentity,
  type EnvironmentGuardInput,
} from "../environment/guards"
import {
  LOCAL_POSTGRES_COMPOSE_PROJECT,
  LOCAL_POSTGRES_DATABASE,
  LOCAL_POSTGRES_ENDPOINT,
  LOCAL_POSTGRES_HOST,
  LOCAL_POSTGRES_PASSWORD,
  LOCAL_POSTGRES_PORT,
  LOCAL_POSTGRES_SERVICE,
  LOCAL_POSTGRES_URL,
} from "./constants"

export {
  LOCAL_POSTGRES_COMPOSE_PROJECT,
  LOCAL_POSTGRES_DATABASE,
  LOCAL_POSTGRES_HOST,
  LOCAL_POSTGRES_IMAGE,
  LOCAL_POSTGRES_PASSWORD,
  LOCAL_POSTGRES_PORT,
  LOCAL_POSTGRES_SERVICE,
  LOCAL_POSTGRES_URL,
} from "./constants"

export const LOCAL_POSTGRES_COMMANDS = [
  "start",
  "ready",
  "migrate",
  "seed",
  "stop",
  "reset",
  "dev",
] as const

export type LocalPostgresCommand = (typeof LOCAL_POSTGRES_COMMANDS)[number]

const READY_TIMEOUT_MS = 30_000
const READY_POLL_MS = 250

export type LocalPostgresErrorCode =
  | "invalid_command"
  | "docker_unavailable"
  | "not_ready"
  | "target_mismatch"
  | "command_failed"

export class LocalPostgresError extends Error {
  readonly code: LocalPostgresErrorCode

  constructor(code: LocalPostgresErrorCode, message: string) {
    super(message)
    this.name = "LocalPostgresError"
    this.code = code
  }
}

export interface LocalPostgresRuntime {
  upDetached(): Promise<void>
  waitReady(timeoutMs?: number): Promise<void>
  down(options?: { volumes?: boolean }): Promise<void>
  migrate(databaseUrl: string): Promise<void>
  seed(profile: EnvironmentProfile): Promise<void>
  startApp(): Promise<void>
}

export interface RunLocalPostgresOptions {
  readonly environment?: EnvironmentVariables
  readonly runtime?: Partial<LocalPostgresRuntime>
}

export function composeFilePath(): string {
  return path.join(path.dirname(fileURLToPath(import.meta.url)), "compose.yaml")
}

export function parseLocalPostgresCommand(
  argv: readonly string[]
): LocalPostgresCommand {
  const [command, ...rest] = argv
  if (rest.length > 0 || !isLocalPostgresCommand(command)) {
    throw new LocalPostgresError(
      "invalid_command",
      "Usage: pnpm local:postgres -- start|ready|migrate|seed|stop|reset, or pnpm dev:local"
    )
  }
  return command
}

function isLocalPostgresCommand(
  value: string | undefined
): value is LocalPostgresCommand {
  return (
    value !== undefined &&
    (LOCAL_POSTGRES_COMMANDS as readonly string[]).includes(value)
  )
}

export function assertProfileMatchesLocalCompose(
  profile: EnvironmentProfile
): void {
  if (
    profile.appEnv !== "local" ||
    profile.database.provider !== "local-postgres"
  ) {
    throw new LocalPostgresError(
      "target_mismatch",
      `Local Docker commands require APP_ENV=local and DATABASE_PROVIDER=local-postgres. Current profile is ${profile.appEnv}. Update .env.local to the Local Docker target ${LOCAL_POSTGRES_ENDPOINT}.`
    )
  }

  for (const url of [
    profile.database.runtimeUrl,
    profile.database.migrationUrl,
  ]) {
    const parsed = parsePostgresUrl(url)
    if (
      !isLoopback(parsed.hostname) ||
      Number(parsed.port) !== LOCAL_POSTGRES_PORT ||
      parsed.pathname !== `/${LOCAL_POSTGRES_DATABASE}`
    ) {
      throw new LocalPostgresError(
        "target_mismatch",
        `Local Docker commands require DATABASE_URL and DATABASE_URL_UNPOOLED to use ${LOCAL_POSTGRES_ENDPOINT}. Update .env.local to the documented Local Docker URL.`
      )
    }
  }
}

export function createLocalComposeGuardInput(
  profile: EnvironmentProfile,
  ownership?: "harness"
): EnvironmentGuardInput {
  const target: DatabaseTargetIdentity = {
    provider: "local-postgres",
    host: LOCAL_POSTGRES_HOST,
    port: LOCAL_POSTGRES_PORT,
    database: LOCAL_POSTGRES_DATABASE,
    ...(ownership ? { ownership } : {}),
  }
  const connection: DatabaseConnectionObservation = {
    target: {
      provider: "local-postgres",
      host: LOCAL_POSTGRES_HOST,
      port: LOCAL_POSTGRES_PORT,
      database: LOCAL_POSTGRES_DATABASE,
      ...(ownership ? { ownership } : {}),
    },
    role: "direct",
    url: profile.database.migrationUrl,
  }
  return { profile, target, connection }
}

export async function runLocalPostgresCommand(
  command: LocalPostgresCommand,
  options: RunLocalPostgresOptions = {}
): Promise<void> {
  const runtime = createRuntime(options.runtime)
  const environment = options.environment ?? process.env

  switch (command) {
    case "start":
      await runtime.upDetached()
      await runtime.waitReady()
      return
    case "ready":
      await runtime.waitReady()
      return
    case "stop":
      await runtime.down()
      return
    case "migrate": {
      const profile = parseLocalProfile(environment)
      await executeAfterGuard(
        () => assertMigrationAllowed(createLocalComposeGuardInput(profile)),
        () => runtime.migrate(profile.database.migrationUrl)
      )
      return
    }
    case "seed": {
      const profile = parseLocalProfile(environment)
      await executeAfterGuard(
        () =>
          assertSeedReplacementAllowed(createLocalComposeGuardInput(profile)),
        () => runtime.seed(profile)
      )
      return
    }
    case "reset": {
      const profile = parseLocalProfile(environment)
      await executeAfterGuard(
        () =>
          assertLocalResetAllowed(
            createLocalComposeGuardInput(profile, "harness")
          ),
        async () => {
          await runtime.down({ volumes: true })
          await runtime.upDetached()
          await runtime.waitReady()
        }
      )
      return
    }
    case "dev": {
      const profile = parseLocalProfile(environment)
      await runtime.upDetached()
      await runtime.waitReady()
      await executeAfterGuard(
        () => assertMigrationAllowed(createLocalComposeGuardInput(profile)),
        () => runtime.migrate(profile.database.migrationUrl)
      )
      await runtime.startApp()
    }
  }
}

function parseLocalProfile(
  environment: EnvironmentVariables
): EnvironmentProfile {
  const profile = parseEnvironmentProfile(environment)
  assertProfileMatchesLocalCompose(profile)
  return profile
}

function createRuntime(
  overrides: Partial<LocalPostgresRuntime> = {}
): LocalPostgresRuntime {
  const defaults = createDefaultRuntime()
  return {
    upDetached: overrides.upDetached ?? defaults.upDetached,
    waitReady: overrides.waitReady ?? defaults.waitReady,
    down: overrides.down ?? defaults.down,
    migrate: overrides.migrate ?? defaults.migrate,
    seed: overrides.seed ?? defaults.seed,
    startApp: overrides.startApp ?? defaults.startApp,
  }
}

function createDefaultRuntime(): LocalPostgresRuntime {
  return {
    async upDetached() {
      await runDockerCompose(["up", "-d", LOCAL_POSTGRES_SERVICE])
    },
    async waitReady(timeoutMs = READY_TIMEOUT_MS) {
      await waitForPostgres(timeoutMs)
    },
    async down(options = {}) {
      const args = ["down"]
      if (options.volumes) args.push("--volumes")
      await runDockerCompose(args)
    },
    async migrate(databaseUrl) {
      await runProcess(
        "pnpm",
        ["exec", "drizzle-kit", "migrate", "--config", "drizzle.config.ts"],
        {
          DATABASE_URL: databaseUrl,
          DATABASE_URL_UNPOOLED: databaseUrl,
        }
      )
    },
    async seed(profile) {
      const { seedLocalPostgres } = await import("./seed")
      await seedLocalPostgres(profile)
    },
    async startApp() {
      await runProcess("pnpm", ["dev"], undefined, { inheritStdio: true })
    },
  }
}

async function waitForPostgres(timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() <= deadline) {
    const pool = new Pool({
      connectionString: LOCAL_POSTGRES_URL,
      connectionTimeoutMillis: 2_000,
      idleTimeoutMillis: 1_000,
    })
    try {
      await pool.query("SELECT 1")
      return
    } catch {
      // Keep polling until the Compose published port accepts connections.
    } finally {
      await pool.end().catch(() => undefined)
    }

    const remainingMs = deadline - Date.now()
    if (remainingMs <= 0) break
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(READY_POLL_MS, remainingMs))
    )
  }

  throw new LocalPostgresError(
    "not_ready",
    `Timed out waiting for Local Docker PostgreSQL at ${LOCAL_POSTGRES_ENDPOINT}. Start Docker Desktop, then retry pnpm local:postgres -- start.`
  )
}

async function runDockerCompose(args: string[]): Promise<void> {
  try {
    await runProcess("docker", [
      "compose",
      "-f",
      composeFilePath(),
      "-p",
      LOCAL_POSTGRES_COMPOSE_PROJECT,
      ...args,
    ])
  } catch (error) {
    if (
      error instanceof LocalPostgresError &&
      error.code === "docker_unavailable"
    ) {
      throw new LocalPostgresError(
        "docker_unavailable",
        "Docker is required for Local PostgreSQL. Start Docker Desktop and retry."
      )
    }
    throw error
  }
}

function quoteForCmd(value: string): string {
  if (!/[\s"]/.test(value)) return value
  return `"${value.replaceAll('"', '\\"')}"`
}

function resolveCommand(
  command: string,
  args: string[]
): { command: string; args: string[] } {
  if (process.platform !== "win32" || command === "docker") {
    return { command, args }
  }

  return {
    command: process.env.ComSpec || "cmd.exe",
    args: ["/d", "/s", "/c", [command, ...args].map(quoteForCmd).join(" ")],
  }
}

async function runProcess(
  command: string,
  args: string[],
  extraEnv?: Record<string, string>,
  options: { inheritStdio?: boolean } = {}
): Promise<void> {
  const env = extraEnv ? { ...process.env, ...extraEnv } : process.env
  const resolved = resolveCommand(command, args)

  await new Promise<void>((resolve, reject) => {
    const child: ChildProcess = spawn(resolved.command, resolved.args, {
      cwd: process.cwd(),
      env,
      stdio: options.inheritStdio ? "inherit" : ["ignore", "pipe", "pipe"],
      windowsHide: true,
    })
    let stderr = ""
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk)
    })
    child.on("error", (error) => {
      const code = (error as NodeJS.ErrnoException).code
      if (code === "ENOENT") {
        reject(
          new LocalPostgresError(
            "docker_unavailable",
            `${command} was not found on PATH`
          )
        )
        return
      }
      reject(error)
    })
    child.on("close", (exitCode) => {
      if (exitCode === 0) {
        resolve()
        return
      }
      reject(
        new LocalPostgresError(
          "command_failed",
          redactSecrets(
            stderr.trim() ||
              `${command} ${args.join(" ")} failed with exit ${exitCode}`
          )
        )
      )
    })
  })
}

function parsePostgresUrl(url: string): URL {
  try {
    return new URL(url)
  } catch {
    throw new LocalPostgresError(
      "target_mismatch",
      `Local Docker commands require a PostgreSQL URL at ${LOCAL_POSTGRES_ENDPOINT}.`
    )
  }
}

function isLoopback(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase()
  return host === "localhost" || host === "127.0.0.1" || host === "::1"
}

function redactSecrets(value: string): string {
  return value
    .replaceAll(LOCAL_POSTGRES_PASSWORD, "***")
    .replaceAll(
      LOCAL_POSTGRES_URL,
      `postgresql://***@${LOCAL_POSTGRES_ENDPOINT}`
    )
}
