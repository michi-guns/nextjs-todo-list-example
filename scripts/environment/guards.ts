import { URL } from "node:url"

import type { AppEnv, DatabaseProvider, EnvironmentProfile } from "./core"

export type DatabaseConnectionRole = "direct" | "pooled"

export type DeliveryRefKind = "branch" | "tag" | "commit"

export type DatabaseTargetOwnership = "harness" | "developer" | "provider"

export type EnvironmentGuardOperation =
  | "local-reset"
  | "migration"
  | "seed-replacement"
  | "preview-cleanup"
  | "preview-deployment"
  | "production-deployment"

export type EnvironmentGuardErrorCode =
  | "target_unresolved"
  | "target_mismatch"
  | "operation_forbidden"
  | "connection_role_mismatch"
  | "invalid_connection"
  | "ref_unresolved"
  | "ref_invalid"
  | "approval_required"
  | "approval_mismatch"

export class EnvironmentGuardError extends Error {
  readonly code: EnvironmentGuardErrorCode
  readonly operation?: EnvironmentGuardOperation
  readonly field?: string

  constructor(
    code: EnvironmentGuardErrorCode,
    message: string,
    operation?: EnvironmentGuardOperation,
    field?: string
  ) {
    super(message)
    this.name = "EnvironmentGuardError"
    this.code = code
    this.operation = operation
    this.field = field
  }
}

export interface DatabaseTargetIdentity {
  readonly provider: DatabaseProvider
  /** Required for Neon; forbidden for Local. */
  readonly projectId?: string
  /** Required for Neon; forbidden for Local. */
  readonly branch?: string
  /** Required for Local and for Neon operation guards. */
  readonly host?: string
  /** Optional endpoint metadata used to correlate a connection observation. */
  readonly port?: number
  /** Optional database name used to correlate a connection observation. */
  readonly database?: string
  /** Required as `harness` before a Local reset. */
  readonly ownership?: DatabaseTargetOwnership
}

export type ClassifiedDatabaseTarget =
  | {
      readonly provider: "local-postgres"
      readonly kind: "local"
      readonly host: string
    }
  | {
      readonly provider: "neon"
      readonly kind: "neon"
      readonly projectId: string
      readonly branch: string
      readonly host?: string
    }

export interface DatabaseConnectionTargetIdentity extends DatabaseTargetIdentity {
  readonly host: string
}

export interface DatabaseConnectionObservation {
  readonly target: DatabaseConnectionTargetIdentity
  readonly role: DatabaseConnectionRole
  /** Sensitive connection value; it is never copied into guard evidence. */
  readonly url: string
}

export interface ResolvedDeliveryRef {
  readonly requestedRef: string
  readonly commitSha: string
  /** Set by the ref resolver; guards never infer tag/branch identity from spelling. */
  readonly kind: DeliveryRefKind
}

export interface PreviewCleanupIdentity {
  readonly previewId: string
  readonly projectId: string
  readonly branch: string
}

export interface ProductionApproval {
  readonly environment: "production"
  readonly commitSha: string
  readonly approved: boolean
}

export interface EnvironmentGuardInput {
  readonly profile: EnvironmentProfile
  readonly target: DatabaseTargetIdentity
  readonly connection?: DatabaseConnectionObservation
  /** Workflow input; it must equal the provider-created Preview identity. */
  readonly requestedPreviewId?: string
  readonly preview?: PreviewCleanupIdentity
  readonly resolvedRef?: ResolvedDeliveryRef
  readonly approval?: ProductionApproval
}

export interface RedactedEnvironmentEvidence {
  readonly operation: EnvironmentGuardOperation
  readonly appEnv: AppEnv
  readonly database: {
    readonly provider: DatabaseProvider
    readonly projectId?: string
    readonly branch?: string
    readonly role?: DatabaseConnectionRole
  }
  readonly preview?: {
    readonly previewId: string
    readonly projectId: string
    readonly branch: string
  }
  readonly ref?: ResolvedDeliveryRef
}

