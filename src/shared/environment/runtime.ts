import {
  APP_ENV_VALUES,
  DATABASE_PROVIDER_VALUES,
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
  type EnvironmentVariables,
  type MailPolicy,
  type SanityPolicy,
} from "./rules"
import {
  parseEditorialPreview,
  type EditorialPreview,
} from "../../sanity/preview-config"

/** Safe target identity: no URL, credential or secret. */
export interface RuntimeTarget {
  readonly provider: DatabaseProvider
  readonly projectId?: string
  readonly branch?: string
  readonly role: "direct" | "pooled"
  /** Delivery-observed endpoint the runtime URL was checked against. */
  readonly endpointHost?: string
}

export type RuntimeEnvironment =
  | {
      /** Local developer loop without APP_ENV; refused on hosted deployments. */
      readonly profile: "unprofiled"
      /** Runtime connection string; never include it in diagnostics. */
      readonly databaseUrl: string
      readonly auth: { readonly baseUrl?: string; readonly secret?: string }
      /** Unprofiled runs cannot enable editorial preview. */
      readonly editorialPreview: EditorialPreview
    }
  | {
      readonly profile: AppEnv
      /** Runtime connection string; never include it in diagnostics. */
      readonly databaseUrl: string
      readonly auth: { readonly baseUrl: string; readonly secret: string }
      readonly target: RuntimeTarget
      readonly sanity: SanityPolicy
      /** Holds the Viewer token when enabled; never include it in diagnostics. */
      readonly editorialPreview: EditorialPreview
      readonly mail: MailPolicy
    }

const ENDPOINT_HOST_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9-]+)+$/

/**
 * Application-side counterpart of the operator profile parser (TD-035). It
 * needs only the pooled runtime URL, never DATABASE_URL_UNPOOLED or provider
 * administration credentials, and performs no I/O. Callers run it before
 * constructing a database, auth or CMS client.
 */
export function parseRuntimeEnvironment(
  environment: EnvironmentVariables = process.env
): RuntimeEnvironment {
  if (optional(environment, "APP_ENV") === undefined) {
    return parseUnprofiled(environment)
  }
  const appEnv = enumValue(environment, "APP_ENV", APP_ENV_VALUES)
  // Next owns NODE_ENV during `next build`; the running server is checked.
  if (environment.NEXT_PHASE !== "phase-production-build") {
    assertNodeEnvironment(
      appEnv,
      enumValue(environment, "NODE_ENV", NODE_ENV_VALUES)
    )
  }
  const origin = parseOrigin(
    optional(environment, "BETTER_AUTH_URL") ??
      assignedPreviewOrigin(appEnv, environment)
  )
  assertProfileOrigin(appEnv, origin)
  const secret = required(environment, "BETTER_AUTH_SECRET")
  const { databaseUrl, target } = parseRuntimeDatabase(appEnv, environment)
  const sanity = parseSanityPolicy(appEnv, environment)
  const editorialPreview = parseEditorialPreview(appEnv, environment)
  const mail = parseMailPolicy(appEnv, environment)
  if (appEnv === "production") assertProductionMail(environment)
  return {
    profile: appEnv,
    databaseUrl,
    auth: { baseUrl: origin.origin, secret },
    target,
    sanity,
    editorialPreview,
    mail,
  }
}

/** Vercel assigns each Preview deployment its own origin. */
function assignedPreviewOrigin(
  appEnv: AppEnv,
  environment: EnvironmentVariables
): string {
  const assigned =
    appEnv === "preview" ? optional(environment, "VERCEL_URL") : undefined
  return assigned
    ? `https://${assigned}`
    : required(environment, "BETTER_AUTH_URL")
}

function parseUnprofiled(
  environment: EnvironmentVariables
): RuntimeEnvironment {
  if (environment.VERCEL === "1") {
    throw new EnvironmentProfileError(
      "missing_variable",
      "hosted deployments must declare APP_ENV",
      "APP_ENV"
    )
  }
  const databaseUrl = required(environment, "DATABASE_URL")
  const configuredUrl = optional(environment, "BETTER_AUTH_URL")
  const secret = optional(environment, "BETTER_AUTH_SECRET")
  if (environment.NODE_ENV === "production" && !secret) {
    throw new EnvironmentProfileError(
      "missing_variable",
      "BETTER_AUTH_SECRET is required in production",
      "BETTER_AUTH_SECRET"
    )
  }
  return {
    profile: "unprofiled",
    databaseUrl,
    auth: {
      ...(configuredUrl ? { baseUrl: parseOrigin(configuredUrl).origin } : {}),
      ...(secret ? { secret } : {}),
    },
    editorialPreview: parseEditorialPreview("unprofiled", environment),
  }
}

