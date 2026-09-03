import { spawn, type ChildProcess } from "node:child_process"
import { URL } from "node:url"

import {
  parseDeliveryArguments,
  parseEnvironmentProfile,
  type EnvironmentProfile,
  type EnvironmentVariables,
} from "../../environment/core"
import {
  assertMigrationAllowed,
  assertPreviewCleanupAllowed,
  assertPreviewDeploymentAllowed,
  assertSeedReplacementAllowed,
  executeAfterGuard,
  type DatabaseConnectionObservation,
  type DatabaseTargetIdentity,
  type EnvironmentGuardInput,
  type ResolvedDeliveryRef,
} from "../../environment/guards"
import {
  PREVIEW_EXPIRY_MS,
  PREVIEW_PARENT_BRANCH,
  PREVIEW_PORT,
  PREVIEW_PROJECT_ID,
  PREVIEW_SEED_USER,
  previewBranchName,
} from "./constants"

export const PREVIEW_COMMANDS = ["deploy", "cleanup", "inspect"] as const

export type PreviewCommandName = (typeof PREVIEW_COMMANDS)[number]

export type PreviewDeliveryErrorCode =
  | "invalid_command"
  | "target_mismatch"
  | "command_failed"
  | "cli_unavailable"
  | "ref_unresolved"

export class PreviewDeliveryError extends Error {
  readonly code: PreviewDeliveryErrorCode

  constructor(code: PreviewDeliveryErrorCode, message: string) {
    super(message)
    this.name = "PreviewDeliveryError"
    this.code = code
  }
}

export interface ParsedPreviewCommand {
  readonly command: PreviewCommandName
  readonly previewId: string
  readonly ref?: string
}

export interface ObservedPreviewBranch {
  readonly projectId: string
  readonly branch: string
  readonly branchId: string
  readonly isDefault: boolean
  readonly expiresAt: string | null
  readonly parentBranch?: string
  readonly directHost: string
  readonly pooledHost: string
  readonly database: string
  readonly port: number
  readonly directUrl: string
  readonly pooledUrl: string
}

export interface PreviewCreateRequest {
  readonly previewId: string
  readonly branch: string
  readonly parentBranch: string
  readonly expiresAt: string
}

export interface PreviewDeployment {
  readonly url: string
  readonly deploymentId: string
}

export interface PreviewSmokeResult {
  readonly landing: boolean
  readonly signedIn: boolean
  readonly mutated: boolean
}

export interface PreviewRuntime {
  resolveRef(requestedRef: string): Promise<ResolvedDeliveryRef>
  observeBranch(branch: string): Promise<ObservedPreviewBranch | null>
  createBranch(request: PreviewCreateRequest): Promise<ObservedPreviewBranch>
  deleteBranch(branch: string): Promise<void>
  migrate(databaseUrl: string): Promise<void>
  seed(profile: EnvironmentProfile): Promise<void>
  deploy(input: {
    readonly profile: EnvironmentProfile
    readonly commitSha: string
    readonly previewId: string
  }): Promise<PreviewDeployment>
  smoke(input: {
    readonly url: string
    readonly email: string
    readonly password: string
  }): Promise<PreviewSmokeResult>
}

export interface RunPreviewOptions {
  readonly environment?: EnvironmentVariables
  readonly runtime?: Partial<PreviewRuntime>
  readonly write?: (line: string) => void
  readonly now?: number
}

const COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/i
const PREVIEW_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

export function parsePreviewCommand(
  argv: readonly string[]
): ParsedPreviewCommand {
  const [command, ...rest] = argv
  if (!isPreviewCommand(command)) {
    throw new PreviewDeliveryError(
      "invalid_command",
      "Usage: pnpm preview -- deploy --ref <ref> --preview-id <id> | cleanup --preview-id <id> | inspect --preview-id <id>"
    )
  }

  if (command === "deploy") {
    const delivery = parseDeliveryArguments(["preview", ...rest])
    if (!delivery.previewId) {
      throw new PreviewDeliveryError(
        "invalid_command",
        "Preview deploy requires --preview-id"
      )
    }
    return {
      command,
      ref: delivery.ref,
      previewId: delivery.previewId,
    }
  }

  return {
    command,
    previewId: parsePreviewIdOnly(rest),
  }
}

