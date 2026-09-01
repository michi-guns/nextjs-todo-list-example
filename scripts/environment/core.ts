import { URL } from "node:url"

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

export interface EnvironmentOperations {
  readonly canMigrate: boolean
  readonly canSeed: boolean
  readonly canReset: boolean
  readonly canPreviewDeploy: boolean
  readonly canProductionDeploy: boolean
  readonly canUseSanityRecovery: boolean
}

export interface EnvironmentProfile {
  readonly appEnv: AppEnv
  readonly nodeEnv: NodeEnv
  readonly betterAuth: {
    readonly url: string
    /** Validated secret for authenticated runtime consumers; never serialize directly. */
    readonly secret: string
  }
  readonly database: {
    readonly provider: DatabaseProvider
    readonly projectId?: string
    readonly branch?: string
    readonly runtimeRole: "direct" | "pooled"
    readonly migrationRole: "direct" | "pooled"
    /** Validated runtime connection string; never include it in diagnostics. */
    readonly runtimeUrl: string
    /** Validated direct migration connection string; never include it in diagnostics. */
    readonly migrationUrl: string
    readonly runtimeUrlConfigured: boolean
    readonly migrationUrlConfigured: boolean
  }
  readonly sanity: {
    readonly projectId: string
    readonly dataset: string
    readonly apiVersion: string
    readonly writePolicy: SanityWritePolicy
    /** Optional validated server-only secret; never include it in diagnostics. */
    readonly revalidateSecret?: string
    /** Optional validated server-only secret; never include it in diagnostics. */
    readonly manualRecoverySecret?: string
  }
  readonly mail: {
    readonly transport: MailTransport
    readonly provider?: string
    readonly localMailboxEnabled: boolean
  }
  readonly deployment: {
    readonly owner: DeploymentOwner
    readonly secretNamespace: string
  }
  readonly operations: EnvironmentOperations
}

export interface RedactedEnvironmentInspection {
  readonly appEnv: AppEnv
  readonly nodeEnv: NodeEnv
  readonly origin: string
  readonly database: Omit<
    EnvironmentProfile["database"],
    "runtimeUrl" | "migrationUrl"
  >
  readonly sanity: {
    readonly projectId: string
    readonly dataset: string
    readonly apiVersion: string
    readonly writePolicy: SanityWritePolicy
    readonly revalidateSecretConfigured: boolean
    readonly manualRecoverySecretConfigured: boolean
  }
  readonly mail: EnvironmentProfile["mail"]
  readonly deployment: EnvironmentProfile["deployment"]
  readonly secrets: {
    readonly betterAuth: boolean
    readonly sanityRevalidate: boolean
    readonly sanityManualRecovery: boolean
    readonly mailProvider: boolean
  }
  readonly operations: EnvironmentOperations
}

export type DeliveryCommand = "preview" | "production"

export interface DeliveryArguments {
  readonly command: DeliveryCommand
  readonly ref: string
  readonly previewId?: string
}

const DEFAULT_SANITY_API_VERSION = "2026-08-27"
const POSTGRES_PROTOCOLS = new Set(["postgres:", "postgresql:"])
const MUTABLE_REFS = new Set(["head", "latest", "main", "master"])
const SAFE_METADATA_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/
const DELIVERY_REF_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/+@-]*$/
const PREVIEW_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

