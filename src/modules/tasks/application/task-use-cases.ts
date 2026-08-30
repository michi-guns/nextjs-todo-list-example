import type { Task, TaskStatus } from "../domain/task"
import {
  InvalidTaskNotesError,
  InvalidTaskPageRequestError,
  InvalidTaskPatchError,
  InvalidTaskStatusError,
  InvalidTaskTitleError,
  TaskConflictError,
  TaskNotFoundError,
} from "../domain/task-errors"
import type {
  Page,
  TaskPageRequest,
  TaskPatch,
  TaskRepository,
} from "./task-repository"

const DEFAULT_PAGE_LIMIT = 20
const MAX_PAGE_LIMIT = 100
const TASK_STATUSES: readonly TaskStatus[] = ["todo", "in_progress", "done"]

export function normalizeTaskTitle(title: unknown): string {
  if (typeof title !== "string") {
    throw new InvalidTaskTitleError()
  }

  const normalizedTitle = title.trim()
  if (normalizedTitle.length < 1 || normalizedTitle.length > 200) {
    throw new InvalidTaskTitleError()
  }

  return normalizedTitle
}

export function normalizeTaskNotes(notes: unknown): string | null {
  if (notes === undefined || notes === null) {
    return null
  }
  if (typeof notes !== "string") {
    throw new InvalidTaskNotesError("Task notes must be a string or null")
  }

  const normalizedNotes = notes.trim()
  if (normalizedNotes.length > 5_000) {
    throw new InvalidTaskNotesError()
  }

  return normalizedNotes || null
}

export function normalizeTaskStatus(status: unknown): TaskStatus {
  if (
    typeof status !== "string" ||
    !TASK_STATUSES.includes(status as TaskStatus)
  ) {
    throw new InvalidTaskStatusError()
  }
  return status as TaskStatus
}

export function normalizeTaskPageRequest(
  page?: TaskPageRequest
): TaskPageRequest & {
  readonly includeCompleted: boolean
  readonly limit: number
} {
  if (page !== undefined && (typeof page !== "object" || page === null)) {
    throw new InvalidTaskPageRequestError()
  }

  const limit = page?.limit ?? DEFAULT_PAGE_LIMIT
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_LIMIT) {
    throw new InvalidTaskPageRequestError()
  }

  if (page?.cursor !== undefined) {
    if (typeof page.cursor !== "string" || page.cursor.trim().length === 0) {
      throw new InvalidTaskPageRequestError()
    }
  }

  const includeCompleted = page?.includeCompleted ?? true
  if (typeof includeCompleted !== "boolean") {
    throw new InvalidTaskPageRequestError()
  }

  return {
    ...(page?.cursor === undefined ? {} : { cursor: page.cursor }),
    includeCompleted,
    limit,
  }
}

function normalizeTaskPatch(input: TaskPatch): TaskPatch {
  const patch: {
    title?: string
    notes?: string | null
    status?: TaskStatus
  } = {}

  if (Object.hasOwn(input, "title")) {
    patch.title = normalizeTaskTitle(input.title)
  }
  if (Object.hasOwn(input, "notes")) {
    patch.notes = normalizeTaskNotes(input.notes)
  }
  if (Object.hasOwn(input, "status")) {
    patch.status = normalizeTaskStatus(input.status)
  }

  if (Object.keys(patch).length === 0) {
    throw new InvalidTaskPatchError()
  }

  return patch
}

export function createTaskApplication(
  repository: TaskRepository,
  clock: () => Date = () => new Date()
) {
  return {
    listTasks(
      userId: string,
      listId: string,
      page?: TaskPageRequest
    ): Promise<Page<Task>> {
      return repository.listByOwnedList(
        userId,
        listId,
        normalizeTaskPageRequest(page)
      )
    },

    async createTask(
      userId: string,
      listId: string,
      input: { title: string; notes?: string | null }
    ): Promise<Task> {
      const task = await repository.insert({
        userId,
        listId,
        title: normalizeTaskTitle(input.title),
        notes: normalizeTaskNotes(input.notes),
        status: "todo",
        now: clock(),
      })
      if (task === "list_not_found") {
        throw new TaskNotFoundError()
      }
      return task
    },

    async updateTask(
      userId: string,
      taskId: string,
      input: TaskPatch
    ): Promise<Task> {
      const task = await repository.updateForUser(
        userId,
        taskId,
        normalizeTaskPatch(input),
        clock()
      )
      if (!task) {
        throw new TaskNotFoundError()
      }
      return task
    },

    async deleteTask(userId: string, taskId: string): Promise<void> {
      if (!(await repository.deleteForUser(userId, taskId))) {
        throw new TaskNotFoundError()
      }
    },
  }
}

export type {
  Page,
  Task,
  TaskPageRequest,
  TaskPatch,
  TaskRepository,
  TaskStatus,
}
export {
  InvalidTaskNotesError,
  InvalidTaskPageRequestError,
  InvalidTaskPatchError,
  InvalidTaskStatusError,
  InvalidTaskTitleError,
  TaskConflictError,
  TaskNotFoundError,
}
