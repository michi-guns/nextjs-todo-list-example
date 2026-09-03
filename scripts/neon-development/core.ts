import { spawn, type ChildProcess } from "node:child_process"
import { URL } from "node:url"

import {
  parseEnvironmentProfile,
  type EnvironmentProfile,
  type EnvironmentVariables,
} from "../environment/core"
import {
  assertMigrationAllowed,
  assertSeedReplacementAllowed,
  executeAfterGuard,
  type DatabaseConnectionObservation,
  type DatabaseTargetIdentity,
  type EnvironmentGuardInput,
} from "../environment/guards"
import {
  NEON_DEVELOPMENT_BRANCH,
  NEON_DEVELOPMENT_PARENT_BRANCH,
  NEON_DEVELOPMENT_PORT,
  NEON_DEVELOPMENT_PROJECT_ID,
} from "./constants"

export const NEON_DEVELOPMENT_COMMANDS = [
  "inspect",
  "provision",
  "migrate",
  "seed",
] as const

export const NEON_DEVELOPMENT_SEED_MODES = [
  "ordinary",
  "behavior",
  "performance",
] as const

export type NeonDevelopmentCommand = (typeof NEON_DEVELOPMENT_COMMANDS)[number]
export type NeonDevelopmentSeedMode =
  (typeof NEON_DEVELOPMENT_SEED_MODES)[number]

export type NeonDevelopmentErrorCode =
  "invalid_command" | "target_mismatch" | "command_failed" | "cli_unavailable"

export class NeonDevelopmentError extends Error {
  readonly code: NeonDevelopmentErrorCode

  constructor(code: NeonDevelopmentErrorCode, message: string) {
    super(message)
    this.name = "NeonDevelopmentError"
    this.code = code
  }
}

export interface ParsedNeonDevelopmentCommand {
  readonly command: NeonDevelopmentCommand
  readonly seedMode?: NeonDevelopmentSeedMode
}

export interface ObservedNeonBranch {
  readonly projectId: string
  readonly branch: string
  readonly branchId: string
  readonly isDefault: boolean
  readonly expiresAt: string | null
  readonly directHost: string
  readonly pooledHost: string
  readonly database: string
  readonly port: number
}

export interface NeonDevelopmentRuntime {
  observeBranch(): Promise<ObservedNeonBranch | null>
  createBranch(): Promise<ObservedNeonBranch>
  migrate(databaseUrl: string): Promise<void>
  seedOrdinary(profile: EnvironmentProfile): Promise<void>
  seedBehavior(profile: EnvironmentProfile): Promise<void>
  runPerformanceSeed(): Promise<void>
}

export interface RunNeonDevelopmentOptions {
  readonly environment?: EnvironmentVariables
  readonly runtime?: Partial<NeonDevelopmentRuntime>
  readonly write?: (line: string) => void
}

export function parseNeonDevelopmentCommand(
  argv: readonly string[]
): ParsedNeonDevelopmentCommand {
  const [command, ...rest] = argv
  if (!isNeonDevelopmentCommand(command)) {
    throw new NeonDevelopmentError(
      "invalid_command",
      "Usage: pnpm neon:development -- inspect|provision|migrate|seed [--mode ordinary|behavior|performance]"
    )
  }

  if (command !== "seed") {
    if (rest.length > 0) {
      throw new NeonDevelopmentError(
        "invalid_command",
        "Usage: pnpm neon:development -- inspect|provision|migrate|seed [--mode ordinary|behavior|performance]"
      )
    }
    return { command }
  }

  if (rest.length === 0) {
    return { command, seedMode: "ordinary" }
  }

  if (rest.length === 2 && rest[0] === "--mode" && isSeedMode(rest[1])) {
    return { command, seedMode: rest[1] }
  }

  throw new NeonDevelopmentError(
    "invalid_command",
    "Usage: pnpm neon:development -- seed [--mode ordinary|behavior|performance]"
  )
}

