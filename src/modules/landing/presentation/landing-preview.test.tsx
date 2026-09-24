import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { LandingPage } from "@/components/landing/landing-page"
import {
  editorialPresentationOptions,
  isEditorialPresentationEnabled,
} from "@/sanity/presentation-options"
import { isEditorialPreviewSession } from "@/src/sanity/preview-config"

import { readLandingPreview } from "../infrastructure/sanity-landing-preview-reader"
import { landingEditAttributes } from "./sanity-preview"

const content = {
  headline: "Make progress visible.",
  blurb: "Keep personal tasks clear.",
  primaryCtaLabel: "Get started",
}

describe("TST-LANDING-004 preview field attributes", () => {
  it("builds four Studio field links for the singleton, relative to /studio", () => {
    const attributes = landingEditAttributes()
    expect(Object.keys(attributes)).toEqual([
      "headline",
      "blurb",
      "primaryCtaLabel",
      "secondaryCtaLabel",
    ])
    for (const [field, value] of Object.entries(attributes)) {
      expect(value).toContain("id=landingPage")
      expect(value).toContain("type=landingPage")
      expect(value).toContain(`path=${field}`)
      expect(value).toContain("base=%2Fstudio")
    }
  })

  it("renders editing attributes only when given, never on the public page", () => {
    const publicHtml = renderToStaticMarkup(<LandingPage content={content} />)
    expect(publicHtml).not.toContain("data-sanity")
    const previewHtml = renderToStaticMarkup(
      <LandingPage content={content} editAttributes={landingEditAttributes()} />
    )
    expect(previewHtml.match(/data-sanity=/g)).toHaveLength(4)
    // The optional CTA's fallback text still points to its source field.
    expect(previewHtml).toContain("path=secondaryCtaLabel")
    expect(previewHtml).toContain(">Sign in<")
  })
})

describe("TST-LANDING-004 preview reader", () => {
  it("fetches without stega and maps through the published validator", async () => {
    const sanityFetch = vi.fn().mockResolvedValue({
      data: { _id: "landingPage", _type: "landingPage", ...content },
    })
    await expect(readLandingPreview(sanityFetch)).resolves.toEqual(content)
    expect(sanityFetch).toHaveBeenCalledWith(
      expect.objectContaining({ stega: false })
    )
    expect(sanityFetch.mock.calls[0][0].query).toContain('_id == "landingPage"')
  })

  it("rejects an invalid draft instead of rendering raw data", async () => {
    const sanityFetch = vi.fn().mockResolvedValue({
      data: { _id: "landingPage", _type: "landingPage", headline: " " },
    })
    await expect(readLandingPreview(sanityFetch)).rejects.toThrow(
      /Invalid Sanity landingPage payload/
    )
  })
})

describe("TST-LANDING-004 preview session selection", () => {
  it("previews only with Draft Mode on and the capability enabled", () => {
    const enabled = { enabled: true, token: "sk-viewer" } as const
    expect(isEditorialPreviewSession(true, enabled)).toBe(true)
    expect(isEditorialPreviewSession(false, enabled)).toBe(false)
    expect(isEditorialPreviewSession(true, { enabled: false })).toBe(false)
  })
})

describe("TST-LANDING-004 Studio Presentation", () => {
  it("adds Presentation only for the enabled production dataset", () => {
    expect(isEditorialPresentationEnabled("true", "production")).toBe(true)
    expect(isEditorialPresentationEnabled("false", "production")).toBe(false)
    expect(isEditorialPresentationEnabled(undefined, "production")).toBe(false)
    expect(isEditorialPresentationEnabled("true", "preview")).toBe(false)
  })

  it("uses same-origin Draft Mode entry without shared access and maps the singleton to /", async () => {
    const options = editorialPresentationOptions
    expect(options.previewUrl).toMatchObject({
      initial: "/",
      previewMode: { enable: "/api/draft-mode/enable", shareAccess: false },
    })
    const allow = options.allowOrigins as (context: {
      origin: string
    }) => string[]
    expect(allow({ origin: "https://app.example" })).toEqual([
      "https://app.example",
    ])
    expect(options.resolve?.mainDocuments).toEqual([
      { route: "/", filter: '_id == "landingPage" && _type == "landingPage"' },
    ])
    expect(options.resolve?.locations).toEqual({
      landingPage: { locations: [{ title: "Landing page", href: "/" }] },
    })
    expect(JSON.stringify(options)).not.toMatch(/token|secret/i)
  })
})
