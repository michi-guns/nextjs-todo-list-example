import landingPageFixture from "@/sanity/fixtures/landingPage.json"
import { describe, expect, it } from "vitest"

import {
  createSanityLandingContentRepository,
  mapSanityLandingDocument,
} from "./sanity-landing-repository"

describe("mapSanityLandingDocument", () => {
  it("maps a valid unknown payload to only the landing view model", () => {
    const payload = {
      ...landingPageFixture,
      _rev: "provider-revision",
      createdAt: "2026-08-30T00:00:00Z",
      unrelatedProviderField: { shouldNot: "leak" },
    }

    expect(mapSanityLandingDocument(payload)).toEqual({
      headline: "Make progress visible.",
      blurb: "Keep personal tasks clear, focused, and moving forward.",
      primaryCtaLabel: "Get started",
      secondaryCtaLabel: "Sign in",
    })
  })

  it("keeps the optional secondary CTA absent when the provider omits it", () => {
    const payload = { ...landingPageFixture } as Record<string, unknown>
    delete payload.secondaryCtaLabel

    expect(mapSanityLandingDocument(payload)).toEqual({
      headline: "Make progress visible.",
      blurb: "Keep personal tasks clear, focused, and moving forward.",
      primaryCtaLabel: "Get started",
    })
  })

  it("treats a null optional secondary CTA as absent", () => {
    const payload = { ...landingPageFixture, secondaryCtaLabel: null }

    expect(mapSanityLandingDocument(payload)).toEqual({
      headline: "Make progress visible.",
      blurb: "Keep personal tasks clear, focused, and moving forward.",
      primaryCtaLabel: "Get started",
    })
  })

  it("rejects a required field with the wrong type", () => {
    const payload = { ...landingPageFixture, headline: 42 }

    expect(() => mapSanityLandingDocument(payload)).toThrow(
      "Invalid Sanity landingPage payload"
    )
  })

  it("rejects a required field containing only whitespace", () => {
    const payload = { ...landingPageFixture, blurb: "   " }

    expect(() => mapSanityLandingDocument(payload)).toThrow(
      "Invalid Sanity landingPage payload"
    )
  })

  it("rejects an invalid optional field instead of leaking it", () => {
    const payload = { ...landingPageFixture, secondaryCtaLabel: 123 }

    expect(() => mapSanityLandingDocument(payload)).toThrow(
      "Invalid Sanity landingPage payload"
    )
  })

  it("rejects a payload for a different Sanity document", () => {
    const payload = { ...landingPageFixture, _id: "another-document" }

    expect(() => mapSanityLandingDocument(payload)).toThrow(
      "Invalid Sanity landingPage payload"
    )
  })

  it("rejects a missing payload", () => {
    expect(() => mapSanityLandingDocument(null)).toThrow(
      "Invalid Sanity landingPage payload"
    )
  })

  it("maps content returned by the repository's published-read port", async () => {
    const repository = createSanityLandingContentRepository(
      async () => landingPageFixture
    )

    await expect(repository.getPublishedLandingContent()).resolves.toEqual({
      headline: "Make progress visible.",
      blurb: "Keep personal tasks clear, focused, and moving forward.",
      primaryCtaLabel: "Get started",
      secondaryCtaLabel: "Sign in",
    })
  })
})