const POSTGRES_PROTOCOLS = new Set(["postgres:", "postgresql:"])
const ENDPOINT_OVERRIDE_PARAMETERS = new Set([
  "host",
  "hostaddr",
  "port",
  "database",
  "dbname",
])
const SAFE_METADATA_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/
const SAFE_REF_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/+@-]*$/
const SAFE_PREVIEW_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/
const SAFE_DATABASE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,62}$/
const COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/i
const SAFE_METADATA_GUIDANCE =
  "1-128 characters: start with a letter or number, then use only letters, numbers, '.', '_', '-' or '/'"
const PREVIEW_ID_GUIDANCE =
  "use 1-128 characters: start with a letter or number, then use only letters, numbers, '.', '_' or '-'"
const MUTABLE_REFS = new Set(["head", "latest", "main", "master"])
const TARGET_OWNERSHIP_VALUES = new Set<DatabaseTargetOwnership>([
  "harness",
  "developer",
  "provider",
])

function fail(
  code: EnvironmentGuardErrorCode,
  message: string,
  operation?: EnvironmentGuardOperation,
  field?: string
): never {
  throw new EnvironmentGuardError(code, message, operation, field)
}

function isLoopback(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "")
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1"
  )
}

function safeMetadata(value: string | undefined, field: string): string {
  if (
    typeof value !== "string" ||
    !value ||
    value.trim() !== value ||
    value.length > 128 ||
    !SAFE_METADATA_PATTERN.test(value)
  ) {
    fail(
      "target_unresolved",
      `provide a provider-observed ${field}; ${SAFE_METADATA_GUIDANCE}`,
      undefined,
      field
    )
  }

  return value
}

function normalizeHost(value: string | undefined): string {
  if (typeof value !== "string" || !value || value.trim() !== value) {
    fail(
      "target_unresolved",
      "provide the provider-observed endpoint host",
      undefined,
      "host"
    )
  }

  const normalized = value.toLowerCase().replace(/^\[|\]$/g, "")
  if (
    normalized.length > 253 ||
    !/^[A-Za-z0-9.:-]+$/.test(normalized) ||
    normalized.includes("..")
  ) {
    fail(
      "target_unresolved",
      "provide a valid provider-observed endpoint host",
      undefined,
      "host"
    )
  }

  return normalized
}

function validateTargetEndpointMetadata(target: DatabaseTargetIdentity): void {
  if (
    target.port !== undefined &&
    (!Number.isInteger(target.port) || target.port < 1 || target.port > 65535)
  ) {
    fail(
      "target_unresolved",
      "provide a valid port from the provider-observed endpoint",
      undefined,
      "port"
    )
  }

  if (
    target.database !== undefined &&
    (typeof target.database !== "string" ||
      target.database.trim() !== target.database ||
      !SAFE_DATABASE_NAME_PATTERN.test(target.database))
  ) {
    fail(
      "target_unresolved",
      "provide a valid database name from the provider-observed endpoint",
      undefined,
      "database"
    )
  }

  if (
    target.ownership !== undefined &&
    !TARGET_OWNERSHIP_VALUES.has(target.ownership)
  ) {
    fail(
      "target_unresolved",
      "provide a supported target ownership value",
      undefined,
      "ownership"
    )
  }
}

/**
 * Classifies an observed target using provider identity, not a friendly label.
 * A Neon branch without its project identity is intentionally unresolved.
 */
export function classifyDatabaseTarget(
  target: DatabaseTargetIdentity
): ClassifiedDatabaseTarget {
  if (!target || typeof target !== "object") {
    fail(
      "target_unresolved",
      "provide a provider-observed database target identity"
    )
  }

  validateTargetEndpointMetadata(target)

  if (target.provider === "local-postgres") {
    if (target.projectId !== undefined || target.branch !== undefined) {
      fail(
        "target_mismatch",
        "remove remote project/branch fields and supply the Local loopback target"
      )
    }

    const host = normalizeHost(target.host)
    if (!isLoopback(host)) {
      fail(
        "target_mismatch",
        "use the harness-owned loopback PostgreSQL target for Local operations"
      )
    }

    return { provider: "local-postgres", kind: "local", host }
  }

  if (target.provider === "neon") {
    const host = target.host ? normalizeHost(target.host) : undefined
    if (host && isLoopback(host)) {
      fail("target_mismatch", "use the selected non-loopback Neon endpoint")
    }

    return {
      provider: "neon",
      kind: "neon",
      projectId: safeMetadata(target.projectId, "projectId"),
      branch: safeMetadata(target.branch, "branch"),
      ...(host ? { host } : {}),
    }
  }

  fail(
    "target_unresolved",
    "provide a supported provider-observed database target identity",
    undefined,
    "provider"
  )
}

