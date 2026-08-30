"use client"

import { createAuthClient } from "better-auth/react"
import { magicLinkClient } from "better-auth/client/plugins"

/**
 * The browser boundary exposes Better Auth actions only. Server records,
 * provider configuration, and database types stay behind `lib/auth.ts`.
 */
export const authClient = createAuthClient({
  disableDefaultFetchPlugins: true,
  plugins: [magicLinkClient()],
})
