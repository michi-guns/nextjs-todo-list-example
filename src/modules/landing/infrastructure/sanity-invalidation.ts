import "server-only"

import { revalidateTag } from "next/cache"

import { LANDING_CONTENT_CACHE_TAG } from "./sanity-landing-repository"

export { LANDING_CONTENT_CACHE_TAG }

export type RevalidateLandingTag = (tag: string, profile: "max") => void

export interface LandingContentInvalidationService {
  invalidate(): void
}

export function createLandingContentInvalidationService(
  revalidate: RevalidateLandingTag = revalidateTag
): LandingContentInvalidationService {
  return {
    invalidate() {
      revalidate(LANDING_CONTENT_CACHE_TAG, "max")
    },
  }
}

export const landingContentInvalidationService =
  createLandingContentInvalidationService()
