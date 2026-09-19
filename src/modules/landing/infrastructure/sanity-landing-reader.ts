import {
  getLandingContent,
  type LandingContent,
} from "../application/get-landing-content"
import { observeOperation } from "../../../shared/logging/operation"

const PLAYWRIGHT_LANDING_CONTENT: LandingContent = {
  headline: "Make progress visible.",
  blurb: "Keep personal tasks clear, focused, and moving forward.",
  primaryCtaLabel: "Get started",
  secondaryCtaLabel: "Sign in",
}

export async function getPublishedLandingContent(
  environment: Record<string, string | undefined> = process.env
): Promise<LandingContent> {
  if (
    environment.PLAYWRIGHT_E2E === "true" &&
    environment.NODE_ENV !== "production"
  ) {
    return PLAYWRIGHT_LANDING_CONTENT
  }

  return observeOperation("sanity", "sanity.read", async () => {
    const { sanityClient } = await import("../../../sanity/client")
    const { createSanityLandingContentRepositoryFromClient } =
      await import("./sanity-landing-source")
    const landingContentRepository =
      createSanityLandingContentRepositoryFromClient(sanityClient)
    return getLandingContent(landingContentRepository)
  })
}
