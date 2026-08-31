import { describe, expect, it } from "vitest"

import { getPublishedLandingContent } from "./sanity-landing-reader"

describe("getPublishedLandingContent", () => {
  it("uses deterministic local content for the Playwright runtime", async () => {
    await expect(
      getPublishedLandingContent({
        NODE_ENV: "development",
        PLAYWRIGHT_E2E: "true",
      })
    ).resolves.toEqual({
      headline: "Make progress visible.",
      blurb: "Keep personal tasks clear, focused, and moving forward.",
      primaryCtaLabel: "Get started",
      secondaryCtaLabel: "Sign in",
    })
  })

  it("never uses the local fixture in production", async () => {
    await expect(
      getPublishedLandingContent({
        NODE_ENV: "production",
        PLAYWRIGHT_E2E: "true",
      })
    ).rejects.toThrow()
  })
})
