import { describe, expect, it } from "vitest"

import type { Task, TaskStatus } from "../domain/task"
import {
  InvalidTaskNotesError,
  InvalidTaskPageRequestError,
  InvalidTaskStatusError,
  InvalidTaskTitleError,
  TaskConflictError,
  TaskNotFoundError,
} from "../domain/task-errors"
import type { Page, TaskPageRequest, TaskRepository } from "./task-repository"
import {
  createTaskApplication,
  normalizeTaskNotes,
  normalizeTaskPageRequest,
  normalizeTaskStatus,
  normalizeTaskTitle,
} from "./task-use-cases"

const now = new Date("2026-08-30T13:00:00.000Z")

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "0198f2c0-3a6b-7000-8000-000000000010",
    listId: "0198f2c0-3a6b-7000-8000-000000000001",
    userId: "user-a",
    title: "Initial task",
    notes: "Initial notes",
    status: "todo",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function createRepository(
  overrides: Partial<TaskRepository> = {}
): TaskRepository & {
  calls: {
    listByOwnedList: Array<{
      userId: string
      listId: string
      options: TaskPageRequest
    }>
    insert: Array<{
      userId: string
      listId: string
      title: string
      notes: string | null
      status: TaskStatus
      now: Date
    }>
    updateForUser: Array<{
      userId: string
      taskId: string
      patch: {
        title?: string
        notes?: string | null
        status?: TaskStatus
      }
      now: Date
    }>
    deleteForUser: Array<{ userId: string; taskId: string }>
  }
} {
  const calls = {
    listByOwnedList: [] as Array<{
      userId: string
      listId: string
      options: TaskPageRequest
    }>,
    insert: [] as Array<{
      userId: string
      listId: string
      title: string
      notes: string | null
      status: TaskStatus
      now: Date
    }>,
    updateForUser: [] as Array<{
      userId: string
      taskId: string
      patch: {
        title?: string
        notes?: string | null
        status?: TaskStatus
      }
      now: Date
    }>,
    deleteForUser: [] as Array<{ userId: string; taskId: string }>,
  }
  const task = makeTask()
  const page: Page<Task> = { items: [task], nextCursor: null }

  return {
    calls,
    listByOwnedList: async (userId, listId, options) => {
      calls.listByOwnedList.push({ userId, listId, options })
      return page
    },
    insert: async (input) => {
      calls.insert.push(input)
      return { ...task, ...input }
    },
    findByIdForUser: async () => task,
    updateForUser: async (userId, taskId, patch, timestamp) => {
      calls.updateForUser.push({ userId, taskId, patch, now: timestamp })
      return { ...task, ...patch, updatedAt: timestamp }
    },
    deleteForUser: async (userId, taskId) => {
      calls.deleteForUser.push({ userId, taskId })
      return true
    },
    ...overrides,
  }
}

