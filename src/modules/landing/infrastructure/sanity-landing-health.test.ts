import { describe, expect, it, vi } from "vitest"

import { createPublishedLandingProbe } from "./sanity-landing-health"
import { LANDING_PAGE_QUERY } from "./sanity-landing-repository"

describe("TST-RUNTIME-001 CMS probe freshness", () => {
  it("bypasses the CDN, the Next data cache and drafts on every read", async () => {
    const fetch = vi.fn(async (..._args: unknown[]) => ({
      _id: "landingPage",
      _type: "landingPage",
      headline: "h",
      blurb: "b",
      primaryCtaLabel: "c",
    }))
    const client = { fetch } as unknown as Parameters<
      typeof createPublishedLandingProbe
    >[0]
    await expect(createPublishedLandingProbe(client)()).resolves.toEqual({
      status: "ok",
    })
    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      LANDING_PAGE_QUERY,
      {},
      {
        signal: expect.any(AbortSignal),
        useCdn: false,
        cache: "no-store",
        perspective: "published",
      }
    )
    // Never the page's indefinitely cached `next: { tags, revalidate }` read.
    expect(fetch.mock.calls[0]).not.toContainEqual(
      expect.objectContaining({ next: expect.anything() })
    )
  })
})
