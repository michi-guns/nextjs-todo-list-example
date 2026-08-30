import landingPageFixture from "@/sanity/fixtures/landingPage.json"
import type { SanityClient } from "next-sanity"
import { describe, expect, it, vi } from "vitest"

import {
  createSanityLandingContentRepository,
  LANDING_CONTENT_CACHE_TAG,
  LANDING_PAGE_QUERY,
  mapSanityLandingDocument,
} from "./sanity-landing-repository"
import { createSanityLandingContentRepositoryFromClient } from "./sanity-landing-source"

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

  it("rejects an incomplete payload missing a required field", () => {
    const payload = { ...landingPageFixture } as Record<string, unknown>
    delete payload.primaryCtaLabel

    expect(() => mapSanityLandingDocument(payload)).toThrow(
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

  it("uses the stable published query and cache tag for the Sanity client", async () => {
    const fetch = vi.fn().mockResolvedValue(landingPageFixture)
    const client = { fetch } as unknown as Pick<SanityClient, "fetch">
    const repository = createSanityLandingContentRepositoryFromClient(client)

    await repository.getPublishedLandingContent()

    expect(fetch).toHaveBeenCalledWith(
      LANDING_PAGE_QUERY,
      {},
      {
        next: {
          revalidate: false,
          tags: [LANDING_CONTENT_CACHE_TAG],
        },
      }
    )
  })
})
