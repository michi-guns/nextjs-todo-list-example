import type { SanityClient } from "next-sanity"

import { probeCms, singleFlight } from "../../../shared/health/probes"
import {
  LANDING_PAGE_QUERY,
  mapSanityLandingDocument,
} from "./sanity-landing-repository"

/**
 * CMS availability: a fresh read of the published landing singleton through
 * the same query and validation as the page, but never through the CDN, the
 * indefinite `landing-content` cache or Draft Mode.
 */
export function createPublishedLandingProbe(
  client: Pick<SanityClient, "fetch">,
  options: { deadlineMs?: number } = {}
) {
  return singleFlight(() =>
    probeCms(
      (signal) =>
        client.fetch(
          LANDING_PAGE_QUERY,
          {},
          { signal, useCdn: false, cache: "no-store", perspective: "published" }
        ),
      mapSanityLandingDocument,
      options
    )
  )
}
