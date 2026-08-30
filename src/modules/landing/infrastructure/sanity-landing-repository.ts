import { z } from "zod"

import type { LandingContentRepository } from "../application/get-landing-content"
import type { LandingContent } from "../domain/landing-content"

export const LANDING_PAGE_QUERY =
  '*[_id == "landingPage" && _type == "landingPage"][0]{_id,_type,headline,blurb,primaryCtaLabel,secondaryCtaLabel}'

export const LANDING_CONTENT_CACHE_TAG = "landing-content"

const nonBlankString = z.string().trim().min(1)

const sanityLandingDocumentSchema = z.object({
  _id: z.literal("landingPage"),
  _type: z.literal("landingPage"),
  headline: nonBlankString,
  blurb: nonBlankString,
  primaryCtaLabel: nonBlankString,
  secondaryCtaLabel: z.string().trim().optional().nullable(),
})

export function mapSanityLandingDocument(input: unknown): LandingContent {
  const result = sanityLandingDocumentSchema.safeParse(input)

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join(".") : "document"
        return `${path}: ${issue.message}`
      })
      .join("; ")

    throw new Error(`Invalid Sanity landingPage payload: ${issues}`)
  }

  const content: LandingContent = {
    headline: result.data.headline,
    blurb: result.data.blurb,
    primaryCtaLabel: result.data.primaryCtaLabel,
  }

  if (
    result.data.secondaryCtaLabel !== undefined &&
    result.data.secondaryCtaLabel !== null
  ) {
    return {
      ...content,
      secondaryCtaLabel: result.data.secondaryCtaLabel,
    }
  }

  return content
}

export function createSanityLandingContentRepository(
  fetchPublishedLandingPage: () => Promise<unknown>
): LandingContentRepository {
  return {
    async getPublishedLandingContent() {
      return mapSanityLandingDocument(await fetchPublishedLandingPage())
    },
  }
}