function required(environment: EnvironmentVariables, variable: string): string {
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

function optional(
  environment: EnvironmentVariables,
  variable: string
): string | undefined {
  const value = environment[variable]?.trim()
  return value || undefined
}

function enumValue<T extends string>(
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

function safeMetadata(
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

function optionalSafeMetadata(
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

function parseBoolean(
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

function parseOrigin(value: string): URL {
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

function isLoopback(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "")
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1"
  )
}

function assertProfileOrigin(appEnv: AppEnv, url: URL): void {
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

function parseDatabaseUrl(value: string, variable: string): URL {
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

function looksPooled(url: URL): boolean {
  return /(^|[-.])pooler([-.]|$)/i.test(url.hostname)
}

function parseDatabase(
  appEnv: AppEnv,
  environment: EnvironmentVariables
): EnvironmentProfile["database"] {
  const provider = enumValue(
    environment,
    "DATABASE_PROVIDER",
    DATABASE_PROVIDER_VALUES
  )
  const expectedProvider = appEnv === "local" ? "local-postgres" : "neon"
  if (provider !== expectedProvider) {
    throw new EnvironmentProfileError(
      "database_target_mismatch",
      `${appEnv} requires the ${expectedProvider} database provider`,
      "DATABASE_PROVIDER"
    )
  }
  const runtimeUrl = parseDatabaseUrl(
    required(environment, "DATABASE_URL"),
    "DATABASE_URL"
  )
  const unpooledValue = optional(environment, "DATABASE_URL_UNPOOLED")
  const migrationUrl = parseDatabaseUrl(
    unpooledValue || runtimeUrl.toString(),
    "DATABASE_URL_UNPOOLED"
  )

  if (provider === "local-postgres") {
    if (
      !isLoopback(runtimeUrl.hostname) ||
      !isLoopback(migrationUrl.hostname)
    ) {
      throw new EnvironmentProfileError(
        "database_target_mismatch",
        "local-postgres requires loopback database URLs",
        "DATABASE_URL"
      )
    }

    if (
      optional(environment, "DATABASE_PROJECT_ID") ||
      optional(environment, "DATABASE_BRANCH")
    ) {
      throw new EnvironmentProfileError(
        "database_target_mismatch",
        "local-postgres cannot carry a remote database project or branch identity",
        "DATABASE_PROJECT_ID"
      )
    }

    return {
      provider,
      runtimeRole: "direct",
      migrationRole: "direct",
      runtimeUrl: runtimeUrl.toString(),
      migrationUrl: migrationUrl.toString(),
      runtimeUrlConfigured: true,
      migrationUrlConfigured: unpooledValue !== undefined,
    }
  }

  const projectId = safeMetadata(environment, "DATABASE_PROJECT_ID")
  const branch = safeMetadata(environment, "DATABASE_BRANCH")
  if (isLoopback(runtimeUrl.hostname) || isLoopback(migrationUrl.hostname)) {
    throw new EnvironmentProfileError(
      "database_target_mismatch",
      "neon requires non-loopback database URLs",
      "DATABASE_URL"
    )
  }

  if (!unpooledValue) {
    throw new EnvironmentProfileError(
      "missing_variable",
      "DATABASE_URL_UNPOOLED is required for a remote database",
      "DATABASE_URL_UNPOOLED"
    )
  }

  if (!looksPooled(runtimeUrl) || looksPooled(migrationUrl)) {
    throw new EnvironmentProfileError(
      "database_role_mismatch",
      "Neon runtime must use a pooled URL and migrations must use a direct URL",
      "DATABASE_URL"
    )
  }

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

  return {
    provider,
    projectId,
    branch,
    runtimeRole: "pooled",
    migrationRole: "direct",
    runtimeUrl: runtimeUrl.toString(),
    migrationUrl: migrationUrl.toString(),
    runtimeUrlConfigured: true,
    migrationUrlConfigured: true,
  }
}

function parseSanity(
  appEnv: AppEnv,
  environment: EnvironmentVariables
): EnvironmentProfile["sanity"] {
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

function parseMail(
  appEnv: AppEnv,
  environment: EnvironmentVariables
): EnvironmentProfile["mail"] {
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

function parseDeployment(
  appEnv: AppEnv,
  environment: EnvironmentVariables
): EnvironmentProfile["deployment"] {
  const owner = enumValue(
    environment,
    "DEPLOYMENT_OWNER",
    DEPLOYMENT_OWNER_VALUES
  )
  const secretNamespace = safeMetadata(environment, "SECRET_NAMESPACE")

  const validNamespace =
    appEnv === "local"
      ? secretNamespace === "local" || secretNamespace === "ci"
      : secretNamespace === appEnv
  if (!validNamespace) {
    throw new EnvironmentProfileError(
      "secret_namespace_mismatch",
      `${appEnv} cannot use this secret namespace`,
      "SECRET_NAMESPACE"
    )
  }

  const localOwnerAllowed = owner === "local" || owner === "github"
  const deployedOwnerAllowed = owner === "github" || owner === "vercel"
  if ((appEnv === "local" || appEnv === "development") && !localOwnerAllowed) {
    throw new EnvironmentProfileError(
      "invalid_value",
      `${appEnv} requires a local or GitHub-owned environment`,
      "DEPLOYMENT_OWNER"
    )
  }
  if (
    (appEnv === "preview" || appEnv === "production") &&
    !deployedOwnerAllowed
  ) {
    throw new EnvironmentProfileError(
      "invalid_value",
      `${appEnv} cannot be owned by a local process`,
      "DEPLOYMENT_OWNER"
    )
  }

  return { owner, secretNamespace }
}

function operationsFor(
  appEnv: AppEnv,
  sanityWritePolicy: SanityWritePolicy
): EnvironmentOperations {
  return {
    canMigrate: true,
    canSeed: appEnv !== "production",
    canReset: appEnv === "local",
    canPreviewDeploy: appEnv === "preview",
    canProductionDeploy: appEnv === "production",
    canUseSanityRecovery:
      sanityWritePolicy === "local-recovery" ||
      sanityWritePolicy === "production-recovery",
  }
}

export function parseEnvironmentProfile(
  environment: EnvironmentVariables = process.env
): EnvironmentProfile {
  const appEnv = enumValue(environment, "APP_ENV", APP_ENV_VALUES)
  const nodeEnv = enumValue(environment, "NODE_ENV", NODE_ENV_VALUES)
  const betterAuthUrl = parseOrigin(required(environment, "BETTER_AUTH_URL"))
  const betterAuthSecret = required(environment, "BETTER_AUTH_SECRET")

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

  assertProfileOrigin(appEnv, betterAuthUrl)

  const database = parseDatabase(appEnv, environment)
  const sanity = parseSanity(appEnv, environment)
  const mail = parseMail(appEnv, environment)
  const deployment = parseDeployment(appEnv, environment)

  return {
    appEnv,
    nodeEnv,
    betterAuth: {
      url: betterAuthUrl.origin,
      secret: betterAuthSecret,
    },
    database,
    sanity,
    mail,
    deployment,
    operations: operationsFor(appEnv, sanity.writePolicy),
  }
}

export function inspectEnvironment(
  profile: EnvironmentProfile
): RedactedEnvironmentInspection {
  return {
    appEnv: profile.appEnv,
    nodeEnv: profile.nodeEnv,
    origin: profile.betterAuth.url,
    database: {
      provider: profile.database.provider,
      ...(profile.database.projectId
        ? { projectId: profile.database.projectId }
        : {}),
      ...(profile.database.branch ? { branch: profile.database.branch } : {}),
      runtimeRole: profile.database.runtimeRole,
      migrationRole: profile.database.migrationRole,
      runtimeUrlConfigured: profile.database.runtimeUrlConfigured,
      migrationUrlConfigured: profile.database.migrationUrlConfigured,
    },
    sanity: {
      projectId: profile.sanity.projectId,
      dataset: profile.sanity.dataset,
      apiVersion: profile.sanity.apiVersion,
      writePolicy: profile.sanity.writePolicy,
      revalidateSecretConfigured: profile.sanity.revalidateSecret !== undefined,
      manualRecoverySecretConfigured:
        profile.sanity.manualRecoverySecret !== undefined,
    },
    mail: { ...profile.mail },
    deployment: { ...profile.deployment },
    secrets: {
      betterAuth: profile.betterAuth.secret.length > 0,
      sanityRevalidate: profile.sanity.revalidateSecret !== undefined,
      sanityManualRecovery: profile.sanity.manualRecoverySecret !== undefined,
      mailProvider: profile.mail.provider !== undefined,
    },
    operations: { ...profile.operations },
  }
}

function argumentValue(
  args: readonly string[],
  index: number,
  option: string,
  pattern: RegExp
): [string, number] {
  const value = args[index + 1]?.trim()
  if (!value || value.startsWith("--")) {
    throw new EnvironmentProfileError(
      "missing_argument",
      `${option} requires a value`,
      option
    )
  }

  return [validateDeliveryValue(value, option, pattern), index + 1]
}

function validateDeliveryValue(
  value: string,
  option: string,
  pattern: RegExp
): string {
  const refSegments = value.split("/")
  const invalidRefSegment =
    pattern === DELIVERY_REF_PATTERN &&
    refSegments.some(
      (segment) =>
        segment.startsWith(".") || segment.endsWith(".") || segment === "@"
    )
  if (
    value.length > 256 ||
    !pattern.test(value) ||
    value.includes("..") ||
    value.includes("@{") ||
    value.endsWith(".") ||
    value.endsWith("/") ||
    value.includes("//") ||
    invalidRefSegment
  ) {
    throw new EnvironmentProfileError(
      "invalid_argument",
      `${option} must be a bounded safe identifier`,
      option
    )
  }

  return value
}

export function parseDeliveryArguments(
  args: readonly string[]
): DeliveryArguments {
  const command = args[0]
  if (command !== "preview" && command !== "production") {
    throw new EnvironmentProfileError(
      "invalid_argument",
      "delivery command must be preview or production"
    )
  }

  let ref: string | undefined
  let previewId: string | undefined
  for (let index = 1; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === "--ref") {
      if (ref) {
        throw new EnvironmentProfileError(
          "invalid_argument",
          "--ref may be supplied only once",
          "--ref"
        )
      }
      const [value, nextIndex] = argumentValue(
        args,
        index,
        "--ref",
        DELIVERY_REF_PATTERN
      )
      ref = value
      index = nextIndex
      continue
    }
    if (argument.startsWith("--ref=")) {
      if (ref || !argument.slice("--ref=".length).trim()) {
        throw new EnvironmentProfileError(
          "invalid_argument",
          "--ref must have one non-empty value",
          "--ref"
        )
      }
      ref = validateDeliveryValue(
        argument.slice("--ref=".length).trim(),
        "--ref",
        DELIVERY_REF_PATTERN
      )
      continue
    }
    if (argument === "--preview-id") {
      if (previewId) {
        throw new EnvironmentProfileError(
          "invalid_argument",
          "--preview-id may be supplied only once",
          "--preview-id"
        )
      }
      const [value, nextIndex] = argumentValue(
        args,
        index,
        "--preview-id",
        PREVIEW_ID_PATTERN
      )
      previewId = value
      index = nextIndex
      continue
    }
    if (argument.startsWith("--preview-id=")) {
      if (previewId || !argument.slice("--preview-id=".length).trim()) {
        throw new EnvironmentProfileError(
          "invalid_argument",
          "--preview-id must have one non-empty value",
          "--preview-id"
        )
      }
      previewId = validateDeliveryValue(
        argument.slice("--preview-id=".length).trim(),
        "--preview-id",
        PREVIEW_ID_PATTERN
      )
      continue
    }

    throw new EnvironmentProfileError(
      "unexpected_argument",
      "unsupported delivery argument",
      argument.startsWith("--") ? argument.split("=", 1)[0] : undefined
    )
  }

  if (!ref) {
    throw new EnvironmentProfileError(
      "missing_argument",
      "--ref is required",
      "--ref"
    )
  }
  if (MUTABLE_REFS.has(ref.toLowerCase())) {
    throw new EnvironmentProfileError(
      "invalid_argument",
      "delivery refs must not use a mutable alias",
      "--ref"
    )
  }
  if (command === "preview" && !previewId) {
    throw new EnvironmentProfileError(
      "missing_argument",
      "Preview delivery requires --preview-id",
      "--preview-id"
    )
  }
  if (command === "production" && previewId) {
    throw new EnvironmentProfileError(
      "unexpected_argument",
      "Production delivery does not accept --preview-id",
      "--preview-id"
    )
  }

  return {
    command,
    ref,
    ...(previewId ? { previewId } : {}),
  }
}
