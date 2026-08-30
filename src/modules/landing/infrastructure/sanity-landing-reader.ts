import { sanityClient } from "../../../sanity/client"
import { createSanityLandingContentRepositoryFromClient } from "./sanity-landing-source"
import {
  getLandingContent,
  type LandingContent,
} from "../application/get-landing-content"

const landingContentRepository =
  createSanityLandingContentRepositoryFromClient(sanityClient)

export function getPublishedLandingContent(): Promise<LandingContent> {
  return getLandingContent(landingContentRepository)
}