describe("task domain and application", () => {
  it("trims a valid title while preserving the display value", () => {
    expect(normalizeTaskTitle("  Buy milk  ")).toBe("Buy milk")
  })

  it("rejects blank and overlong titles", () => {
    expect(() => normalizeTaskTitle("   ")).toThrow(InvalidTaskTitleError)
    expect(() => normalizeTaskTitle("a".repeat(201))).toThrow(
      InvalidTaskTitleError
    )
  })

  it("normalizes optional notes and enforces the trimmed maximum", () => {
    expect(normalizeTaskNotes(undefined)).toBeNull()
    expect(normalizeTaskNotes(null)).toBeNull()
    expect(normalizeTaskNotes("  note  ")).toBe("note")
    expect(normalizeTaskNotes("   ")).toBeNull()
    expect(() => normalizeTaskNotes("a".repeat(5_001))).toThrow(
      InvalidTaskNotesError
    )
  })

  it("validates statuses and normalizes page defaults and filters", () => {
    expect(normalizeTaskStatus("in_progress")).toBe("in_progress")
    expect(() => normalizeTaskStatus("blocked")).toThrow(InvalidTaskStatusError)
    expect(normalizeTaskPageRequest()).toEqual({
      includeCompleted: true,
      limit: 20,
    })
    expect(
      normalizeTaskPageRequest({ includeCompleted: false, limit: 100 })
    ).toEqual({ includeCompleted: false, limit: 100 })
    expect(() => normalizeTaskPageRequest({ limit: 0 })).toThrow(
      InvalidTaskPageRequestError
    )
    expect(() => normalizeTaskPageRequest({ limit: 101 })).toThrow(
      InvalidTaskPageRequestError
    )
  })

  it("accepts every status and reapplying the current status is idempotent", async () => {
    const repository = createRepository()
    const application = createTaskApplication(repository, () => now)

    for (const status of ["todo", "in_progress", "done"] as const) {
      expect(normalizeTaskStatus(status)).toBe(status)
      await expect(
        application.updateTask("user-a", "task-1", { status })
      ).resolves.toMatchObject({ status })
    }

    expect(repository.calls.updateForUser).toEqual([
      {
        userId: "user-a",
        taskId: "task-1",
        patch: { status: "todo" },
        now,
      },
      {
        userId: "user-a",
        taskId: "task-1",
        patch: { status: "in_progress" },
        now,
      },
      {
        userId: "user-a",
        taskId: "task-1",
        patch: { status: "done" },
        now,
      },
    ])

    await expect(
      application.updateTask("user-a", "task-1", { status: "done" })
    ).resolves.toMatchObject({ status: "done" })
    expect(repository.calls.updateForUser.at(-1)).toEqual({
      userId: "user-a",
      taskId: "task-1",
      patch: { status: "done" },
      now,
    })
  })

  it("forwards the authenticated owner, list, and default task fields", async () => {
    const repository = createRepository()
    const application = createTaskApplication(repository, () => now)

    await expect(application.listTasks("user-a", "list-a")).resolves.toEqual(
      expect.objectContaining({ items: [expect.anything()] })
    )
    await expect(
      application.createTask("user-a", "list-a", {
        title: "  Buy milk  ",
        notes: "  note  ",
      })
    ).resolves.toMatchObject({
      title: "Buy milk",
      notes: "note",
      status: "todo",
    })

    expect(repository.calls.listByOwnedList).toEqual([
      {
        userId: "user-a",
        listId: "list-a",
        options: { includeCompleted: true, limit: 20 },
      },
    ])
    expect(repository.calls.insert).toEqual([
      {
        userId: "user-a",
        listId: "list-a",
        title: "Buy milk",
        notes: "note",
        status: "todo",
        now,
      },
    ])
  })

  it("preserves omitted patch fields while allowing explicit note clearing", async () => {
    const repository = createRepository()
    const application = createTaskApplication(repository, () => now)

    await application.updateTask("user-a", "task-1", {
      title: "  Renamed  ",
      status: "done",
    })
    await application.updateTask("user-a", "task-1", { notes: null })

    expect(repository.calls.updateForUser).toEqual([
      {
        userId: "user-a",
        taskId: "task-1",
        patch: { title: "Renamed", status: "done" },
        now,
      },
      {
        userId: "user-a",
        taskId: "task-1",
        patch: { notes: null },
        now,
      },
    ])
  })

  it("maps missing resources to not-found and preserves conflict outcomes", async () => {
    const missingRepository = createRepository({
      insert: async () => "list_not_found",
      updateForUser: async () => null,
      deleteForUser: async () => false,
    })
    const missingApplication = createTaskApplication(missingRepository)

    await expect(
      missingApplication.createTask("user-a", "missing-list", {
        title: "Task",
      })
    ).rejects.toBeInstanceOf(TaskNotFoundError)
    await expect(
      missingApplication.updateTask("user-a", "missing-task", {
        status: "done",
      })
    ).rejects.toBeInstanceOf(TaskNotFoundError)
    await expect(
      missingApplication.deleteTask("user-a", "missing-task")
    ).rejects.toBeInstanceOf(TaskNotFoundError)

    const conflictRepository = createRepository({
      insert: async () => {
        throw new TaskConflictError()
      },
      updateForUser: async () => {
        throw new TaskConflictError()
      },
    })
    const conflictApplication = createTaskApplication(conflictRepository)

    await expect(
      conflictApplication.createTask("user-a", "list-a", { title: "Task" })
    ).rejects.toBeInstanceOf(TaskConflictError)
    await expect(
      conflictApplication.updateTask("user-a", "task-1", { title: "Task" })
    ).rejects.toBeInstanceOf(TaskConflictError)
  })

  it("maps missing or foreign-owned task list reads to not-found", async () => {
    const repository = createRepository({
      listByOwnedList: async () => "list_not_found",
    })
    const application = createTaskApplication(repository)

    await expect(
      application.listTasks("user-a", "missing-list")
    ).rejects.toBeInstanceOf(TaskNotFoundError)
    await expect(
      application.listTasks("user-a", "other-users-list")
    ).rejects.toMatchObject({ code: "not_found" })
  })
})
