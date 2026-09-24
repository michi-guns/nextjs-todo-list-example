import { z } from "zod"

import {
  NotificationError,
  type NotificationPort,
  type OperationalAlert,
  type ReleaseFailureStage,
} from "../../../src/shared/operational-alerts/contracts"

/** Trusted identity from the workflow runner, never from the record. */
export interface TrustedRun {
  readonly repository: string
  readonly runId: string
  readonly runAttempt: number
  readonly serverUrl: string
  readonly commitSha?: string
}

const SHA = /^[0-9a-f]{40}$/
const stageStatus = z.enum(["not_started", "succeeded", "failed"])
/** The safe release record written by `cli.ts release`. */
const recordSchema = z.object({
  ref: z.object({ commitSha: z.string().regex(/^[0-9a-f]{40}$/i) }),
  workflowRunId: z.string().regex(/^\d+$/),
  result: z.enum(["succeeded", "failed"]),
  stages: z.object({
    preflight: stageStatus,
    migration: stageStatus,
    deployment: stageStatus,
    smoke: stageStatus,
  }),
})

export function readTrustedRun(
  environment: Readonly<Record<string, string | undefined>>
): TrustedRun {
  const run = z
    .object({
      GITHUB_REPOSITORY: z.string().regex(/^[\w.-]+\/[\w.-]+$/),
      GITHUB_RUN_ID: z.string().regex(/^\d+$/),
      GITHUB_RUN_ATTEMPT: z.coerce.number().int().positive(),
      GITHUB_SERVER_URL: z.url({ protocol: /^https$/ }),
    })
    .parse(environment)
  const commit = environment.RELEASE_COMMIT_SHA?.trim().toLowerCase()
  return {
    repository: run.GITHUB_REPOSITORY,
    runId: run.GITHUB_RUN_ID,
    runAttempt: run.GITHUB_RUN_ATTEMPT,
    serverUrl: new URL(run.GITHUB_SERVER_URL).origin,
    ...(commit && SHA.test(commit) ? { commitSha: commit } : {}),
  }
}

/**
 * Decides the alert for a failed protected release step. The record is used
 * only when it belongs to this run and commit; otherwise the alert carries
 * trusted metadata with an unknown stage. A record that reports success or a
 * preflight-only refusal (nothing changed) produces no Email.
 */
export function buildReleaseFailureAlert(
  record: unknown,
  run: TrustedRun
): OperationalAlert | null {
  const parsed = recordSchema.safeParse(record)
  const trustworthy =
    parsed.success &&
    parsed.data.workflowRunId === run.runId &&
    (!run.commitSha ||
      parsed.data.ref.commitSha.toLowerCase() === run.commitSha)
  let stage: ReleaseFailureStage = "unknown"
  if (trustworthy) {
    const { result, stages } = parsed.data
    if (result === "succeeded") return null
    const failed = (["migration", "deployment", "smoke"] as const).find(
      (name) => stages[name] === "failed"
    )
    if (!failed && stages.preflight === "failed") return null
    stage = failed ?? "unknown"
  }
  return {
    kind: "release_failed",
    environment: "production",
    repository: run.repository,
    runId: run.runId,
    runAttempt: run.runAttempt,
    runUrl: `${run.serverUrl}/${run.repository}/actions/runs/${run.runId}`,
    ...(run.commitSha ? { commitSha: run.commitSha } : {}),
    stage,
  }
}

export type NotifyOutcome =
  | { readonly status: "not_needed" }
  | { readonly status: "accepted"; readonly stage: ReleaseFailureStage }
  | { readonly status: "not_sent"; readonly reason: string }

/**
 * Runs after the protected release step failed. It never touches the app,
 * database or auth mail and never changes the failed release: a delivery
 * problem becomes a safe secondary notice only.
 */
export async function notifyReleaseFailure(dependencies: {
  readonly environment: Readonly<Record<string, string | undefined>>
  readonly readRecord: () => Promise<unknown>
  readonly notifier: () => NotificationPort
}): Promise<NotifyOutcome> {
  let run: TrustedRun
  try {
    run = readTrustedRun(dependencies.environment)
  } catch {
    return { status: "not_sent", reason: "untrusted_run" }
  }
  const record = await dependencies.readRecord().catch(() => undefined)
  const alert = buildReleaseFailureAlert(record, run)
  if (!alert) return { status: "not_needed" }
  try {
    await dependencies.notifier().send(alert)
    return { status: "accepted", stage: alert.stage }
  } catch (error) {
    return {
      status: "not_sent",
      reason: error instanceof NotificationError ? error.reason : "unexpected",
    }
  }
}
