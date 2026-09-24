import type { EnvironmentProfile } from "../../environment/core"
import {
  PreviewDeliveryError,
  redactPreviewLog,
  runPreviewProcess,
} from "./core"

const VERCEL_API_ORIGIN = "https://api.vercel.com"
const TEAM_ID_PATTERN = /^team_[A-Za-z0-9]+$/
const PROJECT_ID_PATTERN = /^prj_[A-Za-z0-9]+$/
const DEPLOYMENT_ID_PATTERN = /^dpl_[A-Za-z0-9]+$/

export interface VercelIdentity {
  readonly token: string
  /** Team id from `VERCEL_ORG_ID`. Every lookup is scoped to it. */
  readonly teamId: string
  /** Project id from `VERCEL_PROJECT_ID`. */
  readonly projectId: string
}

export interface VercelDependencies {
  readonly run: typeof runPreviewProcess
  readonly fetch: typeof fetch
}

export interface VercelProjectPreflight {
  readonly projectId: string
  readonly productionDeploymentId: string
}

export interface VercelDeployOutput {
  readonly deploymentId: string
  readonly url: string
  readonly readyState: string
  readonly target: string | null
}

const defaultDependencies: VercelDependencies = {
  run: runPreviewProcess,
  fetch: (input, init) => fetch(input, init),
}

/**
 * Reads the identity the Preview adapter needs before any provider call.
 * `VERCEL_ORG_ID` must be a team id so deployment lookups never fall back to
 * the token owner's personal scope, which is what broke `vercel inspect` on
 * the 2026-09-09 attempt.
 */
export function readVercelIdentity(
  environment: Readonly<Record<string, string | undefined>>
): VercelIdentity {
  const token = environment.VERCEL_TOKEN?.trim()
  if (!token) {
    throw new PreviewDeliveryError(
      "cli_unavailable",
      "VERCEL_TOKEN is required to deploy a Preview"
    )
  }
  const teamId = environment.VERCEL_ORG_ID?.trim() ?? ""
  if (!TEAM_ID_PATTERN.test(teamId)) {
    throw new PreviewDeliveryError(
      "target_mismatch",
      "VERCEL_ORG_ID must be the team id (team_…) so Preview lookups are team-scoped"
    )
  }
  const projectId = environment.VERCEL_PROJECT_ID?.trim() ?? ""
  if (!PROJECT_ID_PATTERN.test(projectId)) {
    throw new PreviewDeliveryError(
      "target_mismatch",
      "VERCEL_PROJECT_ID must be the project id (prj_…)"
    )
  }
  return { token, teamId, projectId }
}

/**
 * Vercel assigns a project's first deployment to Production regardless of
 * flags. Refuse to start a Preview until a promoted Production deployment
 * exists, so this tooling can never be the one that creates it.
 */
export async function preflightVercelProject(
  identity: VercelIdentity,
  dependencies: VercelDependencies = defaultDependencies
): Promise<VercelProjectPreflight> {
  const project = await readVercelJson<{
    id?: unknown
    targets?: { production?: { id?: unknown } | null }
  }>(
    identity,
    dependencies,
    `/v9/projects/${encodeURIComponent(identity.projectId)}`
  )
  if (project.id !== identity.projectId) {
    throw new PreviewDeliveryError(
      "target_mismatch",
      "Vercel returned a different project than VERCEL_PROJECT_ID"
    )
  }
  const productionDeploymentId = project.targets?.production?.id
  if (
    typeof productionDeploymentId !== "string" ||
    !DEPLOYMENT_ID_PATTERN.test(productionDeploymentId)
  ) {
    throw new PreviewDeliveryError(
      "target_mismatch",
      "Vercel project has no Production deployment; its first deployment would be assigned Production. Bootstrap the project before requesting a Preview."
    )
  }
  return { projectId: identity.projectId, productionDeploymentId }
}

