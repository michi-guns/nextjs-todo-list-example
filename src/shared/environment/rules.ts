import { readResendConfig } from "../../modules/auth/infrastructure/resend-mail"

/**
 * Pure environment rules shared by operator tooling
 * (`scripts/environment/core.ts`) and application runtime validation
 * (`./runtime.ts`). No I/O; errors carry static text and variable names only.
 */
export const APP_ENV_VALUES = [
  "local",
  "development",
  "preview",
  "production",
] as const

export const NODE_ENV_VALUES = ["development", "test", "production"] as const

export const DATABASE_PROVIDER_VALUES = ["local-postgres", "neon"] as const

export const SANITY_WRITE_POLICY_VALUES = [
  "read-only",
  "local-recovery",
  "production-recovery",
] as const

export const MAIL_TRANSPORT_VALUES = [
  "local-mailbox",
  "controlled-account",
  "remote",
] as const

export const DEPLOYMENT_OWNER_VALUES = ["local", "github", "vercel"] as const

export type AppEnv = (typeof APP_ENV_VALUES)[number]
export type NodeEnv = (typeof NODE_ENV_VALUES)[number]
export type DatabaseProvider = (typeof DATABASE_PROVIDER_VALUES)[number]
export type SanityWritePolicy = (typeof SANITY_WRITE_POLICY_VALUES)[number]
export type MailTransport = (typeof MAIL_TRANSPORT_VALUES)[number]
export type DeploymentOwner = (typeof DEPLOYMENT_OWNER_VALUES)[number]

export type EnvironmentVariables = Readonly<Record<string, string | undefined>>

export type EnvironmentProfileErrorCode =
  | "missing_variable"
  | "invalid_value"
  | "invalid_origin"
  | "database_target_mismatch"
  | "database_role_mismatch"
  | "mail_policy_mismatch"
  | "sanity_policy_mismatch"
  | "secret_namespace_mismatch"
  | "missing_argument"
  | "invalid_argument"
  | "unexpected_argument"

export class EnvironmentProfileError extends Error {
  readonly code: EnvironmentProfileErrorCode
  readonly variable?: string

  constructor(
    code: EnvironmentProfileErrorCode,
    message: string,
    variable?: string
  ) {
    super(message)
    this.name = "EnvironmentProfileError"
    this.code = code
    this.variable = variable
  }
}

export interface SanityPolicy {
  readonly projectId: string
  readonly dataset: string
  readonly apiVersion: string
  readonly writePolicy: SanityWritePolicy
  /** Optional validated server-only secret; never include it in diagnostics. */
  readonly revalidateSecret?: string
  /** Optional validated server-only secret; never include it in diagnostics. */
  readonly manualRecoverySecret?: string
}

export interface MailPolicy {
  readonly transport: MailTransport
  readonly provider?: string
  readonly localMailboxEnabled: boolean
}

const DEFAULT_SANITY_API_VERSION = "2026-08-27"
const POSTGRES_PROTOCOLS = new Set(["postgres:", "postgresql:"])
const SAFE_METADATA_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/

export function required(
  environment: EnvironmentVariables,
  variable: string
): string {
  const value = environment[variable]?.trim()
  if (!value) {
    throw new EnvironmentProfileError(
      "missing_variable",
      `${variable} is required`,
      variable
    )
  }

  return value
}

export function optional(
  environment: EnvironmentVariables,
  variable: string
): string | undefined {
  const value = environment[variable]?.trim()
  return value || undefined
}

export function enumValue<T extends string>(
  environment: EnvironmentVariables,
  variable: string,
  values: readonly T[]
): T {
  const value = required(environment, variable)
  if (!values.includes(value as T)) {
    throw new EnvironmentProfileError(
      "invalid_value",
      `${variable} must use one of the supported values`,
      variable
    )
  }

  return value as T
}

export function safeMetadata(
  environment: EnvironmentVariables,
  variable: string
): string {
  const value = required(environment, variable)
  if (value.length > 128 || !SAFE_METADATA_PATTERN.test(value)) {
    throw new EnvironmentProfileError(
      "invalid_value",
      `${variable} must be a compact identifier`,
      variable
    )
  }

  return value
}

export function optionalSafeMetadata(
  environment: EnvironmentVariables,
  variable: string
): string | undefined {
  const value = optional(environment, variable)
  if (value === undefined) {
    return undefined
  }

  if (value.length > 128 || !SAFE_METADATA_PATTERN.test(value)) {
    throw new EnvironmentProfileError(
      "invalid_value",
      `${variable} must be a compact identifier`,
      variable
    )
  }

  return value
}

