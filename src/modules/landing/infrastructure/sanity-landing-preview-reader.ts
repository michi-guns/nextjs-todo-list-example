import type { LandingContent } from "../domain/landing-content"
import {
  LANDING_PAGE_QUERY,
  mapSanityLandingDocument,
} from "./sanity-landing-repository"

/** The part of `defineLive`'s `sanityFetch` this reader needs. */
export type PreviewFetch = (options: {
  query: typeof LANDING_PAGE_QUERY
  stega: false
}) => Promise<{ data: unknown }>

/**
 * Draft-aware landing read for an authorized editorial session. The
 * perspective comes from the Studio cookie inside Draft Mode; stega stays off
 * so the published validator sees clean strings. No raw document leaves here.
 */
export async function readLandingPreview(
  sanityFetch: PreviewFetch
): Promise<LandingContent> {
  const { data } = await sanityFetch({
    query: LANDING_PAGE_QUERY,
    stega: false,
  })
  return mapSanityLandingDocument(data)
}
