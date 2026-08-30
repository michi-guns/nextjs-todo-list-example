import { describe, expect, it, vi } from "vitest"

import type { List } from "../domain/list"
import { ListConflictError, ListNotFoundError } from "../domain/list-errors"
import type { createListApplication } from "../application/list-use-cases"
import {
  createListActionHandlers,
  type ListActionDependencies,
} from "./list-actions"
import {
  createListCollectionHandlers,
  createListResourceHandlers,
  type ListRouteDependencies,
} from "./list-routes"

type ListApplication = ReturnType<typeof createListApplication>

const user = { id: "user-a", email: "a@example.test", name: "User A" }
const now = new Date("2026-08-30T12:00:00.000Z")

function unauthenticatedError() {
  const error = new Error("Authentication is required")
  Object.assign(error, { code: "unauthenticated" })
  return error
}

function makeList(overrides: Partial<List> = {}): List {
  return {
    id: "0198f2c0-3a6b-7000-8000-000000000001",
    userId: user.id,
    name: "Inbox",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function makeApplication(
  overrides: Partial<ListApplication> = {}
): ListApplication {
  const list = makeList()
  return {
    ensureDefaultInbox: vi.fn().mockResolvedValue(list),
    listLists: vi.fn().mockResolvedValue({ items: [list], nextCursor: null }),
    createList: vi.fn().mockResolvedValue(list),
    renameList: vi.fn().mockResolvedValue(list),
    deleteList: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function routeDependencies(
  application = makeApplication(),
  overrides: Partial<ListRouteDependencies> = {}
): ListRouteDependencies {
  return {
    application,
    authenticate: vi.fn().mockResolvedValue(user),
    revalidate: vi.fn(),
    ...overrides,
  }
}

function actionDependencies(
  application = makeApplication(),
  overrides: Partial<ListActionDependencies> = {}
): ListActionDependencies {
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

describe("list JSON entry adapters", () => {
  it("lists only the authenticated owner's safe view models with pagination", async () => {
    const application = makeApplication({
      listLists: vi.fn().mockResolvedValue({
        items: [makeList({ name: "Projects" })],
        nextCursor: "next-cursor",
      }),
    })
    const dependencies = routeDependencies(application)
    const handlers = createListCollectionHandlers(dependencies)

    const response = await handlers.GET(
      request("/api/lists?cursor=opaque&limit=2", {
        headers: { cookie: "better-auth.session_token=session" },
      })
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      items: [
        {
          id: "0198f2c0-3a6b-7000-8000-000000000001",
          name: "Projects",
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
      ],
      nextCursor: "next-cursor",
    })
    expect(application.listLists).toHaveBeenCalledWith(user.id, {
      cursor: "opaque",
      limit: 2,
    })
  })

  it("rejects an unauthenticated collection request before reading input", async () => {
    const application = makeApplication()
    const authenticate = vi.fn().mockRejectedValue(unauthenticatedError())
    const handlers = createListCollectionHandlers(
      routeDependencies(application, { authenticate })
    )

    const response = await handlers.POST(
      request("/api/lists", {
        method: "POST",
        body: "not-json",
      })
    )

    expect(response.status).toBe(401)
    await expect(json(response)).resolves.toEqual({
      error: { code: "unauthenticated", message: "Authentication is required" },
    })
    expect(application.createList).not.toHaveBeenCalled()
  })

  it("creates a list after validation and ignores a spoofed owner field", async () => {
    const application = makeApplication({
      createList: vi.fn().mockResolvedValue(makeList({ name: "Projects" })),
    })
    const revalidate = vi.fn()
    const handlers = createListCollectionHandlers(
      routeDependencies(application, { revalidate })
    )

    const response = await handlers.POST(
      request("/api/lists", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "  Projects  ", userId: "attacker" }),
      })
    )

    expect(response.status).toBe(200)
    expect(application.createList).toHaveBeenCalledWith(user.id, {
      name: "Projects",
    })
    expect(revalidate).toHaveBeenCalledOnce()
  })

  it("maps list conflicts to the stable 409 envelope", async () => {
    const application = makeApplication({
      createList: vi.fn().mockRejectedValue(new ListConflictError()),
    })
    const handlers = createListCollectionHandlers(
      routeDependencies(application)
    )

    const response = await handlers.POST(
      request("/api/lists", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Projects" }),
      })
    )

    expect(response.status).toBe(409)
    await expect(json(response)).resolves.toEqual({
      error: { code: "conflict", message: "Resource already exists" },
    })
  })

  it("rejects foreign-origin simple mutations before parsing or calling the application", async () => {
    const application = makeApplication()
    const handlers = createListCollectionHandlers(
      routeDependencies(application)
    )

    const response = await handlers.POST(
      request("/api/lists", {
        method: "POST",
        headers: {
          origin: "https://attacker.example",
          "content-type": "text/plain",
        },
        body: JSON.stringify({ name: "Projects" }),
      })
    )

    expect(response.status).toBe(422)
    expect(application.createList).not.toHaveBeenCalled()
  })

  it("maps malformed pagination and path IDs to 422 without reaching the application", async () => {
    const application = makeApplication()
    const collectionHandlers = createListCollectionHandlers(
      routeDependencies(application)
    )
    const resourceHandlers = createListResourceHandlers(
      routeDependencies(application)
    )

    const queryResponse = await collectionHandlers.GET(
      request("/api/lists?limit=101")
    )
    const pathResponse = await resourceHandlers.PATCH(
      request("/api/lists/not-a-uuid", {
        method: "PATCH",
        body: JSON.stringify({ name: "Archive" }),
      }),
      { params: Promise.resolve({ listId: "not-a-uuid" }) }
    )

    expect(queryResponse.status).toBe(422)
    expect(pathResponse.status).toBe(422)
    expect(application.listLists).not.toHaveBeenCalled()
    expect(application.renameList).not.toHaveBeenCalled()
  })

  it("maps missing private lists to 404 and returns explicit delete success", async () => {
    const listId = "0198f2c0-3a6b-7000-8000-000000000002"
    const application = makeApplication({
      renameList: vi.fn().mockRejectedValue(new ListNotFoundError()),
    })
    const revalidate = vi.fn()
    const handlers = createListResourceHandlers(
      routeDependencies(application, { revalidate })
    )

    const missing = await handlers.PATCH(
      request(`/api/lists/${listId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Archive" }),
      }),
      { params: Promise.resolve({ listId }) }
    )
    expect(missing.status).toBe(404)
    await expect(json(missing)).resolves.toEqual({
      error: { code: "not_found", message: "Resource not found" },
    })

    const deleted = await handlers.DELETE(
      request(`/api/lists/${listId}`, { method: "DELETE" }),
      { params: Promise.resolve({ listId }) }
    )
    expect(deleted.status).toBe(200)
    await expect(deleted.json()).resolves.toEqual({ deleted: true })
    expect(revalidate).toHaveBeenCalledOnce()
  })
})

describe("list Server Action adapters", () => {
  it("returns an authentication result instead of throwing for anonymous callers", async () => {
    const handlers = createListActionHandlers(
      actionDependencies(makeApplication(), {
        authenticate: vi.fn().mockRejectedValue(unauthenticatedError()),
      })
    )

    await expect(handlers.createList({ name: "Projects" })).resolves.toEqual({
      ok: false,
      error: { code: "unauthenticated", message: "Authentication is required" },
    })
  })

  it("validates action input and maps a successful list without owner data", async () => {
    const application = makeApplication({
      createList: vi.fn().mockResolvedValue(makeList({ name: "Projects" })),
    })
    const revalidate = vi.fn()
    const handlers = createListActionHandlers(
      actionDependencies(application, { revalidate })
    )

    await expect(
      handlers.createList({ name: "Projects", userId: "attacker" })
    ).resolves.toEqual({
      ok: true,
      data: {
        id: "0198f2c0-3a6b-7000-8000-000000000001",
        name: "Projects",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    })
    expect(application.createList).toHaveBeenCalledWith(user.id, {
      name: "Projects",
    })
    expect(revalidate).toHaveBeenCalledOnce()

    await expect(handlers.createList({ name: "" })).resolves.toEqual({
      ok: false,
      error: { code: "invalid_input", message: "Input is invalid" },
    })
  })

  it("maps expected action errors without revealing resource ownership", async () => {
    const listId = "0198f2c0-3a6b-7000-8000-000000000003"
    const application = makeApplication({
      deleteList: vi.fn().mockRejectedValue(new ListNotFoundError()),
    })
    const handlers = createListActionHandlers(actionDependencies(application))

    await expect(handlers.deleteList({ listId })).resolves.toEqual({
      ok: false,
      error: { code: "not_found", message: "Resource not found" },
    })
  })
})
