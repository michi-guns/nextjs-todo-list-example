import "server-only"

import { parseRuntimeEnvironment } from "../shared/environment/runtime"
import { createSanityClient } from "./client-factory"

/**
 * Application-facing published-content client. Keep this module on the
 * server-side read path; Studio has its own client under the root `sanity/`.
 */
// The dataset/read policy is checked with the rest of the profile first.
parseRuntimeEnvironment()
export const sanityClient = createSanityClient()
