import { describe, expect, it } from "vitest"

import {
  isBrowserRequestCancellation,
  redactAuthTokens,
} from "./browser-diagnostics"

describe("browser request cancellation", () => {
  const script = {
    method: "GET",
    resourceType: "script",
    url: "http://127.0.0.1:3100/_next/static/chunks/app.js",
  }
  it("recognizes Firefox cancelling a Next.js chunk on navigation", () => {
    expect(isBrowserRequestCancellation("NS_BINDING_ABORTED", script)).toBe(
      true
    )
  })
  it("retains the existing Chromium cancellation policy", () => {
    expect(isBrowserRequestCancellation("net::ERR_ABORTED", script)).toBe(true)
  })
  it.each([
    ["NS_ERROR_CONNECTION_REFUSED", script],
    [
      "NS_BINDING_ABORTED",
      {
        ...script,
        resourceType: "fetch",
        url: "http://127.0.0.1:3100/api/lists",
      },
    ],
    ["NS_BINDING_ABORTED", { ...script, method: "POST" }],
    [undefined, script],
  ])("retains real or unknown network diagnostics", (failure, request) => {
    expect(isBrowserRequestCancellation(failure, request)).toBe(false)
  })
})

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
