import { describe, expect, it } from "vitest"

import { appendPage, resetPage, type PageState } from "./dashboard-state"

describe("dashboard pagination state", () => {
  it("replaces the current page and cursor when the context changes", () => {
    const current: PageState<string> = {
      items: ["old-1", "old-2"],
      nextCursor: "old-next",
    }

    expect(
      resetPage(current, { items: ["new-1"], nextCursor: "new-next" })
    ).toEqual({ items: ["new-1"], nextCursor: "new-next" })
  })

  it("appends a continuation page without changing server order", () => {
    const current: PageState<string> = {
      items: ["first", "second"],
      nextCursor: "cursor-2",
    }

    expect(
      appendPage(current, { items: ["third", "fourth"], nextCursor: null })
    ).toEqual({
      items: ["first", "second", "third", "fourth"],
      nextCursor: null,
    })
  })

  it("does not duplicate an item that was added before its cursor was loaded", () => {
    const current: PageState<{ id: string }> = {
      items: [{ id: "first" }, { id: "new" }],
      nextCursor: "cursor-2",
    }

    expect(
      appendPage(
        current,
        { items: [{ id: "new" }, { id: "later" }], nextCursor: null },
        (item) => item.id
      )
    ).toEqual({
      items: [{ id: "first" }, { id: "new" }, { id: "later" }],
      nextCursor: null,
    })
  })
})
