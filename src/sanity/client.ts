import { createClient } from "next-sanity"

import { getSanityConfig } from "./config"

const { projectId, dataset, apiVersion } = getSanityConfig()

/**
 * Application-facing published-content client. Keep this module on the
 * server-side read path; Studio has its own client under the root `sanity/`.
 */
export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
})