export async function runPreviewCommand(
  parsed: ParsedPreviewCommand,
  options: RunPreviewOptions = {}
): Promise<void> {
  const environment = options.environment ?? process.env
  const runtime = createRuntime(options.runtime)
  const write = options.write ?? ((line: string) => console.log(line))
  requirePreviewAppEnv(environment)

  const branch = previewBranchName(parsed.previewId)

  switch (parsed.command) {
    case "inspect": {
      const observed = await requireObservedBranch(runtime, branch)
      assertPreviewIdentity(observed, parsed.previewId)
      write(formatInspection(parsed.previewId, observed))
      return
    }
    case "cleanup": {
      const observed = await runtime.observeBranch(branch)
      if (!observed) return
      assertPreviewIdentity(observed, parsed.previewId)
      const profile = parsePreviewProfile(
        environment,
        observed,
        parsed.previewId
      )
      const input = createPreviewGuardInput(profile, observed, parsed.previewId)
      await executeAfterGuard(
        () => assertPreviewCleanupAllowed(input),
        () => runtime.deleteBranch(branch)
      )
      return
    }
    case "deploy": {
      if (!parsed.ref) {
        throw new PreviewDeliveryError(
          "invalid_command",
          "Preview deploy requires --ref"
        )
      }
      const resolvedRef = await runtime.resolveRef(parsed.ref)
      const existing = await runtime.observeBranch(branch)
      const observed = existing
        ? existing
        : await runtime.createBranch({
            previewId: parsed.previewId,
            branch,
            parentBranch: PREVIEW_PARENT_BRANCH,
            expiresAt: previewExpiresAt(options.now),
          })
      assertPreviewIdentity(observed, parsed.previewId)
      const profile = parsePreviewProfile(
        environment,
        observed,
        parsed.previewId
      )
      const input = createPreviewGuardInput(
        profile,
        observed,
        parsed.previewId,
        resolvedRef
      )
      await executeAfterGuard(
        () => assertPreviewDeploymentAllowed(input),
        async () => {
          await executeAfterGuard(
            () => assertMigrationAllowed(input),
            () => runtime.migrate(profile.database.migrationUrl)
          )
          await executeAfterGuard(
            () => assertSeedReplacementAllowed(input),
            () => runtime.seed(profile)
          )
          const deployment = await runtime.deploy({
            profile,
            commitSha: resolvedRef.commitSha,
            previewId: parsed.previewId,
          })
          await runtime.smoke({
            url: deployment.url,
            email: PREVIEW_SEED_USER.email,
            password: PREVIEW_SEED_USER.password,
          })
          write(
            formatDeploymentEvidence(
              parsed.previewId,
              observed,
              resolvedRef,
              deployment
            )
          )
        }
      )
    }
  }
}

function isPreviewCommand(
  value: string | undefined
): value is PreviewCommandName {
  return (
    value !== undefined &&
    (PREVIEW_COMMANDS as readonly string[]).includes(value)
  )
}

function parsePreviewIdOnly(args: readonly string[]): string {
  let previewId: string | undefined
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === "--preview-id") {
      const value = args[index + 1]
      if (!value || previewId) {
        throw new PreviewDeliveryError(
          "invalid_command",
          "cleanup and inspect require one --preview-id"
        )
      }
      previewId = value
      index += 1
      continue
    }
    if (argument.startsWith("--preview-id=")) {
      const value = argument.slice("--preview-id=".length)
      if (!value || previewId) {
        throw new PreviewDeliveryError(
          "invalid_command",
          "cleanup and inspect require one --preview-id"
        )
      }
      previewId = value
      continue
    }
    throw new PreviewDeliveryError(
      "invalid_command",
      "cleanup and inspect accept only --preview-id"
    )
  }
  if (!previewId || !PREVIEW_ID_PATTERN.test(previewId)) {
    throw new PreviewDeliveryError(
      "invalid_command",
      "Preview cleanup and inspect require --preview-id"
    )
  }
  return previewId
}

function requirePreviewAppEnv(environment: EnvironmentVariables): void {
  if (environment.APP_ENV !== "preview") {
    throw new PreviewDeliveryError(
      "target_mismatch",
      "Preview commands require APP_ENV=preview"
    )
  }
}

function previewExpiresAt(now = Date.now()): string {
  return new Date(now + PREVIEW_EXPIRY_MS)
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z")
}

async function requireObservedBranch(
  runtime: PreviewRuntime,
  branch: string
): Promise<ObservedPreviewBranch> {
  const observed = await runtime.observeBranch(branch)
  if (!observed) {
    throw new PreviewDeliveryError(
      "target_mismatch",
      `Neon branch ${branch} was not found in project ${PREVIEW_PROJECT_ID}.`
    )
  }
  return observed
}

