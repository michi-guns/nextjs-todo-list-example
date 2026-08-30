import type { LandingContent } from "../domain/landing-content"

export interface LandingContentRepository {
  getPublishedLandingContent(): Promise<LandingContent>
}

export function getLandingContent(
  repository: LandingContentRepository
): Promise<LandingContent> {
  return repository.getPublishedLandingContent()
}

export type { LandingContent }
