const DEFAULT_API_VERSION = "2026-08-27"

export interface SanityConfig {
  readonly projectId: string
  readonly dataset: string
  readonly apiVersion: string
}

export function getSanityConfig(
  environment: Record<string, string | undefined> = process.env
): SanityConfig {
  const projectId = environment.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim()
  const dataset = environment.NEXT_PUBLIC_SANITY_DATASET?.trim()
  const apiVersion =
    environment.NEXT_PUBLIC_SANITY_API_VERSION?.trim() || DEFAULT_API_VERSION

  if (!projectId) {
    throw new Error("Missing NEXT_PUBLIC_SANITY_PROJECT_ID")
  }

  if (!dataset) {
    throw new Error("Missing NEXT_PUBLIC_SANITY_DATASET")
  }

  return { projectId, dataset, apiVersion }
}
