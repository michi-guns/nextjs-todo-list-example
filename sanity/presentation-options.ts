import type { PresentationPluginOptions } from "sanity/presentation"

/**
 * The Studio adds Presentation only when the public capability flag is on and
 * the dataset is `production`. This browser-side check reads no secret; the
 * server independently refuses Draft Mode wherever preview is not allowed.
 */
export function isEditorialPresentationEnabled(
  flag: string | undefined,
  dataset: string
): boolean {
  return flag === "true" && dataset === "production"
}

/** Same-origin Presentation for the landing singleton; shared access off. */
export const editorialPresentationOptions = {
  previewUrl: {
    initial: "/",
    previewMode: { enable: "/api/draft-mode/enable", shareAccess: false },
  },
  // The Studio and the application share one origin; trust only that one.
  allowOrigins: ({ origin }: { origin: string }) => [origin],
  resolve: {
    mainDocuments: [
      { route: "/", filter: '_id == "landingPage" && _type == "landingPage"' },
    ],
    locations: {
      landingPage: { locations: [{ title: "Landing page", href: "/" }] },
    },
  },
} satisfies PresentationPluginOptions
