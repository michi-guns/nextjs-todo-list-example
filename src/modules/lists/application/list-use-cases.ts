import type { List } from "../domain/list"
import {
  InvalidListNameError,
  InvalidPageRequestError,
  ListConflictError,
  ListNotFoundError,
} from "../domain/list-errors"
import type { ListRepository, Page, PageRequest } from "./list-repository"

const DEFAULT_PAGE_LIMIT = 20
const MAX_PAGE_LIMIT = 100

export function normalizeListName(name: string): string {
  if (typeof name !== "string") {
    throw new InvalidListNameError()
  }

  const normalizedName = name.trim()
  if (normalizedName.length < 1 || normalizedName.length > 80) {
    throw new InvalidListNameError()
  }

  return normalizedName
}

export function normalizePageRequest(page?: PageRequest): PageRequest {
  if (page === undefined) {
    return { limit: DEFAULT_PAGE_LIMIT }
  }

  if (
    page.limit !== undefined &&
    (!Number.isInteger(page.limit) ||
      page.limit < 1 ||
      page.limit > MAX_PAGE_LIMIT)
  ) {
    throw new InvalidPageRequestError()
  }

  if (page.cursor !== undefined && page.cursor.trim().length === 0) {
    throw new InvalidPageRequestError()
  }

  return {
    ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
    limit: page.limit ?? DEFAULT_PAGE_LIMIT,
  }
}

export function createListApplication(
  repository: ListRepository,
  clock: () => Date = () => new Date()
) {
  return {
    ensureDefaultInbox(userId: string): Promise<List> {
      return repository.ensureDefaultInbox(userId, clock())
    },

    listLists(userId: string, page?: PageRequest): Promise<Page<List>> {
      return repository.listByUser(userId, normalizePageRequest(page))
    },

    createList(userId: string, input: { name: string }): Promise<List> {
      return repository.insert({
        userId,
        name: normalizeListName(input.name),
        now: clock(),
      })
    },

    async renameList(
      userId: string,
      listId: string,
      input: { name: string }
    ): Promise<List> {
      const list = await repository.rename(
        userId,
        listId,
        normalizeListName(input.name),
        clock()
      )
      if (!list) {
        throw new ListNotFoundError()
      }
      return list
    },

    async deleteList(userId: string, listId: string): Promise<void> {
      const deleted = await repository.delete(userId, listId)
      if (!deleted) {
        throw new ListNotFoundError()
      }
    },
  }
}

export type { List, Page, PageRequest }
export {
  InvalidListNameError,
  InvalidPageRequestError,
  ListConflictError,
  ListNotFoundError,
}