export function parseBoolean(
  environment: EnvironmentVariables,
  variable: string
): boolean {
  const value = optional(environment, variable)
  if (value === undefined) {
    return false
  }

  if (value !== "true" && value !== "false") {
    throw new EnvironmentProfileError(
      "invalid_value",
      `${variable} must be true or false`,
      variable
    )
  }

  return value === "true"
}

export function parseOrigin(value: string): URL {
  try {
    const url = new URL(value)
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      throw new Error("not an origin")
    }

    return url
  } catch {
    throw new EnvironmentProfileError(
      "invalid_origin",
      "BETTER_AUTH_URL must be a valid HTTP(S) origin",
      "BETTER_AUTH_URL"
    )
  }
}

export function isLoopback(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "")
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1"
  )
}

export function assertProfileOrigin(appEnv: AppEnv, url: URL): void {
  const loopback = isLoopback(url.hostname)
  const localProfile = appEnv === "local" || appEnv === "development"

  if (localProfile && (url.protocol !== "http:" || !loopback)) {
    throw new EnvironmentProfileError(
      "invalid_origin",
      `${appEnv} requires an explicit loopback HTTP origin`,
      "BETTER_AUTH_URL"
    )
  }

  if (!localProfile && (url.protocol !== "https:" || loopback)) {
    throw new EnvironmentProfileError(
      "invalid_origin",
      `${appEnv} requires a non-loopback HTTPS origin`,
      "BETTER_AUTH_URL"
    )
  }
}

export function parseDatabaseUrl(value: string, variable: string): URL {
  try {
    const url = new URL(value)
    if (!POSTGRES_PROTOCOLS.has(url.protocol) || !url.hostname) {
      throw new Error("not a PostgreSQL URL")
    }

    return url
  } catch {
    throw new EnvironmentProfileError(
      "invalid_value",
      `${variable} must be a PostgreSQL connection URL`,
      variable
    )
  }
}

export function looksPooled(url: URL): boolean {
  return /(^|[-.])pooler([-.]|$)/i.test(url.hostname)
}

export function parseSanityPolicy(
  appEnv: AppEnv,
  environment: EnvironmentVariables
): SanityPolicy {
  const projectId = safeMetadata(environment, "NEXT_PUBLIC_SANITY_PROJECT_ID")
  const dataset = safeMetadata(environment, "NEXT_PUBLIC_SANITY_DATASET")
  const apiVersion =
    optionalSafeMetadata(environment, "NEXT_PUBLIC_SANITY_API_VERSION") ||
    DEFAULT_SANITY_API_VERSION
  const writePolicy = enumValue(
    environment,
    "SANITY_WRITE_POLICY",
    SANITY_WRITE_POLICY_VALUES
  )
  const expectedDataset = appEnv === "preview" ? "preview" : "production"

  if (dataset !== expectedDataset) {
    throw new EnvironmentProfileError(
      "sanity_policy_mismatch",
      `${appEnv} requires the ${expectedDataset} Sanity dataset`,
      "NEXT_PUBLIC_SANITY_DATASET"
    )
  }

  if (
    (appEnv === "local" &&
      !["read-only", "local-recovery"].includes(writePolicy)) ||
    (appEnv !== "local" &&
      ((appEnv === "production" && writePolicy !== "production-recovery") ||
        (appEnv !== "production" && writePolicy !== "read-only")))
  ) {
    throw new EnvironmentProfileError(
      "sanity_policy_mismatch",
      `${appEnv} has an invalid Sanity write/recovery policy`,
      "SANITY_WRITE_POLICY"
    )
  }

  const revalidateSecret = optional(environment, "SANITY_REVALIDATE_SECRET")
  const manualRecoverySecret = optional(
    environment,
    "SANITY_MANUAL_RECOVERY_SECRET"
  )
  if (
    writePolicy === "local-recovery" &&
    (!revalidateSecret || !manualRecoverySecret)
  ) {
    throw new EnvironmentProfileError(
      "missing_variable",
      "local Sanity recovery requires both recovery secrets",
      "SANITY_REVALIDATE_SECRET"
    )
  }
  if (
    writePolicy === "production-recovery" &&
    (!revalidateSecret || !manualRecoverySecret)
  ) {
    throw new EnvironmentProfileError(
      "missing_variable",
      "Production Sanity recovery requires both recovery secrets",
      "SANITY_REVALIDATE_SECRET"
    )
  }
  if (
    writePolicy === "read-only" &&
    (revalidateSecret || manualRecoverySecret)
  ) {
    throw new EnvironmentProfileError(
      "sanity_policy_mismatch",
      "read-only profiles cannot receive Sanity recovery secrets",
      revalidateSecret
        ? "SANITY_REVALIDATE_SECRET"
        : "SANITY_MANUAL_RECOVERY_SECRET"
    )
  }

  return {
    projectId,
    dataset,
    apiVersion,
    writePolicy,
    ...(revalidateSecret ? { revalidateSecret } : {}),
    ...(manualRecoverySecret ? { manualRecoverySecret } : {}),
  }
}

