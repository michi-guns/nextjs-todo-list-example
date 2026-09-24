import "server-only"

import type { SanityClient } from "next-sanity"
import { defineEnableDraftMode } from "next-sanity/draft-mode"
import { draftMode } from "next/headers"
import { redirect, unstable_rethrow } from "next/navigation"

import type { EditorialPreview } from "./preview-config"

// Query names the installed @sanity/preview-url-secret helper reads.
const SECRET_PARAM = "sanity-preview-secret"
const PATHNAME_PARAM = "sanity-preview-pathname"

/**
 * The helper logs the whole request URL (secret included) in development
 * when it cannot parse it. Refuse those shapes first; everything else,
 * including relative redirect normalization, stays with the helper.
 */
function isWellFormedPreviewRequest(requestUrl: string): boolean {
  let url: URL
  try {
    url = new URL(requestUrl)
  } catch {
    return false
  }
  if (!url.searchParams.get(SECRET_PARAM)?.trim()) return false
  const pathname = url.searchParams.get(PATHNAME_PARAM)
  if (pathname) {
    try {
      new URL(pathname, "http://localhost")
    } catch {
      return false
    }
  }
  return true
}

const quiet = (status: number, body: string) =>
  new Response(body, {
    status,
    headers: { "cache-control": "no-store", "content-type": "text/plain" },
  })

/**
 * Draft Mode entry. Editorial preview must be enabled for this profile
 * (Local, Development or Production; never deployment Preview) and the
 * Studio-issued secret must pass the native Sanity check. A public flag or a
 * Better Auth session alone grants nothing.
 */
export function createEnableDraftModeHandler(dependencies: {
  editorialPreview: () => EditorialPreview
  viewerClient: (token: string) => SanityClient
  /** Fixed, detail-free signal so an expired Viewer token is visible. */
  onUnavailable?: () => void
}) {
  return async function GET(request: Request): Promise<Response> {
    let preview: EditorialPreview
    try {
      preview = dependencies.editorialPreview()
    } catch {
      return quiet(404, "Not found")
    }
    if (!preview.enabled) return quiet(404, "Not found")
    if (!isWellFormedPreviewRequest(request.url))
      return quiet(401, "Invalid preview request")
    try {
      const { GET: enable } = defineEnableDraftMode({
        client: dependencies.viewerClient(preview.token),
      })
      return await enable(request)
    } catch (error) {
      // The successful path ends in Next's redirect; let it through.
      unstable_rethrow(error)
      // Provider errors can carry request details; report nothing specific.
      try {
        dependencies.onUnavailable?.()
      } catch {
        /* Diagnostics never replace the answer. */
      }
      return quiet(503, "Preview is temporarily unavailable")
    }
  }
}

/** Draft Mode exit: turn it off and return to the published landing page. */
export async function disableDraftMode(): Promise<never> {
  ;(await draftMode()).disable()
  redirect("/")
}