export async function runNeonDevelopmentCommand(
  parsed: ParsedNeonDevelopmentCommand,
  options: RunNeonDevelopmentOptions = {}
): Promise<void> {
  const runtime = createRuntime(options.runtime)
  const environment = options.environment ?? process.env
  const write = options.write ?? ((line: string) => console.log(line))

  switch (parsed.command) {
    case "inspect": {
      const profile = parseDevelopmentProfile(environment)
      const observed = await requireObservedBranch(runtime)
      assertDurableDevelopmentTarget(profile, observed)
      write(formatInspection(profile, observed))
      return
    }
    case "provision": {
      const existing = await runtime.observeBranch()
      if (existing) {
        assertDurableObservedIdentity(existing)
        return
      }
      const created = await runtime.createBranch()
      assertDurableObservedIdentity(created)
      return
    }
    case "migrate": {
      const profile = parseDevelopmentProfile(environment)
      const observed = await requireObservedBranch(runtime)
      const input = createDevelopmentGuardInput(profile, observed)
      await executeAfterGuard(
        () => assertMigrationAllowed(input),
        () => runtime.migrate(profile.database.migrationUrl)
      )
      return
    }
    case "seed": {
      const profile = parseDevelopmentProfile(environment)
      const observed = await requireObservedBranch(runtime)
      const input = createDevelopmentGuardInput(profile, observed)
      const mode = parsed.seedMode ?? "ordinary"
      await executeAfterGuard(
        () => assertSeedReplacementAllowed(input),
        async () => {
          if (mode === "ordinary") await runtime.seedOrdinary(profile)
          else if (mode === "behavior") await runtime.seedBehavior(profile)
          else await runtime.runPerformanceSeed()
        }
      )
    }
  }
}

function isNeonDevelopmentCommand(
  value: string | undefined
): value is NeonDevelopmentCommand {
  return (
    value !== undefined &&
    (NEON_DEVELOPMENT_COMMANDS as readonly string[]).includes(value)
  )
}

function isSeedMode(
  value: string | undefined
): value is NeonDevelopmentSeedMode {
  return (
    value !== undefined &&
    (NEON_DEVELOPMENT_SEED_MODES as readonly string[]).includes(value)
  )
}

function parseDevelopmentProfile(
  environment: EnvironmentVariables
): EnvironmentProfile {
  const profile = parseEnvironmentProfile(environment)
  if (
    profile.appEnv !== "development" ||
    profile.database.provider !== "neon" ||
    profile.database.projectId !== NEON_DEVELOPMENT_PROJECT_ID ||
    profile.database.branch !== NEON_DEVELOPMENT_BRANCH
  ) {
    throw new NeonDevelopmentError(
      "target_mismatch",
      `Neon Development commands require APP_ENV=development, DATABASE_PROVIDER=neon, DATABASE_PROJECT_ID=${NEON_DEVELOPMENT_PROJECT_ID}, and DATABASE_BRANCH=${NEON_DEVELOPMENT_BRANCH}.`
    )
  }
  return profile
}

async function requireObservedBranch(
  runtime: NeonDevelopmentRuntime
): Promise<ObservedNeonBranch> {
  const observed = await runtime.observeBranch()
  if (!observed) {
    throw new NeonDevelopmentError(
      "target_mismatch",
      `Neon branch ${NEON_DEVELOPMENT_BRANCH} was not found in project ${NEON_DEVELOPMENT_PROJECT_ID}. Run pnpm neon:development -- provision.`
    )
  }
  return observed
}

export function assertDurableObservedIdentity(
  observed: ObservedNeonBranch
): void {
  if (
    observed.projectId !== NEON_DEVELOPMENT_PROJECT_ID ||
    observed.branch !== NEON_DEVELOPMENT_BRANCH ||
    observed.isDefault ||
    observed.expiresAt
  ) {
    throw new NeonDevelopmentError(
      "target_mismatch",
      observed.expiresAt
        ? `Neon branch ${observed.branch} expires at ${observed.expiresAt}. Remove the expiration with neon branches set-expiration ${NEON_DEVELOPMENT_BRANCH} --project-id ${NEON_DEVELOPMENT_PROJECT_ID}.`
        : `Neon Development requires durable non-default branch ${NEON_DEVELOPMENT_BRANCH} in project ${NEON_DEVELOPMENT_PROJECT_ID}.`
    )
  }
}

