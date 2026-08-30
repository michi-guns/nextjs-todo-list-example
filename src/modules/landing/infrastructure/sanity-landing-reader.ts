import { sanityClient } from "../../../sanity/client"
import {
  createSanityLandingContentRepository,
  LANDING_CONTENT_CACHE_TAG,
  LANDING_PAGE_QUERY,
} from "./sanity-landing-repository"
import {
  getLandingContent,
  type LandingContent,
} from "../application/get-landing-content"

const landingContentRepository = createSanityLandingContentRepository(() =>
  sanityClient.fetch(
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

export function getPublishedLandingContent(): Promise<LandingContent> {
  return getLandingContent(landingContentRepository)
}
