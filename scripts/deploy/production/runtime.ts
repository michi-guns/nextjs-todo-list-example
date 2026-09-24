import { z } from "zod"
import type { EnvironmentVariables } from "../../environment/core"
import { readHealthProbeSecret, smokeDeployedHealth } from "../health-smoke"
import { productionTarget as target, type ProductionRuntime } from "./core"
import { runReleaseProcess } from "./process"
import {
  assertReleaseCheckout,
  requireReleaseCi,
  resolveReleaseRef,
} from "./ref"

const deploymentId = z.string().regex(/^dpl_[A-Za-z0-9]+$/)
const sha = z.string().regex(/^[0-9a-f]{40}$/i)
const deploymentSchema = z.object({
  id: deploymentId,
  projectId: z.string(),
  target: z.string().nullable(),
  readyState: z.string(),
  meta: z.object({ commitSha: sha.optional() }).optional(),
})

export function createProductionRuntime(
  environment: EnvironmentVariables,
  dependencies: { request?: typeof fetch; run?: typeof runReleaseProcess } = {}
): ProductionRuntime {
  const request = dependencies.request ?? fetch
  const run = dependencies.run ?? runReleaseProcess
  let healthSecret = ""
  try {
    // The deployed dependency probes and the smoke share this secret.
    healthSecret = readHealthProbeSecret(environment)
  } catch {
    /* Refused below with the other provider configuration. */
  }
  if (
    !healthSecret ||
    environment.VERCEL_PROJECT_ID !== target.vercelProjectId ||
    environment.VERCEL_ORG_ID !== target.vercelTeamId ||
    !environment.VERCEL_TOKEN ||
    !environment.NEON_API_KEY ||
    !environment.GITHUB_TOKEN ||
    environment.GITHUB_REPOSITORY !== "michi-guns/nextjs-todo-list-example"
  )
    throw new Error("Invalid Production provider configuration")

  async function get(url: string, token?: string): Promise<unknown> {
    try {
      const response = await request(url, {
        headers: token ? { authorization: `Bearer ${token}` } : undefined,
        redirect: "error",
        signal: AbortSignal.timeout(30_000),
      })
      if (!response.ok) throw new Error()
      return await response.json()
    } catch {
      throw new Error("Production provider lookup failed")
    }
  }
  const neon = (path: string) =>
    get(
      `https://console.neon.tech/api/v2/projects/${target.neonProjectId}${path}`,
      environment.NEON_API_KEY
    )
  const vercel = (path: string) =>
    get(
      `https://api.vercel.com${path}?teamId=${target.vercelTeamId}`,
      environment.VERCEL_TOKEN
    )

  return {
    async verifyRevision(input) {
      await assertReleaseCheckout(input.ref.commitSha, run)
      // Resolve the immutable SHA, never the potentially moved original tag.
      await resolveReleaseRef(input.ref.commitSha, run)
      const current = await requireReleaseCi(
        {
          repository: environment.GITHUB_REPOSITORY!,
          commitSha: input.ref.commitSha,
          token: environment.GITHUB_TOKEN!,
        },
        request
      )
      if (
        current.runId !== input.ci.runId ||
        current.runAttempt !== input.ci.runAttempt
      )
        throw new Error("Release CI changed after selection; dispatch again")
    },
    async observe() {
      const { branch } = z
        .object({
          branch: z.object({
            id: z.string(),
            project_id: z.string(),
            name: z.string(),
          }),
        })
        .parse(await neon(`/branches/${target.neonBranchId}`))
      if (
        branch.id !== target.neonBranchId ||
        branch.project_id !== target.neonProjectId ||
        branch.name !== target.neonBranch
      )
        throw new Error("Production Neon branch mismatch")
      const { endpoints } = z
        .object({
          endpoints: z.array(
            z.object({
              project_id: z.string(),
              branch_id: z.string(),
              host: z.string().regex(/^[a-z0-9.-]+\.neon\.tech$/),
              type: z.string(),
            })
          ),
        })
        .parse(await neon("/endpoints"))
      const matches = endpoints.filter(
        (endpoint) =>
          endpoint.project_id === target.neonProjectId &&
          endpoint.branch_id === branch.id &&
          endpoint.type === "read_write"
      )
      if (matches.length !== 1)
        throw new Error("Production Neon endpoint is ambiguous")
      const { databases } = z
        .object({
          databases: z.array(
            z.object({ name: z.string(), branch_id: z.string() })
          ),
        })
        .parse(await neon(`/branches/${branch.id}/databases`))
      if (
        !databases.some(
          (db) => db.name === target.database && db.branch_id === branch.id
        )
      )
        throw new Error("Production database is missing")
      const project = z
        .object({
          id: z.string(),
          accountId: z.string(),
          targets: z.object({ production: z.object({ id: deploymentId }) }),
        })
        .parse(await vercel(`/v9/projects/${target.vercelProjectId}`))
      if (
        project.id !== target.vercelProjectId ||
        project.accountId !== target.vercelTeamId
      )
        throw new Error("Production Vercel project mismatch")
      const previous = deploymentSchema.parse(
        await vercel(`/v13/deployments/${project.targets.production.id}`)
      )
      if (
        previous.id !== project.targets.production.id ||
        previous.projectId !== target.vercelProjectId ||
        previous.readyState !== "READY" ||
        previous.target !== "production"
      )
        throw new Error("Previous Production deployment is unavailable")
      const previousSha = previous.meta?.commitSha
      if (!previousSha && previous.id !== target.placeholderDeploymentId)
        throw new Error(
          "Previous Production deployment has no immutable revision"
        )
      return {
        projectId: branch.project_id,
        branchId: branch.id,
        branch: branch.name,
        directHost: matches[0].host,
        database: target.database,
        port: 5432,
        rollback: previousSha
          ? {
              deploymentId: previous.id,
              commitSha: previousSha,
              kind: "application",
            }
          : { deploymentId: previous.id, kind: "maintenance-placeholder" },
      }
    },
    async migrate(directUrl) {
      await run(
        "pnpm",
        ["exec", "drizzle-kit", "migrate", "--config", "drizzle.config.ts"],
        { DATABASE_URL: directUrl, DATABASE_URL_UNPOOLED: directUrl }
      )
    },
    async deploy(profile, input, database) {
      const values: Record<string, string> = {
        APP_ENV: "production",
        NODE_ENV: "production",
        BETTER_AUTH_URL: profile.betterAuth.url,
        BETTER_AUTH_SECRET: profile.betterAuth.secret,
        DATABASE_URL: profile.database.runtimeUrl,
        DATABASE_PROVIDER: "neon",
        DATABASE_PROJECT_ID: target.neonProjectId,
        DATABASE_BRANCH: target.neonBranch,
        NEXT_PUBLIC_SANITY_PROJECT_ID: profile.sanity.projectId,
        NEXT_PUBLIC_SANITY_DATASET: profile.sanity.dataset,
        NEXT_PUBLIC_SANITY_API_VERSION: profile.sanity.apiVersion,
        SANITY_WRITE_POLICY: profile.sanity.writePolicy,
        SANITY_REVALIDATE_SECRET: profile.sanity.revalidateSecret!,
        SANITY_MANUAL_RECOVERY_SECRET: profile.sanity.manualRecoverySecret!,
        // Off unless the protected Environment enables it with a Viewer token.
        NEXT_PUBLIC_SANITY_EDITORIAL_PREVIEW_ENABLED: String(
          profile.editorialPreview.enabled
        ),
        ...(profile.editorialPreview.enabled
          ? { SANITY_API_READ_TOKEN: profile.editorialPreview.token }
          : {}),
        APP_MAIL_TRANSPORT: "remote",
        APP_MAIL_PROVIDER: "resend",
        APP_MAIL_FROM: environment.APP_MAIL_FROM!,
        RESEND_API_KEY: environment.RESEND_API_KEY!,
        BETTER_AUTH_LOCAL_MAILBOX: "false",
        DEPLOYMENT_OWNER: "github",
        SECRET_NAMESPACE: "production",
        // Safe identity the running app checks and reports (TD-035).
        APP_RELEASE_SHA: input.ref.commitSha.toLowerCase(),
        DATABASE_ENDPOINT_HOST: database.directHost,
        HEALTH_PROBE_SECRET: healthSecret,
      }
      const args = [
        "deploy",
        "--yes",
        "--json",
        "--target=production",
        "--meta",
        `commitSha=${input.ref.commitSha}`,
        "--meta",
        `releaseRunId=${input.workflowRunId}`,
      ]
      for (const [key, value] of Object.entries(values))
        args.push("--env", `${key}=${value}`, "--build-env", `${key}=${value}`)
      const output = JSON.parse(
        await run("vercel", args, {
          VERCEL_TOKEN: environment.VERCEL_TOKEN!,
          VERCEL_ORG_ID: target.vercelTeamId,
          VERCEL_PROJECT_ID: target.vercelProjectId,
        })
      )
      const deployed = z
        .object({ id: deploymentId, url: z.url() })
        .parse(output.deployment ?? output)
      const url = new URL(deployed.url)
      if (
        url.protocol !== "https:" ||
        !url.hostname.endsWith(".vercel.app") ||
        url.username ||
        url.password ||
        url.search ||
        url.hash
      )
        throw new Error("Invalid Production deployment URL")
      const observed = deploymentSchema.parse(
        await vercel(`/v13/deployments/${deployed.id}`)
      )
      if (
        observed.id !== deployed.id ||
        observed.projectId !== target.vercelProjectId ||
        observed.target !== "production" ||
        observed.readyState !== "READY" ||
        observed.meta?.commitSha !== input.ref.commitSha
      )
        throw new Error("Production deployment identity mismatch")
      return { deploymentId: deployed.id, url: deployed.url }
    },
    async smoke(deployment, _profile, input) {
      const alias = z
        .object({
          projectId: z.string(),
          deploymentId: z.string(),
          alias: z.string(),
        })
        .parse(await vercel(`/v4/aliases/${new URL(target.origin).hostname}`))
      if (
        alias.projectId !== target.vercelProjectId ||
        alias.deploymentId !== deployment.deploymentId ||
        alias.alias !== new URL(target.origin).hostname
      )
        throw new Error("Canonical Production alias mismatch")
      for (const [path, status] of [
        ["/", 200],
        ["/sign-in", 200],
        ["/api/auth/get-session", 200],
        ["/api/lists", 401],
      ] as const) {
        const response = await request(target.origin + path, {
          redirect: "error",
          signal: AbortSignal.timeout(30_000),
        })
        if (response.status !== status)
          throw new Error("Production HTTP smoke failed")
        if (
          path === "/api/auth/get-session" &&
          (await response.json()) !== null
        )
          throw new Error("Unexpected anonymous session")
        if (!response.bodyUsed) await response.body?.cancel()
      }
      // The canonical origin must run this release with ready dependencies.
      await smokeDeployedHealth({
        origin: target.origin,
        commitSha: input.ref.commitSha,
        secret: healthSecret,
        request,
      })
      await run("pnpm", ["sanity:smoke"])
    },
  }
}
