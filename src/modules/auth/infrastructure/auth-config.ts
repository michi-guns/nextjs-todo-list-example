import { APIError } from "better-auth/api"

import { AUTH_ADMISSION_POLICY } from "./auth-policy"
import {
  normalizeRecipient,
  type AdmissionDecision,
  type AdmissionRule,
  type RecipientAdmission,
} from "./auth-rate-limit"

/** Explicit email-request endpoints that share one recipient request budget. */
export const RECIPIENT_REQUEST_PATHS = [
  "/request-password-reset",
  "/send-verification-email",
  "/sign-in/magic-link",
] as const

/**
 * Runs from Better Auth's `hooks.before`, so it also covers `auth.api` calls,
 * which bypass the HTTP limiter. It charges the recipient before any account
 * lookup: absent and present addresses meet the same cooldown. Malformed
 * input is left to the endpoint's own validation.
 */
export async function admitRecipientRequest(
  admission: {
    consumeRecipient(
      kind: "request",
      email: string
    ): Promise<RecipientAdmission>
  },
  path: string,
  body: unknown
): Promise<void> {
  if (!(RECIPIENT_REQUEST_PATHS as readonly string[]).includes(path)) return
  const email =
    body && typeof body === "object" && "email" in body ? body.email : undefined
  if (typeof email !== "string" || !normalizeRecipient(email)) return
  const decision = await admission.consumeRecipient("request", email)
  if (decision.allowed) return
  if (decision.reason === "unavailable")
    throw new APIError("SERVICE_UNAVAILABLE", {
      code: "EMAIL_TEMPORARILY_UNAVAILABLE",
      message: "Email is temporarily unavailable. Please try again later.",
    })
  throw new APIError(
    "TOO_MANY_REQUESTS",
    {
      code: "RECIPIENT_COOLDOWN",
      message: "Please wait before requesting another email.",
    },
    { "X-Retry-After": String(decision.retryAfter ?? 60) }
  )
}

/**
 * Better Auth defaults its HTTP limiter off outside Production; the intended
 * limits run everywhere, against the shared PostgreSQL store. Native rules
 * for sign-in, sign-up, email requests and magic links are kept.
 */
export function authRateLimitOptions(customStorage: {
  consume(key: string, rule: AdmissionRule): Promise<AdmissionDecision>
}) {
  return {
    enabled: true,
    customStorage,
    customRules: {
      "/reset-password": AUTH_ADMISSION_POLICY.resetSubmissionIp,
    },
  }
}

/**
 * On Vercel the platform sets `x-vercel-forwarded-for` to the client address.
 * Elsewhere the library default (a single-value `x-forwarded-for`) applies.
 */
export function authIpAddressOptions(
  environment: Readonly<Record<string, string | undefined>>
): { ipAddressHeaders?: string[] } {
  return environment.VERCEL === "1"
    ? { ipAddressHeaders: ["x-vercel-forwarded-for"] }
    : {}
}
