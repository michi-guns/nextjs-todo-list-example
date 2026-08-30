import { describe, expect, it, vi } from "vitest"

import type { createTaskApplication } from "../application/task-use-cases"
import type { Task } from "../domain/task"
import { TaskConflictError, TaskNotFoundError } from "../domain/task-errors"
import {
  createTaskActionHandlers,
  type TaskActionDependencies,
} from "./task-actions"
import {
  createTaskListHandlers,
  createTaskResourceHandlers,
  type TaskRouteDependencies,
} from "./task-routes"

type TaskApplication = ReturnType<typeof createTaskApplication>

const user = { id: "user-a", email: "a@example.test", name: "User A" }
const now = new Date("2026-08-30T12:00:00.000Z")
const listId = "0198f2c0-3a6b-7000-8000-000000000010"
const taskId = "0198f2c0-3a6b-7000-8000-000000000011"

function unauthenticatedError() {
  const error = new Error("Authentication is required")
  Object.assign(error, { code: "unauthenticated" })
  return error
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: taskId,
    listId,
    userId: user.id,
    title: "First task",
    notes: null,
    status: "todo",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function makeApplication(
  overrides: Partial<TaskApplication> = {}
): TaskApplication {
  const task = makeTask()
  return {
    listTasks: vi.fn().mockResolvedValue({ items: [task], nextCursor: null }),
    createTask: vi.fn().mockResolvedValue(task),
    updateTask: vi.fn().mockResolvedValue(task),
    deleteTask: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function routeDependencies(
  application = makeApplication(),
  overrides: Partial<TaskRouteDependencies> = {}
): TaskRouteDependencies {
  return {
    application,
    authenticate: vi.fn().mockResolvedValue(user),
    revalidate: vi.fn(),
    ...overrides,
  }
}

function actionDependencies(
  application = makeApplication(),
  overrides: Partial<TaskActionDependencies> = {}
): TaskActionDependencies {
  return {
    application,
    authenticate: vi.fn().mockResolvedValue(user),
    revalidate: vi.fn(),
    ...overrides,
  }
}

function request(url: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  if (!headers.has("origin")) {
    headers.set("origin", "http://localhost")
  }
  return new Request(`http://localhost${url}`, { ...init, headers })
}

async function json(response: Response) {
  return (await response.json()) as Record<string, unknown>
}

describe("task JSON entry adapters", () => {
  it("lists tasks with the authenticated owner, filter, and pagination context", async () => {
    const application = makeApplication({
      listTasks: vi.fn().mockResolvedValue({
        items: [makeTask({ title: "Visible task", notes: "Details" })],
        nextCursor: "next-task-cursor",
      }),
    })
    const handlers = createTaskListHandlers(routeDependencies(application))

    const response = await handlers.GET(
      request(
        `/api/lists/${listId}/tasks?includeCompleted=false&cursor=opaque&limit=3`
      ),
      { params: Promise.resolve({ listId }) }
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      items: [
        {
          id: taskId,
          listId,
          title: "Visible task",
          notes: "Details",
          status: "todo",
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
      ],
      nextCursor: "next-task-cursor",
    })
    expect(application.listTasks).toHaveBeenCalledWith(user.id, listId, {
      includeCompleted: false,
      cursor: "opaque",
      limit: 3,
    })
  })

  it("creates a task and maps a foreign list as privacy-preserving not found", async () => {
    const application = makeApplication({
      createTask: vi.fn().mockResolvedValue(makeTask({ title: "Created" })),
    })
    const revalidate = vi.fn()
    const handlers = createTaskListHandlers(
      routeDependencies(application, { revalidate })
    )

    const created = await handlers.POST(
      request(`/api/lists/${listId}/tasks`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Created",
          notes: "  note  ",
          userId: "attacker",
        }),
      }),
      { params: Promise.resolve({ listId }) }
    )

    expect(created.status).toBe(200)
    expect(application.createTask).toHaveBeenCalledWith(user.id, listId, {
      title: "Created",
      notes: "note",
    })
    expect(revalidate).toHaveBeenCalledOnce()

    const missingApplication = makeApplication({
      createTask: vi.fn().mockRejectedValue(new TaskNotFoundError()),
    })
    const missingHandlers = createTaskListHandlers(
      routeDependencies(missingApplication)
    )
    const missing = await missingHandlers.POST(
      request(`/api/lists/${listId}/tasks`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "Created" }),
      }),
      { params: Promise.resolve({ listId }) }
    )

    expect(missing.status).toBe(404)
    await expect(json(missing)).resolves.toEqual({
      error: { code: "not_found", message: "Resource not found" },
    })
  })

  it("maps task conflicts and malformed task input to stable responses", async () => {
    const conflictApplication = makeApplication({
      updateTask: vi.fn().mockRejectedValue(new TaskConflictError()),
    })
    const handlers = createTaskResourceHandlers(
      routeDependencies(conflictApplication)
    )

    const conflict = await handlers.PATCH(
      request(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "Duplicate" }),
      }),
      { params: Promise.resolve({ taskId }) }
    )
    expect(conflict.status).toBe(409)

    const invalid = await handlers.PATCH(
      request(`/api/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ taskId }) }
    )
    expect(invalid.status).toBe(422)
    await expect(json(invalid)).resolves.toEqual({
      error: { code: "invalid_input", message: "Input is invalid" },
    })
  })

  it("rejects anonymous task reads before calling the application", async () => {
    const application = makeApplication()
    const handlers = createTaskListHandlers(
      routeDependencies(application, {
        authenticate: vi.fn().mockRejectedValue(unauthenticatedError()),
      })
    )

    const response = await handlers.GET(request(`/api/lists/${listId}/tasks`), {
      params: Promise.resolve({ listId }),
    })

    expect(response.status).toBe(401)
    expect(application.listTasks).not.toHaveBeenCalled()
  })

  it("rejects foreign-origin task mutations before calling the application", async () => {
    const application = makeApplication()
    const handlers = createTaskListHandlers(routeDependencies(application))

    const response = await handlers.POST(
      request(`/api/lists/${listId}/tasks`, {
        method: "POST",
        headers: {
          origin: "https://attacker.example",
          "content-type": "text/plain",
        },
        body: JSON.stringify({ title: "Created" }),
      }),
      { params: Promise.resolve({ listId }) }
    )

    expect(response.status).toBe(422)
    expect(application.createTask).not.toHaveBeenCalled()
  })

  it("returns explicit task delete success and maps an absent task to 404", async () => {
    const application = makeApplication({
      deleteTask: vi.fn().mockResolvedValue(undefined),
    })
    const revalidate = vi.fn()
    const handlers = createTaskResourceHandlers(
      routeDependencies(application, { revalidate })
    )

    const deleted = await handlers.DELETE(
      request(`/api/tasks/${taskId}`, { method: "DELETE" }),
      { params: Promise.resolve({ taskId }) }
    )
    expect(deleted.status).toBe(200)
    await expect(deleted.json()).resolves.toEqual({ deleted: true })

    const missingApplication = makeApplication({
      deleteTask: vi.fn().mockRejectedValue(new TaskNotFoundError()),
    })
    const missingHandlers = createTaskResourceHandlers(
      routeDependencies(missingApplication)
    )
    const missing = await missingHandlers.DELETE(
      request(`/api/tasks/${taskId}`, { method: "DELETE" }),
      { params: Promise.resolve({ taskId }) }
    )
    expect(missing.status).toBe(404)
    expect(revalidate).toHaveBeenCalledOnce()
  })
})

describe("task Server Action adapters", () => {
  it("accepts native FormData through the same Zod path and returns a safe result", async () => {
    const application = makeApplication({
      createTask: vi.fn().mockResolvedValue(makeTask({ title: "From form" })),
    })
    const revalidate = vi.fn()
    const handlers = createTaskActionHandlers(
      actionDependencies(application, { revalidate })
    )
    const formData = new FormData()
    formData.set("listId", listId)
    formData.set("title", "From form")
    formData.set("notes", "notes")

    await expect(handlers.createTask(formData)).resolves.toMatchObject({
      ok: true,
      data: {
        id: taskId,
        listId,
        title: "From form",
        notes: null,
        status: "todo",
      },
    })
    expect(application.createTask).toHaveBeenCalledWith(user.id, listId, {
      title: "From form",
      notes: "notes",
    })
    expect(revalidate).toHaveBeenCalledOnce()
  })

  it("maps action authentication and validation failures without throwing", async () => {
    const handlers = createTaskActionHandlers(
      actionDependencies(makeApplication(), {
        authenticate: vi.fn().mockRejectedValue(unauthenticatedError()),
      })
    )
    await expect(
      handlers.updateTask({ taskId, title: "Updated" })
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "unauthenticated" },
    })

    const validationHandlers = createTaskActionHandlers(
      actionDependencies(makeApplication())
    )
    await expect(validationHandlers.updateTask({ taskId })).resolves.toEqual({
      ok: false,
      error: { code: "invalid_input", message: "Input is invalid" },
    })
  })
})