export function assertDurableDevelopmentTarget(
  profile: EnvironmentProfile,
  observed: ObservedNeonBranch
): void {
  assertDurableObservedIdentity(observed)

  const runtimeUrl = new URL(profile.database.runtimeUrl)
  const migrationUrl = new URL(profile.database.migrationUrl)
  if (
    normalizeHost(runtimeUrl.hostname) !== normalizeHost(observed.pooledHost) ||
    normalizeHost(migrationUrl.hostname) !==
      normalizeHost(observed.directHost) ||
    Number(runtimeUrl.port || NEON_DEVELOPMENT_PORT) !== observed.port ||
    Number(migrationUrl.port || NEON_DEVELOPMENT_PORT) !== observed.port ||
    runtimeUrl.pathname !== `/${observed.database}` ||
    migrationUrl.pathname !== `/${observed.database}`
  ) {
    throw new NeonDevelopmentError(
      "target_mismatch",
      "DATABASE_URL and DATABASE_URL_UNPOOLED must use the CLI-observed pooled and direct development endpoints, including explicit port and database path."
    )
  }
}

export function createDevelopmentGuardInput(
  profile: EnvironmentProfile,
  observed: ObservedNeonBranch
): EnvironmentGuardInput {
  assertDurableDevelopmentTarget(profile, observed)
  const target: DatabaseTargetIdentity = {
    provider: "neon",
    projectId: observed.projectId,
    branch: observed.branch,
    host: observed.directHost,
    port: observed.port,
    database: observed.database,
  }
  const connection: DatabaseConnectionObservation = {
    target: {
      provider: "neon",
      projectId: observed.projectId,
      branch: observed.branch,
      host: observed.directHost,
      port: observed.port,
      database: observed.database,
    },
    role: "direct",
    url: profile.database.migrationUrl,
  }
  return { profile, target, connection }
}

function formatInspection(
  profile: EnvironmentProfile,
  observed: ObservedNeonBranch
): string {
  return [
    `appEnv=${profile.appEnv}`,
    `projectId=${observed.projectId}`,
    `branch=${observed.branch}`,
    `branchId=${observed.branchId}`,
    `default=${observed.isDefault}`,
    `expiresAt=${observed.expiresAt ?? "none"}`,
    `runtimeHost=${observed.pooledHost}`,
    `migrationHost=${observed.directHost}`,
    `database=${observed.database}`,
    `port=${observed.port}`,
  ].join("\n")
}

function normalizeHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^\[|\]$/g, "")
}

function createRuntime(
  overrides: Partial<NeonDevelopmentRuntime> = {}
): NeonDevelopmentRuntime {
  const defaults = createDefaultRuntime()
  return {
    observeBranch: overrides.observeBranch ?? defaults.observeBranch,
    createBranch: overrides.createBranch ?? defaults.createBranch,
    migrate: overrides.migrate ?? defaults.migrate,
    seedOrdinary: overrides.seedOrdinary ?? defaults.seedOrdinary,
    seedBehavior: overrides.seedBehavior ?? defaults.seedBehavior,
    runPerformanceSeed:
      overrides.runPerformanceSeed ?? defaults.runPerformanceSeed,
  }
}

