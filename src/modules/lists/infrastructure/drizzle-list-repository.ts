import { and, asc, eq, gt, or, sql } from "drizzle-orm"
import { type NodePgDatabase } from "drizzle-orm/node-postgres"

import { listsTable, type SelectList } from "../../../../db/schema/lists"
import type { List } from "../domain/list"
import {
  InvalidPageRequestError,
  ListConflictError,
} from "../domain/list-errors"
import { decodeListCursor, encodeListCursor } from "../application/list-cursor"
import type {
  ListRepository,
  PageRequest,
} from "../application/list-repository"

const DEFAULT_PAGE_LIMIT = 20
const MAX_INBOX_INSERT_ATTEMPTS = 3

function mapList(row: SelectList): List {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function isUniqueViolation(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return false
  }

  const candidate = error as {
    code?: unknown
    cause?: { code?: unknown }
  }
  return candidate.code === "23505" || candidate.cause?.code === "23505"
}

function getPageLimit(page: PageRequest) {
  const limit = page.limit ?? DEFAULT_PAGE_LIMIT
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new InvalidPageRequestError("Invalid list page limit")
  }
  return limit
}

export function createDrizzleListRepository(
  database: NodePgDatabase
): ListRepository {
  return {
    async listByUser(userId, page) {
      const limit = getPageLimit(page)
      const cursor = page.cursor
        ? decodeListCursor(page.cursor, userId)
        : undefined
      const afterCursor = cursor
        ? or(
            gt(listsTable.createdAt, cursor.createdAt),
            and(
              eq(listsTable.createdAt, cursor.createdAt),
              gt(listsTable.id, cursor.id)
            )
          )
        : undefined
      const where = afterCursor
        ? and(eq(listsTable.userId, userId), afterCursor)
        : eq(listsTable.userId, userId)

      const rows = await database
        .select()
        .from(listsTable)
        .where(where)
        .orderBy(asc(listsTable.createdAt), asc(listsTable.id))
        .limit(limit + 1)

      const hasNextPage = rows.length > limit
      const items = rows.slice(0, limit).map(mapList)
      const lastItem = items.at(-1)

      return {
        items,
        nextCursor:
          hasNextPage && lastItem
            ? encodeListCursor({
                userId,
                createdAt: lastItem.createdAt,
                id: lastItem.id,
              })
            : null,
      }
    },

    async findByIdForUser(userId, listId) {
      const rows = await database
        .select()
        .from(listsTable)
        .where(and(eq(listsTable.userId, userId), eq(listsTable.id, listId)))
        .limit(1)

      return rows[0] ? mapList(rows[0]) : null
    },

    async ensureDefaultInbox(userId, now) {
      for (let attempt = 0; attempt < MAX_INBOX_INSERT_ATTEMPTS; attempt += 1) {
        const inserted = await database
          .insert(listsTable)
          .values({ userId, name: "Inbox", createdAt: now, updatedAt: now })
          .onConflictDoNothing()
          .returning()

        if (inserted[0]) {
          return mapList(inserted[0])
        }

        const existing = await database
          .select()
          .from(listsTable)
          .where(
            and(
              eq(listsTable.userId, userId),
              sql`lower(${listsTable.name}) = lower('Inbox')`
            )
          )
          .limit(1)

        if (existing[0]) {
          return mapList(existing[0])
        }
      }

      throw new Error("Unable to ensure the default Inbox list")
    },

    async insert({ userId, name, now }) {
      try {
        const inserted = await database
          .insert(listsTable)
          .values({ userId, name, createdAt: now, updatedAt: now })
          .returning()
        return mapList(inserted[0])
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new ListConflictError()
        }
        throw error
      }
    },

    async rename(userId, listId, name, now) {
      try {
        const updated = await database
          .update(listsTable)
          .set({ name, updatedAt: now })
          .where(and(eq(listsTable.userId, userId), eq(listsTable.id, listId)))
          .returning()
        return updated[0] ? mapList(updated[0]) : null
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new ListConflictError()
        }
        throw error
      }
    },

    async delete(userId, listId) {
      const deleted = await database
        .delete(listsTable)
        .where(and(eq(listsTable.userId, userId), eq(listsTable.id, listId)))
        .returning({ id: listsTable.id })
      return deleted.length > 0
    },
  }
}