function classifyProfileTarget(
  input: EnvironmentGuardInput,
  operation: EnvironmentGuardOperation
): ClassifiedDatabaseTarget {
  let actual: ClassifiedDatabaseTarget
  try {
    actual = classifyDatabaseTarget(input.target)
  } catch (error) {
    if (error instanceof EnvironmentGuardError) {
      throw new EnvironmentGuardError(
        error.code,
        error.message,
        operation,
        error.field
      )
    }
    throw error
  }

  const expected = input.profile.database
  if (actual.provider !== expected.provider) {
    fail(
      "target_mismatch",
      "select the database provider configured for APP_ENV",
      operation
    )
  }

  if (actual.kind === "neon") {
    if (
      actual.projectId !== expected.projectId ||
      actual.branch !== expected.branch
    ) {
      fail(
        "target_mismatch",
        "select the provider project and branch configured for APP_ENV",
        operation
      )
    }
  }

  if (actual.kind === "local" && expected.projectId !== undefined) {
    fail(
      "target_mismatch",
      "reload a Local profile without remote project/branch identity",
      operation
    )
  }

  if (actual.kind === "neon" && !actual.host) {
    fail(
      "target_unresolved",
      "provide the provider-observed Neon endpoint host before database mutation",
      operation,
      "host"
    )
  }

  const targetHost = actual.host
  if (!targetHost) {
    fail(
      "target_unresolved",
      "provide the provider-observed database endpoint host before mutation",
      operation,
      "host"
    )
  }
  const expectedMigrationUrl = parseConnectionUrl(
    {
      target: { ...input.target, host: targetHost },
      role: "direct",
      url: input.profile.database.migrationUrl,
    },
    operation
  )
  if (
    !equivalentHosts(
      targetHost,
      normalizeHost(expectedMigrationUrl.hostname)
    ) ||
    (input.target.port !== undefined &&
      input.target.port !== effectivePort(expectedMigrationUrl)) ||
    (input.target.database !== undefined &&
      `/${input.target.database}` !== expectedMigrationUrl.pathname)
  ) {
    fail(
      "target_mismatch",
      "selected database endpoint does not match the profile migration target; use the provider-observed DATABASE_URL_UNPOOLED endpoint",
      operation,
      "host"
    )
  }

  return actual
}

function parseConnectionUrl(
  connection: DatabaseConnectionObservation,
  operation: EnvironmentGuardOperation
): URL {
  let parsed: URL
  try {
    parsed = new URL(connection.url)
  } catch {
    fail(
      "invalid_connection",
      "use a valid PostgreSQL connection URL for the selected target",
      operation,
      "url"
    )
  }

  if (!POSTGRES_PROTOCOLS.has(parsed.protocol) || !parsed.hostname) {
    fail(
      "invalid_connection",
      "use a PostgreSQL connection URL for the selected target",
      operation,
      "url"
    )
  }

  const endpointOverride = [...parsed.searchParams.keys()].find((key) =>
    ENDPOINT_OVERRIDE_PARAMETERS.has(key.toLowerCase())
  )
  if (endpointOverride) {
    fail(
      "invalid_connection",
      `remove the ${endpointOverride} query parameter; keep the target endpoint in the PostgreSQL URL authority and path`,
      operation,
      "url"
    )
  }

  if (!parsed.port) {
    fail(
      "invalid_connection",
      "include an explicit port in the PostgreSQL URL to prevent PGPORT fallback",
      operation,
      "url"
    )
  }
  if (!parsed.pathname || parsed.pathname === "/") {
    fail(
      "invalid_connection",
      "include an explicit database path in the PostgreSQL URL to prevent PGDATABASE fallback",
      operation,
      "url"
    )
  }

  return parsed
}

function effectivePort(url: URL): number {
  return url.port ? Number(url.port) : 5432
}

function equivalentHosts(left: string, right: string): boolean {
  return left === right || (isLoopback(left) && isLoopback(right))
}