export function assertPreviewIdentity(
  observed: ObservedPreviewBranch,
  previewId: string
): void {
  const expectedBranch = previewBranchName(previewId)
  if (
    observed.projectId !== PREVIEW_PROJECT_ID ||
    observed.branch !== expectedBranch ||
    observed.isDefault ||
    !observed.expiresAt ||
    observed.branch === PREVIEW_PARENT_BRANCH ||
    observed.branch.toLowerCase() === "main" ||
    (observed.parentBranch && observed.parentBranch !== PREVIEW_PARENT_BRANCH)
  ) {
    throw new PreviewDeliveryError(
      "target_mismatch",
      `Preview requires expiring non-default branch ${expectedBranch} in project ${PREVIEW_PROJECT_ID}, derived from ${PREVIEW_PARENT_BRANCH}.`
    )
  }
}

function parsePreviewProfile(
  environment: EnvironmentVariables,
  observed: ObservedPreviewBranch,
  previewId: string
): EnvironmentProfile {
  const profile = parseEnvironmentProfile({
    ...environment,
    APP_ENV: "preview",
    NODE_ENV: "production",
    DATABASE_PROVIDER: "neon",
    DATABASE_PROJECT_ID: PREVIEW_PROJECT_ID,
    DATABASE_BRANCH: previewBranchName(previewId),
    DATABASE_URL: observed.pooledUrl,
    DATABASE_URL_UNPOOLED: observed.directUrl,
    NEXT_PUBLIC_SANITY_DATASET: "preview",
    APP_MAIL_TRANSPORT: "controlled-account",
    SECRET_NAMESPACE: "preview",
    BETTER_AUTH_LOCAL_MAILBOX: undefined,
  })
  if (
    profile.appEnv !== "preview" ||
    profile.database.projectId !== PREVIEW_PROJECT_ID ||
    profile.database.branch !== previewBranchName(previewId)
  ) {
    throw new PreviewDeliveryError(
      "target_mismatch",
      `Preview commands require APP_ENV=preview, DATABASE_PROJECT_ID=${PREVIEW_PROJECT_ID}, and DATABASE_BRANCH=${previewBranchName(previewId)}.`
    )
  }
  return profile
}

function createPreviewGuardInput(
  profile: EnvironmentProfile,
  observed: ObservedPreviewBranch,
  previewId: string,
  resolvedRef?: ResolvedDeliveryRef
): EnvironmentGuardInput {
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
  return {
    profile,
    target,
    connection,
    requestedPreviewId: previewId,
    preview: {
      previewId,
      projectId: observed.projectId,
      branch: observed.branch,
    },
    ...(resolvedRef ? { resolvedRef } : {}),
  }
}

