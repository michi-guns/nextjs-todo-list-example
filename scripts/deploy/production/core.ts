import {
  parseEnvironmentProfile,
  type EnvironmentProfile,
  type EnvironmentVariables,
} from "../../environment/core"
import {
  assertMigrationAllowed,
  assertProductionDeploymentAllowed,
  type EnvironmentGuardInput,
  type ResolvedDeliveryRef,
} from "../../environment/guards"
import type { ReleaseCiEvidence } from "./ref"

// Repository-specific approved targets; provider observations must match these.
export const productionTarget = {
  neonProjectId: "jolly-dew-32309276",
  neonBranchId: "br-purple-sea-a53v962l",
  neonBranch: "main",
  database: "neondb",
  vercelProjectId: "prj_v45MdKyM0g9PVTXUQB1PznfgyMI6",
  vercelTeamId: "team_6D5hN9OejSRMxW95pXPiDFI2",
  origin: "https://nextjs-todo-list-example.vercel.app",
  placeholderDeploymentId: "dpl_GRpcAgtr9BZ7QcsUNHX259WAvLin",
} as const

export interface ReleaseInput {
  readonly ref: ResolvedDeliveryRef
  readonly ci: ReleaseCiEvidence
  readonly approvedSha: string
  readonly rollbackCompatible: boolean
  readonly actor: string
  readonly workflowRunId: string
}

export interface RollbackReference {
  readonly deploymentId: string
  readonly commitSha?: string
  readonly kind: "application" | "maintenance-placeholder"
}

export interface ProductionObservation {
  readonly projectId: string
  readonly branchId: string
  readonly branch: string
  readonly directHost: string
  readonly database: string
  readonly port: number
  readonly rollback: RollbackReference
}

export interface ProductionDeployment {
  readonly deploymentId: string
  readonly url: string
}

export interface ProductionRuntime {
  verifyRevision(input: ReleaseInput): Promise<void>
  observe(profile: EnvironmentProfile): Promise<ProductionObservation>
  migrate(directUrl: string): Promise<void>
  deploy(
    profile: EnvironmentProfile,
    input: ReleaseInput
  ): Promise<ProductionDeployment>
  smoke(
    deployment: ProductionDeployment,
    profile: EnvironmentProfile
  ): Promise<void>
}

type Stage = "preflight" | "migration" | "deployment" | "smoke"
export interface ReleaseRecord {
  readonly ref: ResolvedDeliveryRef
  readonly ci: ReleaseCiEvidence
  readonly actor: string
  readonly workflowRunId: string
  readonly startedAt: string
  finishedAt?: string
  result: "succeeded" | "failed"
  stages: Record<Stage, "not_started" | "succeeded" | "failed">
  target?: { projectId: string; branchId: string; branch: string }
  rollback?: RollbackReference & { forwardSchemaCompatible: true }
  deployment?: ProductionDeployment
}

export async function runProductionRelease(
  input: ReleaseInput,
  environment: EnvironmentVariables,
  runtime: ProductionRuntime
): Promise<ReleaseRecord> {
  const record: ReleaseRecord = {
    ref: input.ref,
    ci: input.ci,
    actor: input.actor,
    workflowRunId: input.workflowRunId,
    startedAt: new Date().toISOString(),
    result: "failed",
    stages: {
      preflight: "not_started",
      migration: "not_started",
      deployment: "not_started",
      smoke: "not_started",
    },
  }
  let stage: Stage = "preflight"
  try {
    if (
      !/^[0-9a-f]{40}$/i.test(input.ref.commitSha) ||
      input.approvedSha !== input.ref.commitSha ||
      input.ci.commitSha !== input.ref.commitSha ||
      !input.rollbackCompatible
    )
      throw new Error()
    const profile = parseEnvironmentProfile(environment)
    if (
      profile.appEnv !== "production" ||
      profile.betterAuth.url !== productionTarget.origin
    )
      throw new Error()
    await runtime.verifyRevision(input)
    const observed = await runtime.observe(profile)
    if (
      observed.projectId !== productionTarget.neonProjectId ||
      observed.branchId !== productionTarget.neonBranchId ||
      observed.branch !== productionTarget.neonBranch ||
      observed.database !== productionTarget.database
    )
      throw new Error()
    const target = {
      provider: "neon" as const,
      projectId: observed.projectId,
      branch: observed.branch,
      host: observed.directHost,
      database: observed.database,
      port: observed.port,
    }
    const guard: EnvironmentGuardInput = {
      profile,
      target,
      connection: {
        target,
        role: "direct",
        url: profile.database.migrationUrl,
      },
      resolvedRef: input.ref,
      approval: {
        environment: "production",
        commitSha: input.approvedSha,
        approved: true,
      },
    }
    assertMigrationAllowed(guard)
    assertProductionDeploymentAllowed(guard)
    // The app must use the pooled form of the same observed endpoint/database.
    const runtimeUrl = new URL(profile.database.runtimeUrl)
    const directUrl = new URL(profile.database.migrationUrl)
    if (
      runtimeUrl.hostname !== observed.directHost.replace(/\./, "-pooler.") ||
      runtimeUrl.port !== directUrl.port ||
      runtimeUrl.pathname !== directUrl.pathname ||
      [...runtimeUrl.searchParams.keys()].some((key) =>
        /^(host|hostaddr|port|database|dbname)$/i.test(key)
      )
    )
      throw new Error()
    record.target = {
      projectId: observed.projectId,
      branchId: observed.branchId,
      branch: observed.branch,
    }
    record.rollback = { ...observed.rollback, forwardSchemaCompatible: true }
    record.stages.preflight = "succeeded"

    stage = "migration"
    await runtime.migrate(profile.database.migrationUrl)
    record.stages.migration = "succeeded"
    stage = "deployment"
    record.deployment = await runtime.deploy(profile, input)
    record.stages.deployment = "succeeded"
    stage = "smoke"
    await runtime.smoke(record.deployment, profile)
    record.stages.smoke = "succeeded"
    record.result = "succeeded"
  } catch {
    // Never serialize raw provider, database or subprocess errors.
    record.stages[stage] = "failed"
  }
  record.finishedAt = new Date().toISOString()
  return record
}