function looksPooled(hostname: string): boolean {
  return /(^|[-.])pooler([-.]|$)/i.test(hostname)
}

function assertDirectConnection(
  input: EnvironmentGuardInput,
  operation: EnvironmentGuardOperation,
  target: ClassifiedDatabaseTarget
): void {
  const connection = input.connection
  if (!connection) {
    fail(
      "target_unresolved",
      "provide an observed direct PostgreSQL connection with its endpoint host before mutation",
      operation,
      "connection"
    )
  }

  const connectionTarget = classifyProfileTarget(
    { ...input, target: connection.target },
    operation
  )
  if (
    connectionTarget.provider !== target.provider ||
    (connectionTarget.kind === "neon" &&
      target.kind === "neon" &&
      (connectionTarget.projectId !== target.projectId ||
        connectionTarget.branch !== target.branch))
  ) {
    fail(
      "target_mismatch",
      "select the same provider project and branch for the connection and operation",
      operation
    )
  }

  const observedTargetHost = normalizeHost(connection.target.host)
  if (target.host && !equivalentHosts(target.host, observedTargetHost)) {
    fail(
      "target_mismatch",
      "connection target host does not match the selected target; use the provider-observed endpoint",
      operation,
      "host"
    )
  }

  if (
    input.target.port !== undefined &&
    connection.target.port !== input.target.port
  ) {
    fail(
      "target_mismatch",
      "connection target port does not match the selected target; use the provider-observed endpoint",
      operation,
      "port"
    )
  }
  if (
    input.target.database !== undefined &&
    connection.target.database !== input.target.database
  ) {
    fail(
      "target_mismatch",
      "connection target database does not match the selected target; use the provider-observed endpoint",
      operation,
      "database"
    )
  }

  if (connection.role !== "direct") {
    fail(
      "connection_role_mismatch",
      "use DATABASE_URL_UNPOOLED, the direct database connection, for this operation",
      operation,
      "role"
    )
  }

  const parsed = parseConnectionUrl(connection, operation)
  const connectionHost = normalizeHost(parsed.hostname)
  if (target.kind === "local" && !isLoopback(connectionHost)) {
    fail(
      "target_mismatch",
      "Local operations require a loopback database connection; use the configured Local target",
      operation
    )
  }
  if (
    target.kind === "neon" &&
    (isLoopback(parsed.hostname) || looksPooled(parsed.hostname))
  ) {
    fail(
      "connection_role_mismatch",
      "use the direct non-pooled Neon endpoint from DATABASE_URL_UNPOOLED",
      operation,
      "url"
    )
  }

  if (!equivalentHosts(observedTargetHost, connectionHost)) {
    fail(
      "target_mismatch",
      "connection host does not match the observed target; use the provider-observed endpoint",
      operation,
      "host"
    )
  }

  if (
    connection.target.port !== undefined &&
    connection.target.port !== effectivePort(parsed)
  ) {
    fail(
      "target_mismatch",
      "connection port does not match the observed target; use the provider-observed endpoint",
      operation,
      "port"
    )
  }
  if (
    connection.target.database !== undefined &&
    `/${connection.target.database}` !== parsed.pathname
  ) {
    fail(
      "target_mismatch",
      "connection database does not match the observed target; use the provider-observed endpoint",
      operation,
      "database"
    )
  }

  const expectedMigrationUrl = parseConnectionUrl(
    {
      target: connection.target,
      role: "direct",
      url: input.profile.database.migrationUrl,
    },
    operation
  )
  if (
    !equivalentHosts(
      connectionHost,
      normalizeHost(expectedMigrationUrl.hostname)
    ) ||
    effectivePort(parsed) !== effectivePort(expectedMigrationUrl) ||
    parsed.pathname !== expectedMigrationUrl.pathname
  ) {
    fail(
      "target_mismatch",
      "connection endpoint does not match the profile migration target; use DATABASE_URL_UNPOOLED",
      operation,
      "url"
    )
  }
}