function parseRuntimeDatabase(
  appEnv: AppEnv,
  environment: EnvironmentVariables
): { databaseUrl: string; target: RuntimeTarget } {
  const provider = enumValue(
    environment,
    "DATABASE_PROVIDER",
    DATABASE_PROVIDER_VALUES
  )
  const expected = expectedDatabaseProvider(appEnv)
  if (provider !== expected) {
    throw new EnvironmentProfileError(
      "database_target_mismatch",
      `${appEnv} requires the ${expected} database provider`,
      "DATABASE_PROVIDER"
    )
  }
  const url = parseDatabaseUrl(
    required(environment, "DATABASE_URL"),
    "DATABASE_URL"
  )
  const endpointHost = parseEndpointHost(environment)

  if (provider === "local-postgres") {
    if (!isLoopback(url.hostname)) {
      throw new EnvironmentProfileError(
        "database_target_mismatch",
        "local-postgres requires a loopback database URL",
        "DATABASE_URL"
      )
    }
    const remoteIdentity = (
      [
        "DATABASE_PROJECT_ID",
        "DATABASE_BRANCH",
        "DATABASE_ENDPOINT_HOST",
      ] as const
    ).find((variable) => optional(environment, variable))
    if (remoteIdentity) {
      throw new EnvironmentProfileError(
        "database_target_mismatch",
        "local-postgres cannot carry a remote database identity",
        remoteIdentity
      )
    }
    return {
      databaseUrl: url.toString(),
      target: { provider, role: "direct" },
    }
  }

  const projectId = safeMetadata(environment, "DATABASE_PROJECT_ID")
  const branch = safeMetadata(environment, "DATABASE_BRANCH")
  if (isLoopback(url.hostname)) {
    throw new EnvironmentProfileError(
      "database_target_mismatch",
      "neon requires a non-loopback database URL",
      "DATABASE_URL"
    )
  }
  if (!looksPooled(url)) {
    throw new EnvironmentProfileError(
      "database_role_mismatch",
      "the Neon runtime must use the pooled DATABASE_URL, not a direct migration URL",
      "DATABASE_URL"
    )
  }
  assertNonDefaultBranch(appEnv, branch)
  // Deployed profiles always receive the delivery-observed endpoint (T-26.10).
  if ((appEnv === "preview" || appEnv === "production") && !endpointHost) {
    throw new EnvironmentProfileError(
      "missing_variable",
      `${appEnv} requires the delivery-observed DATABASE_ENDPOINT_HOST`,
      "DATABASE_ENDPOINT_HOST"
    )
  }
  // A branch label is not proof of the target; the delivery-observed endpoint is.
  if (endpointHost && directHost(url.hostname) !== endpointHost) {
    throw new EnvironmentProfileError(
      "database_target_mismatch",
      "DATABASE_URL does not point at the delivery-observed database endpoint",
      "DATABASE_URL"
    )
  }
  return {
    databaseUrl: url.toString(),
    target: {
      provider,
      projectId,
      branch,
      role: "pooled",
      ...(endpointHost ? { endpointHost } : {}),
    },
  }
}

function parseEndpointHost(
  environment: EnvironmentVariables
): string | undefined {
  const value = optional(environment, "DATABASE_ENDPOINT_HOST")?.toLowerCase()
  if (
    value !== undefined &&
    (value.length > 253 || !ENDPOINT_HOST_PATTERN.test(value))
  ) {
    throw new EnvironmentProfileError(
      "invalid_value",
      "DATABASE_ENDPOINT_HOST must be a database endpoint host name",
      "DATABASE_ENDPOINT_HOST"
    )
  }
  return value
}

/** Neon's pooled host is the endpoint host with `-pooler` on its first label. */
function directHost(hostname: string): string {
  const [first, ...rest] = hostname.toLowerCase().split(".")
  return [first.replace(/-pooler$/, ""), ...rest].join(".")
}