export async function deployPreview(
  input: {
    readonly profile: EnvironmentProfile
    readonly commitSha: string
    readonly previewId: string
    readonly healthSecret: string
  },
  dependencies: Partial<VercelDependencies> & {
    readonly environment?: Readonly<Record<string, string | undefined>>
  } = {}
): Promise<{ readonly url: string; readonly deploymentId: string }> {
  const identity = readVercelIdentity(dependencies.environment ?? process.env)
  const deps: VercelDependencies = {
    run: dependencies.run ?? defaultDependencies.run,
    fetch: dependencies.fetch ?? defaultDependencies.fetch,
  }

  const envArgs = buildPreviewVercelEnvArgs(
    input.profile,
    input.commitSha,
    input.previewId,
    input.healthSecret
  )
  const output = await deps.run(
    "vercel",
    [
      "deploy",
      "--yes",
      "--json",
      "--target=preview",
      "--meta",
      `previewId=${input.previewId}`,
      "--meta",
      `commitSha=${input.commitSha}`,
      ...envArgs,
    ],
    { VERCEL_TOKEN: identity.token }
  )
  const deployment = parseVercelDeployOutput(output)
  await verifyPreviewDeployment(
    identity,
    {
      deploymentId: deployment.deploymentId,
      commitSha: input.commitSha,
      previewId: input.previewId,
    },
    deps
  )
  return { url: deployment.url, deploymentId: deployment.deploymentId }
}

export function buildPreviewVercelEnvArgs(
  profile: EnvironmentProfile,
  commitSha: string,
  previewId: string,
  healthSecret: string
): string[] {
  const values: Record<string, string> = {
    APP_ENV: "preview",
    NODE_ENV: "production",
    BETTER_AUTH_SECRET: profile.betterAuth.secret,
    DATABASE_PROVIDER: "neon",
    DATABASE_PROJECT_ID: profile.database.projectId ?? "",
    DATABASE_BRANCH: profile.database.branch ?? "",
    DATABASE_URL: profile.database.runtimeUrl,
    // The app needs no migration URL; it checks its pooled host against the
    // observed endpoint instead (TD-035).
    DATABASE_ENDPOINT_HOST: new URL(profile.database.migrationUrl).hostname,
    NEXT_PUBLIC_SANITY_PROJECT_ID: profile.sanity.projectId,
    NEXT_PUBLIC_SANITY_DATASET: "preview",
    NEXT_PUBLIC_SANITY_API_VERSION: profile.sanity.apiVersion,
    SANITY_WRITE_POLICY: "read-only",
    APP_MAIL_TRANSPORT: "controlled-account",
    DEPLOYMENT_OWNER: "vercel",
    SECRET_NAMESPACE: "preview",
    PREVIEW_ID: previewId,
    PREVIEW_COMMIT_SHA: commitSha,
    APP_RELEASE_SHA: commitSha.toLowerCase(),
    HEALTH_PROBE_SECRET: healthSecret,
  }

  const args: string[] = []
  for (const [key, value] of Object.entries(values)) {
    if (!value) continue
    args.push("--env", `${key}=${value}`, "--build-env", `${key}=${value}`)
  }
  return args
}

/**
 * `vercel deploy --json` writes one JSON document to stdout: either the bare
 * deployment summary or, on an agent/non-TTY runner, `{ status, deployment }`.
 */
export function parseVercelDeployOutput(stdout: string): VercelDeployOutput {
  const start = stdout.indexOf("{")
  const end = stdout.lastIndexOf("}")
  let payload: unknown
  if (start !== -1 && end > start) {
    try {
      payload = JSON.parse(stdout.slice(start, end + 1))
    } catch {
      payload = undefined
    }
  }
  const record = isRecord(payload)
    ? isRecord(payload.deployment)
      ? payload.deployment
      : payload
    : undefined
  const deploymentId = record?.id
  const url = record?.url
  if (
    !record ||
    typeof deploymentId !== "string" ||
    !DEPLOYMENT_ID_PATTERN.test(deploymentId) ||
    typeof url !== "string" ||
    !/^https:\/\//.test(url)
  ) {
    throw new PreviewDeliveryError(
      "command_failed",
      "Vercel deploy did not return a structured Preview deployment"
    )
  }
  const target = typeof record.target === "string" ? record.target : null
  if (target === "production") {
    throw new PreviewDeliveryError(
      "target_mismatch",
      `Vercel assigned deployment ${deploymentId} to Production; Preview delivery refuses to use it`
    )
  }
  const readyState =
    typeof record.readyState === "string" ? record.readyState : ""
  if (readyState !== "READY") {
    throw new PreviewDeliveryError(
      "command_failed",
      `Vercel deployment ${deploymentId} is ${readyState || "in an unknown state"}, not READY`
    )
  }
  return { deploymentId, url, readyState, target }
}

