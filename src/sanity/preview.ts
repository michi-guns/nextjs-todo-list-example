import "server-only"

import { defineLive } from "next-sanity/live"

import { createSanityClient } from "./client-factory"

let live: { token: string; value: ReturnType<typeof defineLive> } | undefined

/**
 * Live preview composition for an authorized editorial request only. The
 * read-only Viewer token serves both the server fetch and the editor's
 * browser subscription; published pages never call this.
 */
export function editorialLive(token: string) {
  if (live?.token !== token) {
    const client = createSanityClient().withConfig({ token })
    live = {
      token,
      value: defineLive({ client, serverToken: token, browserToken: token }),
    }
  }
  return live.value
}
