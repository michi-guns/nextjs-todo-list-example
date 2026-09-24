import { createSanityClient } from "@/src/sanity/client-factory"
import { createEnableDraftModeHandler } from "@/src/sanity/draft-mode"
import { parseRuntimeEnvironment } from "@/src/shared/environment/runtime"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Resolved per request, so a disabled or refused profile never builds the
// Viewer client and needs no token.
export const GET = createEnableDraftModeHandler({
  editorialPreview: () => parseRuntimeEnvironment().editorialPreview,
  viewerClient: (token) => createSanityClient().withConfig({ token }),
})