function assertProfileDatabaseRoles(
  profile: EnvironmentProfile,
  operation: EnvironmentGuardOperation
): void {
  const expectedProvider =
    profile.appEnv === "local" ? "local-postgres" : "neon"
  const expectedRuntimeRole =
    profile.database.provider === "neon" ? "pooled" : "direct"
  if (
    profile.database.provider !== expectedProvider ||
    profile.database.runtimeRole !== expectedRuntimeRole ||
    profile.database.migrationRole !== "direct"
  ) {
    fail(
      "connection_role_mismatch",
      "the profile database provider or roles do not satisfy APP_ENV; reload a validated profile",
      operation,
      "database"
    )
  }
}

function assertOperation(
  profile: EnvironmentProfile,
  operation: EnvironmentGuardOperation,
  allowed: boolean,
  requiredAppEnv?: AppEnv
): void {
  const environmentAllows =
    operation === "migration" ||
    (operation === "local-reset" && profile.appEnv === "local") ||
    (operation === "seed-replacement" && profile.appEnv !== "production") ||
    (operation === "preview-cleanup" && profile.appEnv === "preview") ||
    (operation === "preview-deployment" && profile.appEnv === "preview") ||
    (operation === "production-deployment" && profile.appEnv === "production")

  if (!environmentAllows) {
    const expected =
      requiredAppEnv ??
      (operation === "seed-replacement" ? "non-production" : undefined)
    fail(
      "operation_forbidden",
      `${operation} requires ${expected ? `APP_ENV=${expected}` : "a compatible APP_ENV"}; select the matching profile`,
      operation,
      "APP_ENV"
    )
  }
  if (!allowed) {
    fail(
      "operation_forbidden",
      `${operation} is not permitted; use a profile that explicitly allows it`,
      operation
    )
  }
}

function validateDeliveryRef(
  ref: ResolvedDeliveryRef | undefined,
  operation: EnvironmentGuardOperation
): ResolvedDeliveryRef {
  if (!ref) {
    fail(
      "ref_unresolved",
      "provide a provider-resolved full commit SHA before the operation",
      operation,
      "ref"
    )
  }

  const requestedRef = ref.requestedRef
  if (typeof requestedRef !== "string") {
    fail(
      "ref_unresolved",
      "provide a provider-resolved delivery ref identifier",
      operation,
      "ref"
    )
  }
  const refSegments = requestedRef.split("/")
  const invalidSegment = refSegments.some(
    (segment) =>
      segment.startsWith(".") || segment.endsWith(".") || segment === "@"
  )
  if (
    !requestedRef ||
    requestedRef.trim() !== requestedRef ||
    requestedRef.length > 256 ||
    !SAFE_REF_PATTERN.test(requestedRef) ||
    requestedRef.includes("..") ||
    requestedRef.includes("//") ||
    requestedRef.includes("@{") ||
    invalidSegment ||
    MUTABLE_REFS.has(requestedRef.toLowerCase())
  ) {
    fail(
      "ref_invalid",
      "provide a non-mutable delivery ref; the provider must resolve it to a full 40-character commit SHA",
      operation,
      "ref"
    )
  }

  if (
    typeof ref.kind !== "string" ||
    !ref.kind ||
    !["branch", "tag", "commit"].includes(ref.kind)
  ) {
    fail(
      "ref_unresolved",
      "provide the provider-resolved ref kind (branch, tag, or commit) before the operation",
      operation,
      "kind"
    )
  }

  if (
    typeof ref.commitSha !== "string" ||
    !COMMIT_SHA_PATTERN.test(ref.commitSha)
  ) {
    fail(
      "ref_unresolved",
      "provide the provider-resolved full 40-character commit SHA before the operation",
      operation,
      "commitSha"
    )
  }

  if (
    ref.kind === "commit" &&
    (requestedRef.length !== 40 ||
      !COMMIT_SHA_PATTERN.test(requestedRef) ||
      requestedRef.toLowerCase() !== ref.commitSha.toLowerCase())
  ) {
    fail(
      "ref_invalid",
      "commit delivery refs must use the provider-resolved full commit SHA",
      operation,
      "ref"
    )
  }

  return {
    requestedRef,
    commitSha: ref.commitSha.toLowerCase(),
    kind: ref.kind,
  }
}

