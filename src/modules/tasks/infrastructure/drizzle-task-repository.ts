import { and, desc, eq, lt, ne, or } from "drizzle-orm"
import { type NodePgDatabase } from "drizzle-orm/node-postgres"

import { listsTable } from "../../../../db/schema/lists"
import { tasksTable, type SelectTask } from "../../../../db/schema/tasks"
import type { Task, TaskStatus } from "../domain/task"
import {
  InvalidTaskPageRequestError,
  TaskConflictError,
} from "../domain/task-errors"
import { decodeTaskCursor, encodeTaskCursor } from "../application/task-cursor"
import type {
  TaskPageRequest,
  TaskPatch,
  TaskRepository,
} from "../application/task-repository"

const DEFAULT_PAGE_LIMIT = 20
const MAX_PAGE_LIMIT = 100

function mapTask(row: SelectTask): Task {
  return {
    id: row.id,
    listId: row.listId,
    userId: row.userId,
    title: row.title,
    notes: row.notes,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function getErrorDetails(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return {}
  }

  const candidate = error as {
    code?: unknown
    constraint?: unknown
    cause?: { code?: unknown; constraint?: unknown }
  }
  return {
    code: candidate.code ?? candidate.cause?.code,
    constraint: candidate.constraint ?? candidate.cause?.constraint,
  }
}

function isUniqueViolation(error: unknown) {
  return getErrorDetails(error).code === "23505"
}

function isListForeignKeyViolation(error: unknown) {
  const details = getErrorDetails(error)
  return (
    details.code === "23503" &&
    details.constraint === "tasks_list_id_lists_id_fkey"
  )
}

function getPageLimit(page: TaskPageRequest) {
  const limit = page.limit ?? DEFAULT_PAGE_LIMIT
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_LIMIT) {
    throw new InvalidTaskPageRequestError("Invalid task page limit")
  }
  return limit
}

export function createDrizzleTaskRepository(
  database: NodePgDatabase
): TaskRepository {
  return {
    async listByOwnedList(userId, listId, page) {
      const limit = getPageLimit(page)
      const includeCompleted = page.includeCompleted ?? true
      if (typeof includeCompleted !== "boolean") {
        throw new InvalidTaskPageRequestError(
          "Task completed visibility must be a boolean"
        )
      }

      const cursor =
        page.cursor !== undefined
          ? decodeTaskCursor(page.cursor, userId, listId, includeCompleted)
          : undefined

      const ownedList = await database
        .select({ id: listsTable.id })
        .from(listsTable)
        .where(and(eq(listsTable.id, listId), eq(listsTable.userId, userId)))
        .limit(1)

      if (!ownedList[0]) {
        return "list_not_found"
      }

      const afterCursor = cursor
        ? or(
            lt(tasksTable.createdAt, cursor.createdAt),
            and(
              eq(tasksTable.createdAt, cursor.createdAt),
              lt(tasksTable.id, cursor.id)
            )
          )
        : undefined
      const predicates = [
        eq(tasksTable.userId, userId),
        eq(tasksTable.listId, listId),
        ...(includeCompleted ? [] : [ne(tasksTable.status, "done")]),
        ...(afterCursor ? [afterCursor] : []),
      ]

      const rows = await database
        .select()
        .from(tasksTable)
        .where(and(...predicates))
        .orderBy(desc(tasksTable.createdAt), desc(tasksTable.id))
        .limit(limit + 1)

      const hasNextPage = rows.length > limit
      const items = rows.slice(0, limit).map(mapTask)
      const lastItem = items.at(-1)

      return {
        items,
        nextCursor:
          hasNextPage && lastItem
            ? encodeTaskCursor({
                userId,
                listId,
                includeCompleted,
                createdAt: lastItem.createdAt,
                id: lastItem.id,
              })
            : null,
      }
    },

    async insert({ userId, listId, title, notes, status, now }) {
      const ownedList = await database
        .select({ id: listsTable.id })
        .from(listsTable)
        .where(and(eq(listsTable.id, listId), eq(listsTable.userId, userId)))
        .limit(1)

      if (!ownedList[0]) {
        return "list_not_found"
      }

      try {
        const inserted = await database
          .insert(tasksTable)
          .values({
            userId,
            listId,
            title,
            notes,
            status,
            createdAt: now,
            updatedAt: now,
          })
          .returning()
        return mapTask(inserted[0])
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new TaskConflictError()
        }
        if (isListForeignKeyViolation(error)) {
          return "list_not_found"
        }
        throw error
      }
    },

    async findByIdForUser(userId, taskId) {
      const rows = await database
        .select()
        .from(tasksTable)
        .where(and(eq(tasksTable.userId, userId), eq(tasksTable.id, taskId)))
        .limit(1)

      return rows[0] ? mapTask(rows[0]) : null
    },

    async updateForUser(userId, taskId, patch: TaskPatch, now) {
      const updates: {
        title?: string
        notes?: string | null
        status?: TaskStatus
        updatedAt: Date
      } = { updatedAt: now }

      if (Object.hasOwn(patch, "title")) {
        updates.title = patch.title
      }
      if (Object.hasOwn(patch, "notes")) {
        updates.notes = patch.notes ?? null
      }
      if (Object.hasOwn(patch, "status")) {
        updates.status = patch.status
      }

      try {
        const updated = await database
          .update(tasksTable)
          .set(updates)
          .where(and(eq(tasksTable.userId, userId), eq(tasksTable.id, taskId)))
          .returning()
        return updated[0] ? mapTask(updated[0]) : null
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new TaskConflictError()
        }
        throw error
      }
    },

    async deleteForUser(userId, taskId) {
      const deleted = await database
        .delete(tasksTable)
        .where(and(eq(tasksTable.userId, userId), eq(tasksTable.id, taskId)))
        .returning({ id: tasksTable.id })
      return deleted.length > 0
    },
  }
}
