import type { SanityClient } from "next-sanity"

import {
  createSanityLandingContentRepository,
  LANDING_CONTENT_CACHE_TAG,
  LANDING_PAGE_QUERY,
} from "./sanity-landing-repository"

export function createSanityLandingContentRepositoryFromClient(
  client: Pick<SanityClient, "fetch">
) {
  return createSanityLandingContentRepository(() =>
    client.fetch(
      LANDING_PAGE_QUERY,
      {},
      {
        next: {
          revalidate: false,
          tags: [LANDING_CONTENT_CACHE_TAG],
        },
      }
    )
  )
}
