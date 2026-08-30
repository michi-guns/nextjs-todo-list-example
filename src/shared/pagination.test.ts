import { describe, expect, it } from "vitest"

import {
  DEFAULT_PAGE_LIMIT,
  InvalidPaginationError,
  MAX_PAGE_LIMIT,
  parsePaginationQuery,
  type Page,
} from "./pagination"

describe("shared pagination contracts", () => {
  it("uses the accepted default and maximum page limits", () => {
    expect(DEFAULT_PAGE_LIMIT).toBe(20)
    expect(MAX_PAGE_LIMIT).toBe(100)
    expect(parsePaginationQuery(new URLSearchParams())).toEqual({ limit: 20 })
    expect(
      parsePaginationQuery(new URLSearchParams("cursor=opaque&limit=1"))
    ).toEqual({ cursor: "opaque", limit: 1 })
    expect(parsePaginationQuery(new URLSearchParams("limit=100"))).toEqual({
      limit: 100,
    })
  })

  it("rejects invalid limits and blank cursor values", () => {
    for (const query of [
      "limit=0",
      "limit=101",
      "limit=1.5",
      "limit=not-a-number",
      "limit=",
      "cursor=   ",
    ]) {
      expect(() => parsePaginationQuery(new URLSearchParams(query))).toThrow(
        InvalidPaginationError
      )
    }
  })

  it("preserves the minimal page response shape", () => {
    const page: Page<string> = { items: ["first"], nextCursor: null }

    expect(page).toEqual({ items: ["first"], nextCursor: null })
  })
})
