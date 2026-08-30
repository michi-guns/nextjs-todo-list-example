import "server-only"

import { createSanityClient } from "./client-factory"

/**
 * Application-facing published-content client. Keep this module on the
 * server-side read path; Studio has its own client under the root `sanity/`.
 */
export const sanityClient = createSanityClient()
