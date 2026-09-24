import {
  APP_ENV_VALUES,
  DATABASE_PROVIDER_VALUES,
  DEPLOYMENT_OWNER_VALUES,
  EnvironmentProfileError,
  NODE_ENV_VALUES,
  assertNodeEnvironment,
  assertNonDefaultBranch,
  assertProductionMail,
  assertProfileOrigin,
  enumValue,
  expectedDatabaseProvider,
  isLoopback,
  looksPooled,
  optional,
  parseDatabaseUrl,
  parseMailPolicy,
  parseOrigin,
  parseSanityPolicy,
  required,
  safeMetadata,
  type AppEnv,
  type DatabaseProvider,
  type DeploymentOwner,
  type EnvironmentVariables,
  type MailPolicy,
  type NodeEnv,
  type SanityPolicy,
  type SanityWritePolicy,
} from "../../src/shared/environment/rules"
import {
  parseEditorialPreview,
  type EditorialPreview,
} from "../../src/sanity/preview-config"

// Operator tooling keeps its historical import surface.
export {
  APP_ENV_VALUES,
  DATABASE_PROVIDER_VALUES,
  DEPLOYMENT_OWNER_VALUES,
  EnvironmentProfileError,
  MAIL_TRANSPORT_VALUES,
  NODE_ENV_VALUES,
  SANITY_WRITE_POLICY_VALUES,
  type AppEnv,
  type DatabaseProvider,
  type DeploymentOwner,
  type EnvironmentProfileErrorCode,
  type EnvironmentVariables,
  type MailTransport,
  type NodeEnv,
  type SanityWritePolicy,
} from "../../src/shared/environment/rules"

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
  readonly sanity: SanityPolicy
  /** Holds the Viewer token when enabled; never include it in diagnostics. */
  readonly editorialPreview: EditorialPreview
  readonly mail: MailPolicy
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
    readonly editorialPreviewEnabled: boolean
  }
  readonly mail: EnvironmentProfile["mail"]
  readonly deployment: EnvironmentProfile["deployment"]
  readonly secrets: {
    readonly betterAuth: boolean
    readonly sanityRevalidate: boolean
    readonly sanityManualRecovery: boolean
    readonly sanityViewer: boolean
    readonly mailProvider: boolean
  }
  readonly operations: EnvironmentOperations
}

const MUTABLE_REFS = new Set(["head", "latest", "main", "master"])
const DELIVERY_REF_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/+@-]*$/
const PREVIEW_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

export type DeliveryCommand = "preview" | "production"

export interface DeliveryArguments {
  readonly command: DeliveryCommand
  readonly ref: string
  readonly previewId?: string
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
  const expectedProvider = expectedDatabaseProvider(appEnv)
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

  assertNonDefaultBranch(appEnv, branch)

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

  assertNodeEnvironment(appEnv, nodeEnv)

  assertProfileOrigin(appEnv, betterAuthUrl)

  const database = parseDatabase(appEnv, environment)
  const sanity = parseSanityPolicy(appEnv, environment)
  const editorialPreview = parseEditorialPreview(appEnv, environment)
  const mail = parseMailPolicy(appEnv, environment)
  const deployment = parseDeployment(appEnv, environment)
  if (appEnv === "production") assertProductionMail(environment)

  return {
    appEnv,
    nodeEnv,
    betterAuth: {
      url: betterAuthUrl.origin,
      secret: betterAuthSecret,
    },
    database,
    sanity,
    editorialPreview,
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
      editorialPreviewEnabled: profile.editorialPreview.enabled,
    },
    mail: { ...profile.mail },
    deployment: { ...profile.deployment },
    secrets: {
      betterAuth: profile.betterAuth.secret.length > 0,
      sanityRevalidate: profile.sanity.revalidateSecret !== undefined,
      sanityManualRecovery: profile.sanity.manualRecoverySecret !== undefined,
      sanityViewer: profile.editorialPreview.enabled,
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
