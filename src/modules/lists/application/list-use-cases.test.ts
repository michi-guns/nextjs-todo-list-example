import { describe, expect, it } from "vitest"

import type { List } from "../domain/list"
import {
  InvalidListNameError,
  InvalidPageRequestError,
  ListConflictError,
  ListNotFoundError,
} from "../domain/list-errors"
import type { ListRepository, Page, PageRequest } from "./list-repository"
import {
  createListApplication,
  normalizeListName,
  normalizePageRequest,
} from "./list-use-cases"

const now = new Date("2026-08-30T12:00:00.000Z")

function makeList(overrides: Partial<List> = {}): List {
  return {
    id: "0198f2c0-3a6b-7000-8000-000000000001",
    userId: "user-a",
    name: "Inbox",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function createRepository(
  overrides: Partial<ListRepository> = {}
): ListRepository & {
  calls: {
    ensureDefaultInbox: Array<{ userId: string; now: Date }>
    listByUser: Array<{ userId: string; page: PageRequest }>
    insert: Array<{ userId: string; name: string; now: Date }>
    rename: Array<{
      userId: string
      listId: string
      name: string
      now: Date
    }>
    delete: Array<{ userId: string; listId: string }>
  }
} {
  const calls = {
    ensureDefaultInbox: [] as Array<{ userId: string; now: Date }>,
    listByUser: [] as Array<{ userId: string; page: PageRequest }>,
    insert: [] as Array<{ userId: string; name: string; now: Date }>,
    rename: [] as Array<{
      userId: string
      listId: string
      name: string
      now: Date
    }>,
    delete: [] as Array<{ userId: string; listId: string }>,
  }

  const list = makeList()
  const page: Page<List> = { items: [list], nextCursor: null }

  return {
    calls,
    ensureDefaultInbox: async (userId, timestamp) => {
      calls.ensureDefaultInbox.push({ userId, now: timestamp })
      return list
    },
    listByUser: async (userId, request) => {
      calls.listByUser.push({ userId, page: request })
      return page
    },
    findByIdForUser: async () => list,
    insert: async (input) => {
      calls.insert.push(input)
      return list
    },
    rename: async (userId, listId, name, timestamp) => {
      calls.rename.push({ userId, listId, name, now: timestamp })
      return { ...list, id: listId, userId, name, updatedAt: timestamp }
    },
    delete: async (userId, listId) => {
      calls.delete.push({ userId, listId })
      return true
    },
    ...overrides,
  }
}

describe("list domain and application", () => {
  it("trims a valid list name while preserving the display value", () => {
    expect(normalizeListName("  Personal  ")).toBe("Personal")
  })

  it("rejects blank and overlong list names", () => {
    expect(() => normalizeListName("   ")).toThrow(InvalidListNameError)
    expect(() => normalizeListName("a".repeat(81))).toThrow(
      InvalidListNameError
    )
  })

  it("normalizes omitted and valid page limits", () => {
    expect(normalizePageRequest()).toEqual({ limit: 20 })
    expect(normalizePageRequest({ cursor: "opaque", limit: 100 })).toEqual({
      cursor: "opaque",
      limit: 100,
    })
  })

  it("rejects limits outside the inclusive one-to-one-hundred range", () => {
    expect(() => normalizePageRequest({ limit: 0 })).toThrow(
      InvalidPageRequestError
    )
    expect(() => normalizePageRequest({ limit: 101 })).toThrow(
      InvalidPageRequestError
    )
    expect(() => normalizePageRequest({ limit: 1.5 })).toThrow(
      InvalidPageRequestError
    )
  })

  it("passes the authenticated owner and clock to default Inbox creation", async () => {
    const repository = createRepository()
    const application = createListApplication(repository, () => now)

    await expect(application.ensureDefaultInbox("user-a")).resolves.toEqual(
      expect.objectContaining({ name: "Inbox" })
    )
    expect(repository.calls.ensureDefaultInbox).toEqual([
      { userId: "user-a", now },
    ])
  })

  it("validates and forwards owner-scoped list operations", async () => {
    const repository = createRepository()
    const application = createListApplication(repository, () => now)

    await application.listLists("user-a", { limit: 5 })
    await application.createList("user-a", { name: "  Projects  " })
    await application.renameList("user-a", "list-1", { name: "  Archive " })
    await application.deleteList("user-a", "list-1")

    expect(repository.calls.listByUser).toEqual([
      { userId: "user-a", page: { limit: 5 } },
    ])
    expect(repository.calls.insert).toEqual([
      { userId: "user-a", name: "Projects", now },
    ])
    expect(repository.calls.rename).toEqual([
      { userId: "user-a", listId: "list-1", name: "Archive", now },
    ])
    expect(repository.calls.delete).toEqual([
      { userId: "user-a", listId: "list-1" },
    ])
  })

  it("maps missing and duplicate list outcomes without revealing ownership", async () => {
    const missingRepository = createRepository({
      rename: async () => null,
      delete: async () => false,
    })
    const missingApplication = createListApplication(missingRepository)

    await expect(
      missingApplication.renameList("user-a", "missing", { name: "Archive" })
    ).rejects.toBeInstanceOf(ListNotFoundError)
    await expect(
      missingApplication.deleteList("user-a", "missing")
    ).rejects.toBeInstanceOf(ListNotFoundError)

    const conflictRepository = createRepository({
      insert: async () => {
        throw new ListConflictError()
      },
      rename: async () => {
        throw new ListConflictError()
      },
    })
    const conflictApplication = createListApplication(conflictRepository)

    await expect(
      conflictApplication.createList("user-a", { name: "Projects" })
    ).rejects.toBeInstanceOf(ListConflictError)
    await expect(
      conflictApplication.renameList("user-a", "list-1", { name: "Projects" })
    ).rejects.toBeInstanceOf(ListConflictError)
  })
})
