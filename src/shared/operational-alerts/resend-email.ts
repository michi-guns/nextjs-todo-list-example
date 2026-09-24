import { z } from "zod"

import {
  NotificationError,
  alertIdentity,
  type NotificationPort,
  type OperationalAlert,
} from "./contracts"

export const RESEND_EMAILS_ENDPOINT = "https://api.resend.com/emails"

export interface ResendAlertConfig {
  readonly apiKey: string
  readonly from: string
  readonly to: string
}

const configSchema = z.object({
  RESEND_API_KEY: z
    .string()
    .trim()
    .regex(/^re_[A-Za-z0-9_-]+$/),
  APP_MAIL_FROM: z.email(),
  RELEASE_ALERT_EMAIL: z.email(),
})

/**
 * Reads the protected workflow step's configuration. Deliberately separate
 * from the application's auth-mail configuration: no app, database or
 * auth-admission code runs here.
 */
export function readResendAlertConfig(
  environment: Readonly<Record<string, string | undefined>>
): ResendAlertConfig {
  const parsed = configSchema.safeParse(environment)
  // Zod issues can echo rejected values (keys, recipients); never expose them.
  if (!parsed.success) throw new NotificationError("not_configured")
  return {
    apiKey: parsed.data.RESEND_API_KEY,
    from: parsed.data.APP_MAIL_FROM,
    to: parsed.data.RELEASE_ALERT_EMAIL,
  }
}

const STAGE_TEXT = {
  migration: "database migration",
  deployment: "deployment",
  smoke: "post-deployment smoke checks",
  unknown: "an unknown stage (no trustworthy release record)",
} as const

function render(alert: OperationalAlert) {
  const commit = alert.commitSha ? alert.commitSha.slice(0, 12) : "unknown"
  return {
    subject: `Production release failed: ${alert.stage} (${commit})`,
    text: [
      `The protected Production release failed during ${STAGE_TEXT[alert.stage]}.`,
      "",
      `Repository: ${alert.repository}`,
      `Commit: ${alert.commitSha ?? "unknown"}`,
      `Workflow run: ${alert.runUrl} (attempt ${alert.runAttempt})`,
      "",
      "Open the run's safe release record before acting. A failed deployment or",
      "smoke stage may leave the new deployment live; follow the Production",
      "release runbook for recovery.",
    ].join("\n"),
  }
}

/**
 * Provider responses worth another attempt with the same key and payload.
 * `409` is Resend's "same key still in progress" answer (for example after a
 * timed-out attempt); the payload never changes, so its other `409` cannot
 * occur here.
 */
const RETRYABLE_STATUS = new Set([409, 429, 500, 502, 503, 504])

/**
 * NotificationPort adapter for Resend Email. The payload and idempotency key
 * are fixed before the first attempt, so every retry is identical; attempts
 * and each request are bounded. Failures surface only as NotificationError.
 */
export function createResendEmailNotifier(
  config: ResendAlertConfig,
  options: {
    endpoint?: string
    request?: typeof fetch
    timeoutMs?: number
    attempts?: number
    pauseMs?: number
  } = {}
): NotificationPort {
  const request = options.request ?? fetch
  const endpoint = options.endpoint ?? RESEND_EMAILS_ENDPOINT
  const attempts = Math.max(1, options.attempts ?? 3)
  const pause = (ms: number) => new Promise((done) => setTimeout(done, ms))

  return {
    async send(alert) {
      const { subject, text } = render(alert)
      const body = JSON.stringify({
        from: config.from,
        to: [config.to],
        subject,
        text,
      })
      const headers = {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": alertIdentity(alert),
      }
      let last: NotificationError = new NotificationError("unreachable")
      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        if (attempt > 1) await pause((options.pauseMs ?? 1_000) * (attempt - 1))
        let response: Response
        try {
          response = await request(endpoint, {
            method: "POST",
            headers,
            body,
            redirect: "error",
            signal: AbortSignal.timeout(options.timeoutMs ?? 10_000),
          })
        } catch (error) {
          last = new NotificationError(
            error instanceof DOMException && error.name === "TimeoutError"
              ? "timeout"
              : "unreachable"
          )
          continue
        }
        if (response.ok) {
          const accepted = z
            .object({ id: z.string().min(1).max(256) })
            .safeParse(await response.json().catch(() => null))
          if (!accepted.success) throw new NotificationError("invalid_response")
          return { id: accepted.data.id }
        }
        await response.body?.cancel().catch(() => {})
        if (!RETRYABLE_STATUS.has(response.status))
          throw new NotificationError("rejected")
        last = new NotificationError("rejected")
      }
      throw last
    },
  }
}
