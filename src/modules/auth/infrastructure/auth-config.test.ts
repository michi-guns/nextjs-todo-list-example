import { describe, expect, it, vi } from "vitest"

import { AUTH_ADMISSION_POLICY } from "./auth-policy"
import {
  RECIPIENT_REQUEST_PATHS,
  authIpAddressOptions,
  authRateLimitOptions,
  admitRecipientRequest,
} from "./auth-config"

function admission(decision: object) {
  return { consumeRecipient: vi.fn().mockResolvedValue(decision) }
}

async function refusal(promise: Promise<unknown>) {
  return promise.then(
    () => {
      throw new Error("expected a refusal")
    },
    (error: { statusCode?: number; body?: unknown; headers?: unknown }) => ({
      statusCode: error.statusCode,
      body: error.body,
      headers: error.headers,
    })
  )
}

describe("TST-AUTH-006 recipient request admission", () => {
  it("covers exactly the three explicit email-request endpoints", () => {
    expect(RECIPIENT_REQUEST_PATHS).toEqual([
      "/request-password-reset",
      "/send-verification-email",
      "/sign-in/magic-link",
    ])
  })

  it("charges the request budget before any account lookup and lets admitted requests continue", async () => {
    const store = admission({ allowed: true, retryAfter: null })
    await expect(
      admitRecipientRequest(store, "/request-password-reset", {
        email: "Someone@Example.test",
      })
    ).resolves.toBeUndefined()
    expect(store.consumeRecipient).toHaveBeenCalledWith(
      "request",
      "Someone@Example.test"
    )
  })

  it("ignores other endpoints and leaves malformed bodies to native validation", async () => {
    const store = admission({ allowed: true, retryAfter: null })
    await admitRecipientRequest(store, "/sign-in/email", { email: "a@b.test" })
    await admitRecipientRequest(store, "/request-password-reset", {})
    await admitRecipientRequest(store, "/request-password-reset", {
      email: "not-an-email",
    })
    expect(store.consumeRecipient).not.toHaveBeenCalled()
  })

  it("answers a limited recipient with the same safe 429 and wait for any address", async () => {
    await expect(
      refusal(
        admitRecipientRequest(
          admission({ allowed: false, retryAfter: 42, reason: "limited" }),
          "/sign-in/magic-link",
          { email: "unknown@example.test" }
        )
      )
    ).resolves.toEqual({
      statusCode: 429,
      body: {
        code: "RECIPIENT_COOLDOWN",
        message: "Please wait before requesting another email.",
      },
      headers: { "X-Retry-After": "42" },
    })
  })

  it("fails closed with generic retry guidance when the store is unavailable", async () => {
    const result = await refusal(
      admitRecipientRequest(
        admission({ allowed: false, retryAfter: null, reason: "unavailable" }),
        "/send-verification-email",
        { email: "someone@example.test" }
      )
    )
    expect(result).toEqual({
      statusCode: 503,
      body: {
        code: "EMAIL_TEMPORARILY_UNAVAILABLE",
        message: "Email is temporarily unavailable. Please try again later.",
      },
      headers: {},
    })
  })
})

describe("TST-AUTH-006 HTTP limiter options", () => {
  it("enables limits in every environment with the shared store and the reset-submission rule", () => {
    const customStorage = { consume: vi.fn() }
    expect(authRateLimitOptions(customStorage)).toEqual({
      enabled: true,
      customStorage,
      customRules: {
        "/reset-password": AUTH_ADMISSION_POLICY.resetSubmissionIp,
      },
    })
  })

  it("trusts only Vercel's proxy-owned client header on Vercel", () => {
    expect(authIpAddressOptions({ VERCEL: "1" })).toEqual({
      ipAddressHeaders: ["x-vercel-forwarded-for"],
    })
    expect(authIpAddressOptions({})).toEqual({})
  })
})