function requirePreviewIdentity(
  input: EnvironmentGuardInput,
  operation: EnvironmentGuardOperation,
  target: Extract<ClassifiedDatabaseTarget, { kind: "neon" }>
): PreviewCleanupIdentity {
  const preview = input.preview
  if (!preview || typeof preview !== "object") {
    fail(
      "target_unresolved",
      "provide the provider-created Preview identity before the operation",
      operation,
      "preview"
    )
  }

  const requestedPreviewId = input.requestedPreviewId
  if (
    typeof requestedPreviewId !== "string" ||
    !requestedPreviewId ||
    requestedPreviewId.trim() !== requestedPreviewId ||
    requestedPreviewId.length > 128 ||
    !SAFE_PREVIEW_ID_PATTERN.test(requestedPreviewId)
  ) {
    fail(
      "target_unresolved",
      `provide the workflow Preview ID; ${PREVIEW_ID_GUIDANCE}`,
      operation,
      "requestedPreviewId"
    )
  }

  const previewId = preview.previewId
  if (
    typeof previewId !== "string" ||
    !previewId ||
    previewId.trim() !== previewId ||
    previewId.length > 128 ||
    !SAFE_PREVIEW_ID_PATTERN.test(previewId)
  ) {
    fail(
      "target_unresolved",
      `provide a Preview identity with a safe Preview ID; ${PREVIEW_ID_GUIDANCE}`,
      operation,
      "previewId"
    )
  }

  if (previewId !== requestedPreviewId) {
    fail(
      "target_mismatch",
      "use the provider-created Preview identity whose ID exactly equals the requested Preview ID",
      operation,
      "previewId"
    )
  }

  if (
    preview.projectId !== target.projectId ||
    preview.branch !== target.branch ||
    preview.projectId !== input.profile.database.projectId ||
    preview.branch !== input.profile.database.branch
  ) {
    fail(
      "target_mismatch",
      "provide the Preview identity for the selected project and branch",
      operation
    )
  }

  return {
    previewId,
    projectId: target.projectId,
    branch: target.branch,
  }
}

function assertProductionReleaseProof(
  input: EnvironmentGuardInput,
  operation: EnvironmentGuardOperation
): ResolvedDeliveryRef {
  const ref = validateDeliveryRef(input.resolvedRef, operation)
  if (ref.kind === "branch") {
    fail(
      "ref_invalid",
      "Production delivery requires a provider-resolved tag or full commit ref",
      operation,
      "kind"
    )
  }

  const approval = input.approval
  if (approval?.approved !== true) {
    fail(
      "approval_required",
      "obtain protected Production approval for the resolved commit before migration or deployment",
      operation,
      "approval"
    )
  }
  if (
    approval.environment !== "production" ||
    typeof approval.commitSha !== "string" ||
    !COMMIT_SHA_PATTERN.test(approval.commitSha) ||
    approval.commitSha.toLowerCase() !== ref.commitSha
  ) {
    fail(
      "approval_mismatch",
      "obtain protected Production approval for the resolved commit",
      operation,
      "approval"
    )
  }

  return ref
}

function baseEvidence(
  operation: EnvironmentGuardOperation,
  profile: EnvironmentProfile,
  target: ClassifiedDatabaseTarget,
  role?: DatabaseConnectionRole
): RedactedEnvironmentEvidence {
  return {
    operation,
    appEnv: profile.appEnv,
    database: {
      provider: target.provider,
      ...(target.kind === "neon"
        ? { projectId: target.projectId, branch: target.branch }
        : {}),
      ...(role ? { role } : {}),
    },
  }
}

export function assertLocalResetAllowed(
  input: EnvironmentGuardInput
): RedactedEnvironmentEvidence {
  const operation = "local-reset" as const
  assertOperation(
    input.profile,
    operation,
    input.profile.operations.canReset,
    "local"
  )
  assertProfileDatabaseRoles(input.profile, operation)
  const target = classifyProfileTarget(input, operation)
  if (target.kind !== "local") {
    fail(
      "target_mismatch",
      "Local reset requires a local PostgreSQL target",
      operation
    )
  }
  if (
    input.target.ownership !== undefined &&
    input.connection?.target.ownership !== undefined &&
    input.target.ownership !== input.connection.target.ownership
  ) {
    fail(
      "target_mismatch",
      "selected and connection target ownership must agree; use the harness-owned target observation",
      operation,
      "ownership"
    )
  }
  if (input.target.ownership !== "harness") {
    fail(
      "target_unresolved",
      "the selected Local target must be explicitly harness-owned before reset",
      operation,
      "ownership"
    )
  }
  if (input.connection?.target.ownership !== "harness") {
    fail(
      "target_unresolved",
      "the connection target must be explicitly harness-owned before reset",
      operation,
      "ownership"
    )
  }
  assertDirectConnection(input, operation, target)
  return baseEvidence(operation, input.profile, target, "direct")
}

