import { describe, expect, it } from "vitest"

import { redactAuthTokens } from "./browser-diagnostics"

describe("browser diagnostic token redaction", () => {
  it("retains useful request diagnostics without the verification credential", () => {
    expect(
      redactAuthTokens(
        "requestfailed: GET http://localhost:3100/api/auth/verify-email?token=secret.jwt.value&callbackURL=%2Fdashboard (net::ERR_CONNECTION_RESET)"
      )
    ).toBe(
      "requestfailed: GET http://localhost:3100/api/auth/verify-email?token=[redacted]&callbackURL=%2Fdashboard (net::ERR_CONNECTION_RESET)"
    )
  })

  it("redacts multiple token query values in console and page errors", () => {
    expect(
      redactAuthTokens(
        'Failed "https://example.test/?token=first"\nhttps://example.test/?a=1&token=second'
      )
    ).toBe(
      'Failed "https://example.test/?token=[redacted]"\nhttps://example.test/?a=1&token=[redacted]'
    )
  })

  it("preserves diagnostics without a credential query value", () => {
    expect(redactAuthTokens("GET /dashboard failed with status 500")).toBe(
      "GET /dashboard failed with status 500"
    )
  })
})
