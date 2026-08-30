import { vi } from "vitest"

vi.mock("server-only", () => ({}))

const { revalidateTag } = vi.hoisted(() => ({
  revalidateTag: vi.fn(),
}))

vi.mock("next/cache", () => ({ revalidateTag }))

import { describe, expect, it } from "vitest"

import {
  createLandingContentInvalidationService,
  LANDING_CONTENT_CACHE_TAG,
} from "./sanity-invalidation"

describe("createLandingContentInvalidationService", () => {
  it("revalidates the stable landing tag with the content profile", () => {
    const service = createLandingContentInvalidationService(revalidateTag)

    service.invalidate()
    service.invalidate()

    expect(revalidateTag).toHaveBeenNthCalledWith(
      1,
      LANDING_CONTENT_CACHE_TAG,
      { expire: 0 }
    )
    expect(revalidateTag).toHaveBeenNthCalledWith(
      2,
      LANDING_CONTENT_CACHE_TAG,
      { expire: 0 }
    )
  })
})
