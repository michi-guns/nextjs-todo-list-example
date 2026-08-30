import { describe, expect, it } from "vitest"

import {
  getLandingContent,
  type LandingContentRepository,
} from "./get-landing-content"

describe("getLandingContent", () => {
  it("returns the published content from its repository port", async () => {
    const content = {
      headline: "Make progress visible.",
      blurb: "Keep personal tasks clear, focused, and moving forward.",
      primaryCtaLabel: "Get started",
    }
    const repository: LandingContentRepository = {
      getPublishedLandingContent: async () => content,
    }

    await expect(getLandingContent(repository)).resolves.toBe(content)
  })
})
