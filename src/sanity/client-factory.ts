import { createClient } from "next-sanity"

import { getSanityConfig } from "./config"

/**
 * Shared Node-safe constructor used by the server-only app client and the
 * read-only CLI smoke. Application server code should use `client.ts`; browser
 * code must use neither module.
 */
export function createSanityClient(
  environment: Record<string, string | undefined> = process.env
) {
  const { projectId, dataset, apiVersion } = getSanityConfig(environment)

  return createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: false,
  })
}