export function parseMailPolicy(
  appEnv: AppEnv,
  environment: EnvironmentVariables
): MailPolicy {
  const transport = enumValue(
    environment,
    "APP_MAIL_TRANSPORT",
    MAIL_TRANSPORT_VALUES
  )
  const localMailboxEnabled = parseBoolean(
    environment,
    "BETTER_AUTH_LOCAL_MAILBOX"
  )
  const provider = optionalSafeMetadata(environment, "APP_MAIL_PROVIDER")

  if (
    (appEnv === "local" || appEnv === "development") &&
    transport !== "local-mailbox"
  ) {
    throw new EnvironmentProfileError(
      "mail_policy_mismatch",
      `${appEnv} requires the local-mailbox transport`,
      "APP_MAIL_TRANSPORT"
    )
  }
  if (appEnv === "preview" && transport !== "controlled-account") {
    throw new EnvironmentProfileError(
      "mail_policy_mismatch",
      "preview requires the controlled-account mail transport",
      "APP_MAIL_TRANSPORT"
    )
  }
  if (appEnv === "production" && transport !== "remote") {
    throw new EnvironmentProfileError(
      "mail_policy_mismatch",
      "production requires a remote mail transport",
      "APP_MAIL_TRANSPORT"
    )
  }
  if (
    (appEnv === "preview" || appEnv === "production") &&
    localMailboxEnabled
  ) {
    throw new EnvironmentProfileError(
      "mail_policy_mismatch",
      "local mailbox is unavailable in deployed profiles",
      "BETTER_AUTH_LOCAL_MAILBOX"
    )
  }
  if (
    (appEnv === "local" || appEnv === "development") &&
    !localMailboxEnabled
  ) {
    throw new EnvironmentProfileError(
      "mail_policy_mismatch",
      "local and development auth-link flows require an enabled local mailbox",
      "BETTER_AUTH_LOCAL_MAILBOX"
    )
  }
  if (transport === "remote" && !provider) {
    throw new EnvironmentProfileError(
      "missing_variable",
      "APP_MAIL_PROVIDER is required for the remote mail transport",
      "APP_MAIL_PROVIDER"
    )
  }
  if (transport !== "remote" && provider) {
    throw new EnvironmentProfileError(
      "mail_policy_mismatch",
      "a remote mail provider is not allowed for this profile",
      "APP_MAIL_PROVIDER"
    )
  }

  return {
    transport,
    ...(provider ? { provider } : {}),
    localMailboxEnabled,
  }
}

export function assertNodeEnvironment(appEnv: AppEnv, nodeEnv: NodeEnv): void {
  if (
    (appEnv === "local" && !["development", "test"].includes(nodeEnv)) ||
    (appEnv === "development" && nodeEnv !== "development") ||
    ((appEnv === "preview" || appEnv === "production") &&
      nodeEnv !== "production")
  ) {
    throw new EnvironmentProfileError(
      "invalid_value",
      `${appEnv} is incompatible with NODE_ENV=${nodeEnv}`,
      "NODE_ENV"
    )
  }
}

export function expectedDatabaseProvider(appEnv: AppEnv): DatabaseProvider {
  return appEnv === "local" ? "local-postgres" : "neon"
}

/** Development and Preview never run against the default Neon branch. */
export function assertNonDefaultBranch(appEnv: AppEnv, branch: string): void {
  if (
    (appEnv === "development" || appEnv === "preview") &&
    branch.toLowerCase() === "main"
  ) {
    throw new EnvironmentProfileError(
      "database_target_mismatch",
      `${appEnv} cannot use the default main branch`,
      "DATABASE_BRANCH"
    )
  }
}

export function assertProductionMail(environment: EnvironmentVariables): void {
  try {
    readResendConfig(environment)
  } catch {
    throw new EnvironmentProfileError(
      "mail_policy_mismatch",
      "Invalid Production Resend configuration"
    )
  }
}