/**
 * Team-scoped identity check. The deployment must belong to the configured
 * project, must not be a Production target, must be READY, and must carry the
 * exact commit and Preview id this run requested.
 */
export async function verifyPreviewDeployment(
  identity: VercelIdentity,
  expected: {
    readonly deploymentId: string
    readonly commitSha: string
    readonly previewId: string
  },
  dependencies: VercelDependencies = defaultDependencies
): Promise<void> {
  const deployment = await readVercelJson<{
    id?: unknown
    projectId?: unknown
    target?: unknown
    readyState?: unknown
    meta?: { previewId?: unknown; commitSha?: unknown }
  }>(
    identity,
    dependencies,
    `/v13/deployments/${encodeURIComponent(expected.deploymentId)}`
  )
  const mismatches: string[] = []
  if (deployment.id !== expected.deploymentId) mismatches.push("id")
  if (deployment.projectId !== identity.projectId) mismatches.push("project")
  if (deployment.target === "production") mismatches.push("target")
  if (deployment.readyState !== "READY") mismatches.push("readyState")
  if (deployment.meta?.commitSha !== expected.commitSha)
    mismatches.push("commit")
  if (deployment.meta?.previewId !== expected.previewId)
    mismatches.push("previewId")
  if (mismatches.length > 0) {
    throw new PreviewDeliveryError(
      "target_mismatch",
      `Vercel deployment ${expected.deploymentId} does not match the requested Preview: ${mismatches.join(", ")}`
    )
  }
}

/**
 * Team-scoped GET against the Vercel API. Provider error text is kept (it is
 * how the 2026-09-09 "User not found" failure was diagnosed) but the token is
 * never echoed.
 */
async function readVercelJson<T extends Record<string, unknown>>(
  identity: VercelIdentity,
  dependencies: VercelDependencies,
  path: string
): Promise<T> {
  const url = `${VERCEL_API_ORIGIN}${path}?teamId=${encodeURIComponent(identity.teamId)}`
  const redact = (value: string) =>
    redactPreviewLog(value).replaceAll(identity.token, "***")

  let response: Response
  try {
    response = await dependencies.fetch(url, {
      headers: { authorization: `Bearer ${identity.token}` },
    })
  } catch (error) {
    throw new PreviewDeliveryError(
      "command_failed",
      redact(`Vercel API ${path} request failed: ${describeError(error)}`)
    )
  }

  let body: unknown
  try {
    body = await response.json()
  } catch (error) {
    if (response.ok) {
      throw new PreviewDeliveryError(
        "command_failed",
        redact(
          `Vercel API ${path} returned invalid JSON: ${describeError(error)}`
        )
      )
    }
    body = undefined
  }

  if (!response.ok) {
    const providerError =
      isRecord(body) && isRecord(body.error) ? body.error : undefined
    const detail =
      providerError && typeof providerError.message === "string"
        ? ` (${typeof providerError.code === "string" ? `${providerError.code}: ` : ""}${providerError.message})`
        : ""
    throw new PreviewDeliveryError(
      "command_failed",
      redact(`Vercel API ${path} failed with HTTP ${response.status}${detail}`)
    )
  }

  if (!isRecord(body)) {
    throw new PreviewDeliveryError(
      "command_failed",
      `Vercel API ${path} returned a non-object body`
    )
  }
  return body as T
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
