/**
 * Provider- and channel-neutral operational alerts (SPEC 11.3, TD-033). The
 * value carries only safe identity and context: never provider errors, shell
 * arguments, URLs with credentials, recipients or secrets. Native uptime and
 * Sentry notifications stay outside this port.
 */
export const RELEASE_FAILURE_STAGES = [
  "migration",
  "deployment",
  "smoke",
  "unknown",
] as const
export type ReleaseFailureStage = (typeof RELEASE_FAILURE_STAGES)[number]

export interface OperationalAlert {
  readonly kind: "release_failed"
  readonly environment: "production"
  /** `owner/name` of the repository whose protected workflow failed. */
  readonly repository: string
  readonly runId: string
  readonly runAttempt: number
  /** Link to the workflow run, built from trusted workflow metadata. */
  readonly runUrl: string
  /** Resolved release commit, when trusted metadata supplies it. */
  readonly commitSha?: string
  /** `unknown` when no trustworthy release record is available. */
  readonly stage: ReleaseFailureStage
}

export type NotificationFailure =
  "not_configured" | "rejected" | "timeout" | "unreachable" | "invalid_response"

/** Safe secondary notice: fixed vocabulary only. */
export class NotificationError extends Error {
  constructor(readonly reason: NotificationFailure) {
    super(`Operational alert not delivered to the provider: ${reason}`)
    this.name = "NotificationError"
  }
}

export interface NotificationPort {
  /** Resolves when the provider accepted the alert; acceptance is not receipt. */
  send(alert: OperationalAlert): Promise<{ readonly id: string }>
}

/**
 * Stable per workflow attempt: a retry of the same attempt reuses it, a new
 * attempt gets a new one. Providers may retain it only for a limited window
 * (Resend: 24 hours), so it is duplicate protection, not exactly-once.
 */
export function alertIdentity(alert: OperationalAlert): string {
  return `${alert.kind}/${alert.repository}/${alert.runId}/${alert.runAttempt}`
}
