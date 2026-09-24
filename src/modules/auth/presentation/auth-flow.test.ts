import { describe, expect, it } from "vitest"

import {
  DEFAULT_AUTH_REDIRECT,
  buildVerificationCallback,
  getAuthErrorMessage,
  getRecoveryLinkError,
  getSafeAuthRedirect,
} from "./auth-flow"

describe("getSafeAuthRedirect", () => {
  it("uses the dashboard when no redirect was supplied", () => {
    expect(getSafeAuthRedirect(undefined)).toBe(DEFAULT_AUTH_REDIRECT)
    expect(getSafeAuthRedirect(null)).toBe(DEFAULT_AUTH_REDIRECT)
    expect(getSafeAuthRedirect("  ")).toBe(DEFAULT_AUTH_REDIRECT)
  })

  it("preserves an internal path with its query and hash", () => {
    expect(getSafeAuthRedirect("/dashboard?view=tasks#today")).toBe(
      "/dashboard?view=tasks#today"
    )
  })

  it.each([
    "https://example.com/account",
    "//example.com/account",
    "/\\\\example.com/account",
    "javascript:alert(1)",
    "/%2F%2Fexample.com/account",
    "/%5C%5Cexample.com/account",
    "/%00account",
    "/bad%2",
  ])("rejects unsafe or malformed redirect %s", (candidate) => {
    expect(getSafeAuthRedirect(candidate)).toBe(DEFAULT_AUTH_REDIRECT)
  })

  it("rejects non-string query values", () => {
    expect(getSafeAuthRedirect(["/dashboard"])).toBe(DEFAULT_AUTH_REDIRECT)
  })
})

describe("getAuthErrorMessage", () => {
  it("maps known provider outcomes to stable user-facing messages", () => {
    expect(getAuthErrorMessage({ code: "EMAIL_NOT_VERIFIED" })).toBe(
      "Check your email to verify your account before signing in."
    )
    expect(getAuthErrorMessage({ code: "INVALID_EMAIL_OR_PASSWORD" })).toBe(
      "The email or password is incorrect."
    )
    expect(getAuthErrorMessage({ code: "INVALID_TOKEN" })).toBe(
      "That link is invalid or has expired. Request a new link and try again."
    )
  })

  it("does not surface arbitrary provider messages", () => {
    expect(
      getAuthErrorMessage({
        code: "UNEXPECTED_PROVIDER_DETAIL",
        message: "database password leaked",
      })
    ).toBe("Something went wrong. Please try again.")
  })

  it("handles rate limits without exposing provider details", () => {
    expect(getAuthErrorMessage({ status: 429 })).toBe(
      "Too many attempts. Wait a moment and try again."
    )
  })
})

describe("TST-AUTH-005/006 recovery vocabulary", () => {
  it("explains a recipient cooldown and a temporary email outage before the generic limit", () => {
    expect(
      getAuthErrorMessage({ code: "RECIPIENT_COOLDOWN", status: 429 })
    ).toBe(
      "An email was sent recently. Wait a minute before requesting another."
    )
    expect(
      getAuthErrorMessage({
        code: "EMAIL_TEMPORARILY_UNAVAILABLE",
        status: 503,
      })
    ).toBe("Email is temporarily unavailable. Please try again later.")
    expect(getAuthErrorMessage({ code: "TOKEN_EXPIRED" })).toBe(
      "That link has expired. Request a new link and try again."
    )
  })

  it("routes verification callbacks through the recovery page with a safe next path", () => {
    expect(buildVerificationCallback("/dashboard?list=2")).toBe(
      "/verify-email?next=%2Fdashboard%3Flist%3D2"
    )
    expect(buildVerificationCallback("https://evil.example/")).toBe(
      "/verify-email?next=%2Fdashboard"
    )
  })

  it("accepts only the small public link-error vocabulary", () => {
    expect(getRecoveryLinkError("TOKEN_EXPIRED")).toBe("TOKEN_EXPIRED")
    expect(getRecoveryLinkError("INVALID_TOKEN")).toBe("INVALID_TOKEN")
    expect(getRecoveryLinkError(["INVALID_TOKEN"])).toBe("INVALID_TOKEN")
    expect(getRecoveryLinkError("USER_NOT_FOUND")).toBe("INVALID_TOKEN")
    expect(getRecoveryLinkError("<script>")).toBe("INVALID_TOKEN")
    expect(getRecoveryLinkError(undefined)).toBeNull()
  })
})
