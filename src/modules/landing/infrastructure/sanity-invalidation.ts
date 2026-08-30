import "server-only"

import { revalidateTag } from "next/cache"

import { LANDING_CONTENT_CACHE_TAG } from "./sanity-landing-repository"

export { LANDING_CONTENT_CACHE_TAG }

export type RevalidateLandingTag = (tag: string, profile: { expire: 0 }) => void

export interface LandingContentInvalidationService {
  invalidate(): void
}

export function createLandingContentInvalidationService(
  revalidate: RevalidateLandingTag = revalidateTag
): LandingContentInvalidationService {
  return {
    invalidate() {
      revalidate(LANDING_CONTENT_CACHE_TAG, { expire: 0 })
    },
  }
}

export const landingContentInvalidationService =
  createLandingContentInvalidationService()