export function assertMigrationAllowed(
  input: EnvironmentGuardInput
): RedactedEnvironmentEvidence {
  const operation = "migration" as const
  assertOperation(input.profile, operation, input.profile.operations.canMigrate)
  assertProfileDatabaseRoles(input.profile, operation)
  const target = classifyProfileTarget(input, operation)
  assertDirectConnection(input, operation, target)
  const ref =
    input.profile.appEnv === "production"
      ? assertProductionReleaseProof(input, operation)
      : undefined
  return {
    ...baseEvidence(operation, input.profile, target, "direct"),
    ...(ref ? { ref } : {}),
  }
}

export function assertSeedReplacementAllowed(
  input: EnvironmentGuardInput
): RedactedEnvironmentEvidence {
  const operation = "seed-replacement" as const
  assertOperation(
    input.profile,
    operation,
    input.profile.appEnv !== "production" && input.profile.operations.canSeed
  )
  assertProfileDatabaseRoles(input.profile, operation)
  const target = classifyProfileTarget(input, operation)
  assertDirectConnection(input, operation, target)
  return baseEvidence(operation, input.profile, target, "direct")
}

export function assertPreviewCleanupAllowed(
  input: EnvironmentGuardInput
): RedactedEnvironmentEvidence {
  const operation = "preview-cleanup" as const
  assertOperation(
    input.profile,
    operation,
    input.profile.appEnv === "preview",
    "preview"
  )
  assertProfileDatabaseRoles(input.profile, operation)
  const target = classifyProfileTarget(input, operation)
  if (target.kind !== "neon") {
    fail(
      "target_mismatch",
      "Preview cleanup requires the selected Neon branch",
      operation
    )
  }
  const preview = requirePreviewIdentity(input, operation, target)

  return {
    ...baseEvidence(operation, input.profile, target),
    preview: {
      previewId: preview.previewId,
      projectId: target.projectId,
      branch: target.branch,
    },
  }
}

export function assertPreviewDeploymentAllowed(
  input: EnvironmentGuardInput
): RedactedEnvironmentEvidence {
  const operation = "preview-deployment" as const
  assertOperation(
    input.profile,
    operation,
    input.profile.operations.canPreviewDeploy,
    "preview"
  )
  assertProfileDatabaseRoles(input.profile, operation)
  const target = classifyProfileTarget(input, operation)
  if (target.kind !== "neon") {
    fail(
      "target_mismatch",
      "Preview deployment requires a Neon target",
      operation
    )
  }
  const preview = requirePreviewIdentity(input, operation, target)
  const ref = validateDeliveryRef(input.resolvedRef, operation)
  return {
    ...baseEvidence(operation, input.profile, target),
    preview: {
      previewId: preview.previewId,
      projectId: target.projectId,
      branch: target.branch,
    },
    ref,
  }
}

export function assertProductionDeploymentAllowed(
  input: EnvironmentGuardInput
): RedactedEnvironmentEvidence {
  const operation = "production-deployment" as const
  assertOperation(
    input.profile,
    operation,
    input.profile.appEnv === "production" &&
      input.profile.operations.canProductionDeploy,
    "production"
  )
  assertProfileDatabaseRoles(input.profile, operation)
  const target = classifyProfileTarget(input, operation)
  if (target.kind !== "neon") {
    fail(
      "target_mismatch",
      "Production deployment requires a Neon target",
      operation
    )
  }

  const ref = assertProductionReleaseProof(input, operation)

  return {
    ...baseEvidence(operation, input.profile, target),
    ref,
  }
}

/** Run the guard fully before invoking a state-changing operation. */
export async function executeAfterGuard<T>(
  guard: () => RedactedEnvironmentEvidence,
  mutation: (evidence: RedactedEnvironmentEvidence) => Promise<T> | T
): Promise<T> {
  const evidence = guard()
  return mutation(evidence)
}
