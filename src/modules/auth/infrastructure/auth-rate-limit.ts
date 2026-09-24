import { createHmac } from "node:crypto"
import { z } from "zod"

import { AUTH_ADMISSION_POLICY } from "./auth-policy"

/** Better Auth's rate-limit rule: `max` requests per `window` seconds. */
export interface AdmissionRule {
  readonly window: number
  readonly max: number
}

/** Better Auth's `customStorage.consume` result shape. */
export interface AdmissionDecision {
  readonly allowed: boolean
  /** Whole seconds until the window reopens; null when admitted. */
  readonly retryAfter: number | null
}

/**
 * The `pg` surface the store needs. Pass an autocommit Pool, never a client
 * inside an open transaction: that would freeze `now()`, hold the counter
 * row lock until commit and undo admissions on rollback.
 */
export interface AdmissionQueryable {
  query<Row extends Record<string, unknown>>(
    text: string,
    values?: readonly unknown[]
  ): Promise<{ rows: Row[]; rowCount: number | null }>
}

export const EXPIRED_CLEANUP_BATCH = 100

// One statement per decision, evaluated on database time. A missing or
// expired row restarts at one; a live row below the maximum increments;
// otherwise the conflict WHERE fails, nothing is written and no row returns.
// ON CONFLICT locks the conflicting row and re-checks the predicate against
// its latest version, so concurrent callers cannot all pass a stale count.
const CONSUME = `
INSERT INTO auth_rate_limit AS counter (key, count, window_expires_at)
VALUES ($1, 1, now() + make_interval(secs => $2))
ON CONFLICT (key) DO UPDATE SET
  count = CASE WHEN counter.window_expires_at <= now() THEN 1 ELSE counter.count + 1 END,
  window_expires_at = CASE
    WHEN counter.window_expires_at <= now() THEN now() + make_interval(secs => $2)
    ELSE counter.window_expires_at
  END
WHERE counter.window_expires_at <= now() OR counter.count < $3
RETURNING count`

// Read-only: reports the remaining wait without granting or extending.
const REMAINING = `
SELECT ceil(extract(epoch FROM window_expires_at - now()))::integer AS seconds
FROM auth_rate_limit WHERE key = $1`

// Expired rows mean the same as absent rows, so any of them may go. The
// batch is bounded and skips rows another caller holds.
const CLEANUP = `
DELETE FROM auth_rate_limit WHERE key IN (
  SELECT key FROM auth_rate_limit
  WHERE window_expires_at <= now()
  ORDER BY window_expires_at
  LIMIT $1
  FOR UPDATE SKIP LOCKED
)`

/**
 * Atomic fixed-window counters in PostgreSQL, shared by every instance that
 * uses the same database. Keys must already be opaque; see
 * `createAuthAdmission`.
 */
export function createAdmissionStore(database: AdmissionQueryable) {
  async function cleanupExpired(limit = EXPIRED_CLEANUP_BATCH) {
    const result = await database.query(CLEANUP, [limit])
    return result.rowCount ?? 0
  }

  return {
    async consume(
      key: string,
      rule: AdmissionRule
    ): Promise<AdmissionDecision> {
      const window = Math.ceil(rule.window)
      if (!(window > 0) || !(rule.max >= 1))
        return { allowed: false, retryAfter: 1 }
      const admitted = await database.query<{ count: number }>(CONSUME, [
        key,
        window,
        Math.floor(rule.max),
      ])
      if (admitted.rows.length > 0) {
        // A new window is a natural, infrequent point to trim expired rows.
        if (admitted.rows[0].count === 1) await cleanupExpired().catch(() => {})
        return { allowed: true, retryAfter: null }
      }
      const remaining = await database.query<{ seconds: number | null }>(
        REMAINING,
        [key]
      )
      return {
        allowed: false,
        retryAfter: Math.max(1, remaining.rows[0]?.seconds ?? 1),
      }
    },
    cleanupExpired,
  }
}

export type AdmissionPurpose = "http" | "recipient-request" | "recipient-send"

/**
 * Opaque, namespaced counter key: HMAC-SHA256 over environment, purpose and
 * subject with the stable Better Auth secret. Raw emails and IP addresses are
 * never stored; a secret rotation deliberately starts fresh counters.
 */
export function admissionKey(
  secret: string,
  environment: string,
  purpose: AdmissionPurpose,
  subject: string
): string {
  const digest = createHmac("sha256", secret)
    .update(`auth-admission\0${environment}\0${purpose}\0${subject}`)
    .digest("hex")
  return `${purpose}:${digest}`
}

const recipientSchema = z.email()

/** Trim and lowercase like Better Auth; dots and plus aliases stay distinct. */
export function normalizeRecipient(email: string): string | null {
  const normalized = email.trim().toLowerCase()
  return recipientSchema.safeParse(normalized).success ? normalized : null
}

export type RecipientAdmission =
  | { readonly allowed: true; readonly retryAfter: null }
  | {
      readonly allowed: false
      readonly retryAfter: number | null
      readonly reason: "limited" | "unavailable" | "invalid_recipient"
    }

/**
 * The auth-owned admission surface: Better Auth's `customStorage` for HTTP IP
 * limits, plus separate recipient request and actual-send budgets. Every
 * store failure denies; there is no in-memory or permissive fallback.
 */
export function createAuthAdmission(options: {
  store: Pick<ReturnType<typeof createAdmissionStore>, "consume">
  secret: string
  environment: string
  policy?: typeof AUTH_ADMISSION_POLICY
  onUnavailable?: (purpose: AdmissionPurpose) => void
}) {
  const policy = options.policy ?? AUTH_ADMISSION_POLICY
  const key = (purpose: AdmissionPurpose, subject: string) =>
    admissionKey(options.secret, options.environment, purpose, subject)

  async function consume(
    purpose: AdmissionPurpose,
    subject: string,
    rule: AdmissionRule
  ) {
    try {
      return await options.store.consume(key(purpose, subject), rule)
    } catch {
      // Never forward the error: it can carry the query or connection detail.
      options.onUnavailable?.(purpose)
      return undefined
    }
  }

  return {
    customStorage: {
      async consume(
        key: string,
        rule: AdmissionRule
      ): Promise<AdmissionDecision> {
        return (
          (await consume("http", key, rule)) ?? {
            allowed: false,
            retryAfter: Math.max(1, Math.ceil(rule.window)),
          }
        )
      },
    },
    async consumeRecipient(
      kind: "request" | "send",
      email: string
    ): Promise<RecipientAdmission> {
      const recipient = normalizeRecipient(email)
      if (!recipient)
        return { allowed: false, retryAfter: null, reason: "invalid_recipient" }
      const decision = await consume(
        kind === "request" ? "recipient-request" : "recipient-send",
        recipient,
        kind === "request" ? policy.recipientRequest : policy.recipientSend
      )
      if (!decision)
        return { allowed: false, retryAfter: null, reason: "unavailable" }
      return decision.allowed
        ? { allowed: true, retryAfter: null }
        : { allowed: false, retryAfter: decision.retryAfter, reason: "limited" }
    },
  }
}