function formatInspection(
  previewId: string,
  observed: ObservedPreviewBranch
): string {
  return [
    `previewId=${previewId}`,
    `appEnv=preview`,
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

function formatDeploymentEvidence(
  previewId: string,
  observed: ObservedPreviewBranch,
  resolvedRef: ResolvedDeliveryRef,
  deployment: PreviewDeployment
): string {
  return [
    `previewId=${previewId}`,
    `commitSha=${resolvedRef.commitSha}`,
    `projectId=${observed.projectId}`,
    `branch=${observed.branch}`,
    `branchId=${observed.branchId}`,
    `expiresAt=${observed.expiresAt ?? "none"}`,
    `deploymentId=${deployment.deploymentId}`,
    `url=${deployment.url}`,
  ].join("\n")
}

function createRuntime(
  overrides: Partial<PreviewRuntime> = {}
): PreviewRuntime {
  const defaults = createDefaultRuntime()
  return {
    resolveRef: overrides.resolveRef ?? defaults.resolveRef,
    observeBranch: overrides.observeBranch ?? defaults.observeBranch,
    createBranch: overrides.createBranch ?? defaults.createBranch,
    deleteBranch: overrides.deleteBranch ?? defaults.deleteBranch,
    migrate: overrides.migrate ?? defaults.migrate,
    seed: overrides.seed ?? defaults.seed,
    deploy: overrides.deploy ?? defaults.deploy,
    smoke: overrides.smoke ?? defaults.smoke,
  }
}

function createDefaultRuntime(): PreviewRuntime {
  return {
    async resolveRef(requestedRef) {
      const output = (
        await runProcessCaptured("git", [
          "rev-parse",
          "--verify",
          `${requestedRef}^{commit}`,
        ])
      ).trim()
      if (!COMMIT_SHA_PATTERN.test(output)) {
        throw new PreviewDeliveryError(
          "ref_unresolved",
          "git did not resolve the requested ref to a full commit SHA"
        )
      }
      return {
        requestedRef,
        commitSha: output.toLowerCase(),
        kind: COMMIT_SHA_PATTERN.test(requestedRef) ? "commit" : "branch",
      }
    },
    async observeBranch(branch) {
      const details = await readBranchDetails(branch)
      if (!details) return null
      const directUrl = await readConnectionString(branch, false)
      const pooledUrl = await readConnectionString(branch, true)
      return toObservedBranch(details, directUrl, pooledUrl)
    },
    async createBranch(request) {
      await runNeon([
        "branches",
        "create",
        "--name",
        request.branch,
        "--parent",
        request.parentBranch,
        "--project-id",
        PREVIEW_PROJECT_ID,
        "--expires-at",
        request.expiresAt,
        "--no-secrets",
        "--output",
        "json",
      ])
      const observed = await createDefaultRuntime().observeBranch(
        request.branch
      )
      if (!observed) {
        throw new PreviewDeliveryError(
          "command_failed",
          `Created Neon branch ${request.branch} but could not observe its endpoints.`
        )
      }
      return observed
    },
    async deleteBranch(branch) {
      await runNeon([
        "branches",
        "delete",
        branch,
        "--project-id",
        PREVIEW_PROJECT_ID,
        "--output",
        "json",
      ])
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
      const { seedPreview } = await import("./seed")
      await seedPreview(profile)
    },
    async deploy(input) {
      const { deployPreview } = await import("./vercel")
      return deployPreview(input)
    },
    async smoke(input) {
      const { smokePreview } = await import("./smoke")
      return smokePreview(input)
    },
  }
}

interface NeonBranchDetails {
  readonly id: string
  readonly project_id: string
  readonly name: string
  readonly default?: boolean
  readonly expires_at?: string | null
  readonly parent_id?: string
}

function toObservedBranch(
  details: NeonBranchDetails,
  directUrl: string,
  pooledUrl: string
): ObservedPreviewBranch {
  const direct = parseObservedUrl(directUrl)
  const pooled = parseObservedUrl(pooledUrl)
  if (direct.database !== pooled.database || direct.port !== pooled.port) {
    throw new PreviewDeliveryError(
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
    directUrl: withExplicitPort(directUrl, direct.port),
    pooledUrl: withExplicitPort(pooledUrl, pooled.port),
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
    throw new PreviewDeliveryError(
      "command_failed",
      "Neon CLI returned an invalid connection URL."
    )
  }

  const database = parsed.pathname.replace(/^\//, "")
  if (!parsed.hostname || !database) {
    throw new PreviewDeliveryError(
      "command_failed",
      "Neon CLI connection URL is missing a host or database."
    )
  }

  return {
    host: normalizeHost(parsed.hostname),
    port: parsed.port ? Number(parsed.port) : PREVIEW_PORT,
    database,
  }
}

function withExplicitPort(value: string, port: number): string {
  const parsed = new URL(value.trim())
  if (!parsed.port) parsed.port = String(port)
  return parsed.toString()
}

function normalizeHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^\[|\]$/g, "")
}

async function readBranchDetails(
  branch: string
): Promise<NeonBranchDetails | null> {
  try {
    const output = await runNeon([
      "branches",
      "get",
      branch,
      "--project-id",
      PREVIEW_PROJECT_ID,
      "--output",
      "json",
    ])
    const parsed = JSON.parse(output) as NeonBranchDetails
    if (!parsed?.id || !parsed.project_id || !parsed.name) {
      throw new PreviewDeliveryError(
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

async function readConnectionString(
  branch: string,
  pooled: boolean
): Promise<string> {
  const args = [
    "connection-string",
    branch,
    "--project-id",
    PREVIEW_PROJECT_ID,
    "--ssl",
    "require",
  ]
  if (pooled) args.push("--pooled")
  return (await runNeon(args)).trim()
}

function isMissingBranchError(error: unknown): boolean {
  if (!(error instanceof PreviewDeliveryError)) return false
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

export async function runPreviewProcess(
  command: string,
  args: string[],
  extraEnv?: Record<string, string>
): Promise<string> {
  return runProcessCaptured(command, args, extraEnv)
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
          new PreviewDeliveryError(
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
        new PreviewDeliveryError(
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
