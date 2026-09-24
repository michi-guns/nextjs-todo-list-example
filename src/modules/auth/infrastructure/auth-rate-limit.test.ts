import type { BetterAuthOptions } from "better-auth"
import { describe, expect, it, vi } from "vitest"

import { AUTH_ADMISSION_POLICY } from "./auth-policy"
import {
  admissionKey,
  createAdmissionStore,
  createAuthAdmission,
  normalizeRecipient,
  type AdmissionQueryable,
} from "./auth-rate-limit"

const SECRET = "test-secret-with-enough-length-0123456789"

function admission(consume = vi.fn()) {
  const onUnavailable = vi.fn()
  return {
    consume,
    onUnavailable,
    subject: createAuthAdmission({
      store: { consume },
      secret: SECRET,
      environment: "development",
      onUnavailable,
    }),
  }
}

describe("TST-AUTH-006 opaque admission keys", () => {
  it("never stores a raw email or IP and separates purpose, environment and secret", () => {
    const email = "someone@example.com"
    const key = admissionKey(SECRET, "development", "recipient-send", email)
    expect(key).toMatch(/^recipient-send:[0-9a-f]{64}$/)
    expect(key).not.toContain("someone")
    expect(
      admissionKey(SECRET, "development", "http", "203.0.113.9|/sign-in")
    ).not.toContain("203.0.113.9")
    const others = [
      admissionKey(SECRET, "development", "recipient-request", email),
      admissionKey(SECRET, "preview", "recipient-send", email),
      admissionKey(`${SECRET}-rotated`, "development", "recipient-send", email),
    ]
    for (const other of others)
      expect(other.split(":")[1]).not.toBe(key.split(":")[1])
    expect(admissionKey(SECRET, "development", "recipient-send", email)).toBe(
      key
    )
  })

  it("trims and lowercases recipients but keeps dots and plus aliases distinct", () => {
    expect(normalizeRecipient("  Some.One+x@Example.COM ")).toBe(
      "some.one+x@example.com"
    )
    expect(normalizeRecipient("someone@example.com")).not.toBe(
      normalizeRecipient("some.one@example.com")
    )
    expect(normalizeRecipient("not-an-email")).toBeNull()
  })
})

describe("TST-AUTH-006 auth admission adapter", () => {
  it("fits Better Auth's customStorage contract and hashes its key", async () => {
    const { consume, subject } = admission(
      vi.fn().mockResolvedValue({ allowed: true, retryAfter: null })
    )
    const storage: NonNullable<
      NonNullable<BetterAuthOptions["rateLimit"]>["customStorage"]
    > = subject.customStorage
    await expect(
      storage.consume("198.51.100.4|/sign-in/email", { window: 10, max: 3 })
    ).resolves.toEqual({ allowed: true, retryAfter: null })
    const [key, rule] = consume.mock.calls[0]
    expect(key).toMatch(/^http:[0-9a-f]{64}$/)
    expect(rule).toEqual({ window: 10, max: 3 })
  })

  it("charges recipient requests and sends against separate budgets", async () => {
    const { consume, subject } = admission(
      vi.fn().mockResolvedValue({ allowed: true, retryAfter: null })
    )
    await subject.consumeRecipient("request", "A@Example.com")
    await subject.consumeRecipient("send", "a@example.com")
    const [[requestKey, requestRule], [sendKey, sendRule]] = consume.mock.calls
    expect(requestKey).toMatch(/^recipient-request:/)
    expect(sendKey).toMatch(/^recipient-send:/)
    expect(requestRule).toEqual(AUTH_ADMISSION_POLICY.recipientRequest)
    expect(sendRule).toEqual(AUTH_ADMISSION_POLICY.recipientSend)
  })

  it("reports a limited recipient with the remaining wait", async () => {
    const { subject } = admission(
      vi.fn().mockResolvedValue({ allowed: false, retryAfter: 42 })
    )
    await expect(
      subject.consumeRecipient("request", "a@example.com")
    ).resolves.toEqual({ allowed: false, retryAfter: 42, reason: "limited" })
  })

  it("refuses an invalid recipient without touching the store", async () => {
    const { consume, subject } = admission()
    await expect(
      subject.consumeRecipient("send", "nobody")
    ).resolves.toMatchObject({ allowed: false, reason: "invalid_recipient" })
    expect(consume).not.toHaveBeenCalled()
  })

  it("denies mail and HTTP admission when the store fails, without exposing the error", async () => {
    const failure = new Error("connect ECONNREFUSED someone@example.com")
    const { onUnavailable, subject } = admission(
      vi.fn().mockRejectedValue(failure)
    )
    await expect(
      subject.consumeRecipient("send", "someone@example.com")
    ).resolves.toEqual({
      allowed: false,
      retryAfter: null,
      reason: "unavailable",
    })
    await expect(
      subject.customStorage.consume("198.51.100.4|/sign-in/email", {
        window: 10,
        max: 3,
      })
    ).resolves.toEqual({ allowed: false, retryAfter: 10 })
    expect(onUnavailable.mock.calls).toEqual([["recipient-send"], ["http"]])
  })
})

describe("TST-AUTH-006 admission store boundaries", () => {
  it("denies an unusable rule without querying", async () => {
    const query = vi.fn()
    const store = createAdmissionStore({ query } as AdmissionQueryable)
    await expect(store.consume("k", { window: 0, max: 3 })).resolves.toEqual({
      allowed: false,
      retryAfter: 1,
    })
    await expect(store.consume("k", { window: 10, max: 0 })).resolves.toEqual({
      allowed: false,
      retryAfter: 1,
    })
    expect(query).not.toHaveBeenCalled()
  })

  it("keeps an admission when the bounded cleanup fails", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ count: 1 }], rowCount: 1 })
      .mockRejectedValueOnce(new Error("cleanup failed"))
    const store = createAdmissionStore({ query } as AdmissionQueryable)
    await expect(store.consume("k", { window: 10, max: 3 })).resolves.toEqual({
      allowed: true,
      retryAfter: null,
    })
    expect(query).toHaveBeenCalledTimes(2)
  })

  it("keeps the policy defaults the account plan chose", () => {
    expect(AUTH_ADMISSION_POLICY).toEqual({
      recipientRequest: { window: 60, max: 1 },
      recipientSend: { window: 900, max: 5 },
      resetSubmissionIp: { window: 60, max: 5 },
      resetPasswordTokenSeconds: 1800,
    })
  })
})