function createDefaultRuntime(): NeonDevelopmentRuntime {
  return {
    async observeBranch() {
      const details = await readBranchDetails()
      if (!details) return null
      const direct = await readConnectionString(false)
      const pooled = await readConnectionString(true)
      return toObservedBranch(details, direct, pooled)
    },
    async createBranch() {
      await runNeon([
        "branches",
        "create",
        "--name",
        NEON_DEVELOPMENT_BRANCH,
        "--parent",
        NEON_DEVELOPMENT_PARENT_BRANCH,
        "--project-id",
        NEON_DEVELOPMENT_PROJECT_ID,
        "--no-secrets",
        "--output",
        "json",
      ])
      const observed = await createDefaultRuntime().observeBranch()
      if (!observed) {
        throw new NeonDevelopmentError(
          "command_failed",
          `Created Neon branch ${NEON_DEVELOPMENT_BRANCH} but could not observe its endpoints.`
        )
      }
      return observed
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
    async seedOrdinary(profile) {
      const { seedNeonDevelopment } = await import("./seed")
      await seedNeonDevelopment(profile, "ordinary")
    },
    async seedBehavior(profile) {
      const { seedNeonDevelopment } = await import("./seed")
      await seedNeonDevelopment(profile, "behavior")
    },
    async runPerformanceSeed() {
      await runProcess("pnpm", ["neon:performance"], {
        NEON_COMPUTE_ACTIVE: "true",
      })
    },
  }
}

interface NeonBranchDetails {
  readonly id: string
  readonly project_id: string
  readonly name: string
  readonly default?: boolean
  readonly expires_at?: string | null
}

function toObservedBranch(
  details: NeonBranchDetails,
  directUrl: string,
  pooledUrl: string
): ObservedNeonBranch {
  const direct = parseObservedUrl(directUrl)
  const pooled = parseObservedUrl(pooledUrl)
  if (direct.database !== pooled.database || direct.port !== pooled.port) {
    throw new NeonDevelopmentError(
      "target_mismatch",
      "Neon pooled and direct endpoints must share the same database and port."
    )
  }

  return {
    projectId: details.project_id,
    branch: details.name,
    branchId: details.id,
    isDefault: details.default === true,
    expiresAt: details.expires_at ?? null,
    directHost: direct.host,
    pooledHost: pooled.host,
    database: direct.database,
    port: direct.port,
  }
}

function parseObservedUrl(value: string): {
  host: string
  port: number
  database: string
} {
  let parsed: URL
  try {
    parsed = new URL(value.trim())
  } catch {
    throw new NeonDevelopmentError(
      "command_failed",
      "Neon CLI returned an invalid connection URL."
    )
  }

  const database = parsed.pathname.replace(/^\//, "")
  if (!parsed.hostname || !database) {
    throw new NeonDevelopmentError(
      "command_failed",
      "Neon CLI connection URL is missing a host or database."
    )
  }

  return {
    host: normalizeHost(parsed.hostname),
    port: parsed.port ? Number(parsed.port) : NEON_DEVELOPMENT_PORT,
    database,
  }
}

async function readBranchDetails(): Promise<NeonBranchDetails | null> {
  try {
    const output = await runNeon([
      "branches",
      "get",
      NEON_DEVELOPMENT_BRANCH,
      "--project-id",
      NEON_DEVELOPMENT_PROJECT_ID,
      "--output",
      "json",
    ])
    const parsed = JSON.parse(output) as NeonBranchDetails
    if (!parsed?.id || !parsed.project_id || !parsed.name) {
      throw new NeonDevelopmentError(
        "command_failed",
        "Neon CLI branch details were incomplete."
      )
    }
    return parsed
  } catch (error) {
    if (isMissingBranchError(error)) return null
    throw error
  }
}

async function readConnectionString(pooled: boolean): Promise<string> {
  const args = [
    "connection-string",
    NEON_DEVELOPMENT_BRANCH,
    "--project-id",
    NEON_DEVELOPMENT_PROJECT_ID,
    "--ssl",
    "require",
  ]
  if (pooled) args.push("--pooled")
  return (await runNeon(args)).trim()
}

function isMissingBranchError(error: unknown): boolean {
  if (!(error instanceof NeonDevelopmentError)) return false
  return /not found|could not find|no branch/i.test(error.message)
}

async function runNeon(args: string[]): Promise<string> {
  return runProcessCaptured("neon", args)
}

async function runProcess(
  command: string,
  args: string[],
  extraEnv?: Record<string, string>
): Promise<void> {
  await runProcessCaptured(command, args, extraEnv)
}

async function runProcessCaptured(
  command: string,
  args: string[],
  extraEnv?: Record<string, string>
): Promise<string> {
  const env = extraEnv ? { ...process.env, ...extraEnv } : process.env
  const resolved = resolveCommand(command, args)

  return await new Promise<string>((resolve, reject) => {
    const child: ChildProcess = spawn(resolved.command, resolved.args, {
      cwd: process.cwd(),
      env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    })
    let stdout = ""
    let stderr = ""
    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk)
    })
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk)
    })
    child.on("error", (error) => {
      const code = (error as NodeJS.ErrnoException).code
      if (code === "ENOENT") {
        reject(
          new NeonDevelopmentError(
            "cli_unavailable",
            `${command} was not found on PATH`
          )
        )
        return
      }
      reject(error)
    })
    child.on("close", (exitCode) => {
      if (exitCode === 0) {
        resolve(stdout)
        return
      }
      reject(
        new NeonDevelopmentError(
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

function resolveCommand(
  command: string,
  args: string[]
): { command: string; args: string[] } {
  if (process.platform !== "win32") {
    return { command, args }
  }

  return {
    command: process.env.ComSpec || "cmd.exe",
    args: ["/d", "/s", "/c", [command, ...args].map(quoteForCmd).join(" ")],
  }
}

function quoteForCmd(value: string): string {
  if (!/[\s"]/.test(value)) return value
  return `"${value.replaceAll('"', '\\"')}"`
}

function redactSecrets(value: string): string {
  return value.replaceAll(/postgresql:\/\/[^\s]+/gi, "postgresql://***")
}
