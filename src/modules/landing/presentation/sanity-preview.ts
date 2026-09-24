import { createDataAttribute } from "next-sanity"

/** Plain `data-sanity` strings for the four editable landing fields. */
export interface LandingEditAttributes {
  readonly headline: string
  readonly blurb: string
  readonly primaryCtaLabel: string
  readonly secondaryCtaLabel: string
}

const FIELDS = [
  "headline",
  "blurb",
  "primaryCtaLabel",
  "secondaryCtaLabel",
] as const

/**
 * Built from fixed singleton metadata, not from fetched content, so no Sanity
 * type or raw document reaches the landing view model. Preview-only.
 */
export function landingEditAttributes(): LandingEditAttributes {
  return Object.fromEntries(
    FIELDS.map((path) => [
      path,
      createDataAttribute({
        id: "landingPage",
        type: "landingPage",
        path,
        baseUrl: "/studio",
      }).toString(),
    ])
  ) as unknown as LandingEditAttributes
}
