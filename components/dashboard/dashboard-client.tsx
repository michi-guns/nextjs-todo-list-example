"use client"

import { useEffect, useRef, useState } from "react"

import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import type { ActionResult } from "@/src/shared/entry-contract"
import {
  appendPage,
  resetPage,
  resolveListDeleteOutcome,
  type PageState,
} from "@/src/modules/dashboard/presentation/dashboard-state"
import type {
  ListPageViewModel,
  ListViewModel,
} from "@/src/modules/lists/presentation/list-view-model"
import type { TaskStatus } from "@/src/modules/tasks/domain/task"
import type {
  TaskPageViewModel,
  TaskViewModel,
} from "@/src/modules/tasks/presentation/task-view-model"

import { AppHeader } from "./app-header"
import { ListRail } from "./list-rail"
import { TaskWorkspace } from "./task-workspace"
import type { DashboardUser, Notice, PendingOperation } from "./types"

type ServerAction<T> = (input: unknown) => Promise<ActionResult<T>>

type DeletedResult = { readonly deleted: true }

type TaskPatch = {
  readonly title?: string
  readonly notes?: string | null
  readonly status?: TaskStatus
}

export interface DashboardClientProps {
  readonly user: DashboardUser
  readonly initialLists: ListPageViewModel
  readonly initialTasks: TaskPageViewModel | null
  readonly createList: ServerAction<ListViewModel>
  readonly renameList: ServerAction<ListViewModel>
  readonly deleteList: ServerAction<DeletedResult>
  readonly createTask: ServerAction<TaskViewModel>
  readonly updateTask: ServerAction<TaskViewModel>
  readonly deleteTask: ServerAction<DeletedResult>
  readonly signOut: (formData: FormData) => Promise<void>
}

const emptyTaskPage: TaskPageViewModel = {
  items: [],
  nextCursor: null,
}

class DashboardRequestError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "DashboardRequestError"
    this.status = status
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isList(value: unknown): value is ListViewModel {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  )
}

function isTask(value: unknown): value is TaskViewModel {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.listId === "string" &&
    typeof value.title === "string" &&
    (value.notes === null || typeof value.notes === "string") &&
    (value.status === "todo" ||
      value.status === "in_progress" ||
      value.status === "done") &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  )
}

function readErrorMessage(value: unknown): string | null {
  if (!isRecord(value) || !isRecord(value.error)) return null
  return typeof value.error.message === "string" ? value.error.message : null
}

function readPage<T>(
  value: unknown,
  isItem: (item: unknown) => item is T
): PageState<T> {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    throw new DashboardRequestError("The server returned an invalid page.", 500)
  }

  const nextCursor = value.nextCursor
  if (nextCursor !== null && typeof nextCursor !== "string") {
    throw new DashboardRequestError(
      "The server returned an invalid cursor.",
      500
    )
  }

  if (!value.items.every(isItem)) {
    throw new DashboardRequestError("The server returned invalid records.", 500)
  }

  return {
    items: value.items,
    nextCursor,
  }
}

async function fetchPage<T>(
  path: string,
  isItem: (item: unknown) => item is T
): Promise<PageState<T>> {
  let response: Response
  try {
    response = await fetch(path, {
      cache: "no-store",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    })
  } catch {
    throw new DashboardRequestError(
      "The request could not reach the workspace. Try again.",
      0
    )
  }

  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    // The status below still gives the user an actionable, safe message.
  }

  if (!response.ok) {
    throw new DashboardRequestError(
      readErrorMessage(body) ??
        (response.status === 401
          ? "Your session has expired. Sign in again to continue."
          : "The workspace could not be loaded. Try again."),
      response.status
    )
  }

  return readPage(body, isItem)
}

function listPagePath(cursor?: string) {
  const params = new URLSearchParams({ limit: "20" })
  if (cursor) params.set("cursor", cursor)
  return `/api/lists?${params.toString()}`
}

function taskPagePath(
  listId: string,
  includeCompleted: boolean,
  cursor?: string
) {
  const params = new URLSearchParams({
    includeCompleted: String(includeCompleted),
    limit: "20",
  })
  if (cursor) params.set("cursor", cursor)
  return `/api/lists/${encodeURIComponent(listId)}/tasks?${params.toString()}`
}

function actionErrorMessage<T>(result: ActionResult<T>): string | null {
  return result.ok ? null : result.error.message
}

function unexpectedErrorMessage(error: unknown): string {
  if (error instanceof DashboardRequestError) return error.message
  return "The workspace could not complete that request. Try again."
}

function focusById(id: string | null) {
  if (!id) return
  requestAnimationFrame(() => document.getElementById(id)?.focus())
}

function compareLists(left: ListViewModel, right: ListViewModel): number {
  if (left.createdAt < right.createdAt) return -1
  if (left.createdAt > right.createdAt) return 1
  if (left.id < right.id) return -1
  if (left.id > right.id) return 1
  return 0
}

export function DashboardClient({
  user,
  initialLists,
  initialTasks,
  createList,
  renameList,
  deleteList,
  createTask,
  updateTask,
  deleteTask,
  signOut,
}: DashboardClientProps) {
  const [listPage, setListPage] = useState<ListPageViewModel>(initialLists)
  const [selectedListId, setSelectedListId] = useState<string | null>(
    initialLists.items[0]?.id ?? null
  )
  const [taskPage, setTaskPage] = useState<TaskPageViewModel>(
    initialTasks ?? emptyTaskPage
  )
  const [includeCompleted, setIncludeCompleted] = useState(true)
  const [taskLoading, setTaskLoading] = useState(false)
  const [pendingOperation, setPendingOperation] =
    useState<PendingOperation>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [taskLoadError, setTaskLoadError] = useState<string | null>(null)
  const [finalListState, setFinalListState] = useState(false)
  const [confirmRequest, setConfirmRequest] = useState<{
    readonly kind: "list" | "task"
    readonly id: string
    readonly label: string
  } | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const taskRequestVersion = useRef(0)
  const reloadRef = useRef<HTMLButtonElement>(null)
  const confirmReturnFocus = useRef<HTMLElement | null>(null)
  const dashboardContentRef = useRef<HTMLDivElement>(null)

  const selectedList =
    listPage.items.find((list) => list.id === selectedListId) ?? null

  useEffect(() => {
    if (finalListState) reloadRef.current?.focus()
  }, [finalListState])

  useEffect(() => {
    const content = dashboardContentRef.current
    if (!content) return

    const dialogOpen = confirmRequest !== null
    content.inert = dialogOpen
    if (dialogOpen) {
      content.setAttribute("aria-hidden", "true")
    } else {
      content.removeAttribute("aria-hidden")
    }

    return () => {
      content.inert = false
      content.removeAttribute("aria-hidden")
    }
  }, [confirmRequest])

  function setErrorNotice(message: string) {
    setNotice({ tone: "error", message })
  }

  async function runMutation<T>(
    operation: Exclude<
      PendingOperation,
      "load-lists" | "load-tasks" | "load-more-tasks" | null
    >,
    action: () => Promise<ActionResult<T>>
  ): Promise<ActionResult<T> | null> {
    setNotice(null)
    setPendingOperation(operation)
    try {
      const result = await action()
      const error = actionErrorMessage(result)
      if (error) setErrorNotice(error)
      return result
    } catch (error) {
      setErrorNotice(unexpectedErrorMessage(error))
      return null
    } finally {
      setPendingOperation(null)
    }
  }

  async function loadTasksPage(
    listId: string,
    completed: boolean,
    cursor: string | undefined,
    mode: "replace" | "append"
  ): Promise<number> {
    const version =
      mode === "replace"
        ? ++taskRequestVersion.current
        : taskRequestVersion.current
    setTaskLoadError(null)
    setPendingOperation(mode === "append" ? "load-more-tasks" : "load-tasks")
    setTaskLoading(true)

    try {
      const page = await fetchPage(
        taskPagePath(listId, completed, cursor),
        isTask
      )
      if (version !== taskRequestVersion.current) return 0

      const nextPage =
        mode === "append"
          ? appendPage(taskPage, page, (task) => task.id)
          : resetPage(taskPage, page)
      setTaskPage(nextPage)
      return mode === "append"
        ? nextPage.items.length - taskPage.items.length
        : page.items.length
    } catch (error) {
      if (version === taskRequestVersion.current) {
        setTaskLoadError(unexpectedErrorMessage(error))
      }
      return 0
    } finally {
      if (version === taskRequestVersion.current) {
        setTaskLoading(false)
        setPendingOperation(null)
      }
    }
  }

  async function handleSelectList(listId: string) {
    if (listId === selectedListId) return
    setNotice(null)
    setSelectedListId(listId)
    setTaskPage(emptyTaskPage)
    await loadTasksPage(listId, includeCompleted, undefined, "replace")
  }

  async function handleToggleCompleted(completed: boolean) {
    if (!selectedListId) return
    setIncludeCompleted(completed)
    setTaskPage(emptyTaskPage)
    await loadTasksPage(selectedListId, completed, undefined, "replace")
  }

  async function handleListLoadMore(): Promise<number> {
    const cursor = listPage.nextCursor
    if (!cursor) return 0

    setNotice(null)
    setPendingOperation("load-lists")
    try {
      const page = await fetchPage(listPagePath(cursor), isList)
      const appended = appendPage(listPage, page, (list) => list.id)
      const ordered = {
        ...appended,
        items: [...appended.items].sort(compareLists),
      }
      setListPage(ordered)
      return ordered.items.length - listPage.items.length
    } catch (error) {
      setErrorNotice(unexpectedErrorMessage(error))
      return 0
    } finally {
      setPendingOperation(null)
    }
  }

  async function handleCreateList(name: string): Promise<boolean> {
    if (!name.trim()) {
      setErrorNotice("A list name is required.")
      return false
    }

    const result = await runMutation("create-list", () => createList({ name }))
    if (!result || !result.ok) return false

    setListPage((current) => {
      const appended = appendPage(
        current,
        { items: [result.data], nextCursor: current.nextCursor },
        (list) => list.id
      )
      return { ...appended, items: [...appended.items].sort(compareLists) }
    })
    setFinalListState(false)
    setNotice({
      tone: "success",
      message: `Created list “${result.data.name}”.`,
    })

    if (!selectedListId) {
      setSelectedListId(result.data.id)
      setTaskPage(emptyTaskPage)
      await loadTasksPage(
        result.data.id,
        includeCompleted,
        undefined,
        "replace"
      )
    }

    return true
  }

  async function handleRenameList(
    listId: string,
    name: string
  ): Promise<boolean> {
    if (!name.trim()) {
      setErrorNotice("A list name is required.")
      return false
    }

    const result = await runMutation("rename-list", () =>
      renameList({ listId, name })
    )
    if (!result || !result.ok) return false

    setListPage((current) => ({
      ...current,
      items: current.items.map((list) =>
        list.id === result.data.id ? result.data : list
      ),
    }))
    setNotice({
      tone: "success",
      message: `Renamed list to “${result.data.name}”.`,
    })
    return true
  }

  async function reloadListsAfterDelete() {
    setPendingOperation("load-lists")
    try {
      const page = await fetchPage(listPagePath(), isList)
      setListPage(resetPage(listPage, page))

      const nextList = page.items[0]
      if (!nextList) {
        setSelectedListId(null)
        setTaskPage(emptyTaskPage)
        setTaskLoading(false)
        setFinalListState(true)
        return
      }

      setFinalListState(false)
      setSelectedListId(nextList.id)
      setTaskPage(emptyTaskPage)
      await loadTasksPage(nextList.id, includeCompleted, undefined, "replace")
      focusById(`list-option-${nextList.id}`)
    } catch (error) {
      setFinalListState(false)
      setErrorNotice(unexpectedErrorMessage(error))
    } finally {
      setPendingOperation(null)
    }
  }

  function requestDeleteList(listId: string) {
    const list = listPage.items.find((item) => item.id === listId)
    if (!list) return
    confirmReturnFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    setConfirmError(null)
    setConfirmRequest({ kind: "list", id: list.id, label: list.name })
  }

  function requestDeleteTask(taskId: string) {
    const task = taskPage.items.find((item) => item.id === taskId)
    if (!task) return
    confirmReturnFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    setConfirmError(null)
    setConfirmRequest({ kind: "task", id: task.id, label: task.title })
  }

  function cancelDelete() {
    const returnFocus = confirmReturnFocus.current
    confirmReturnFocus.current = null
    setConfirmError(null)
    setConfirmRequest(null)
    requestAnimationFrame(() => returnFocus?.focus())
  }

  async function confirmDelete() {
    const request = confirmRequest
    if (!request) return
    setConfirmError(null)

    if (request.kind === "list") {
      const result = await runMutation("delete-list", () =>
        deleteList({ listId: request.id })
      )
      if (!result || !result.ok) {
        setConfirmError(
          result?.error.message ??
            "The list could not be deleted. Try again or cancel."
        )
        return
      }

      const remaining = listPage.items.filter((list) => list.id !== request.id)
      confirmReturnFocus.current = null
      setConfirmRequest(null)
      setListPage((current) => ({
        ...current,
        items: current.items.filter((list) => list.id !== request.id),
      }))
      setNotice({
        tone: "success",
        message: `Deleted list “${request.label}”.`,
      })

      const outcome = resolveListDeleteOutcome(
        remaining.length,
        listPage.nextCursor
      )

      if (outcome === "empty") {
        taskRequestVersion.current += 1
        setSelectedListId(null)
        setTaskPage(emptyTaskPage)
        setTaskLoading(false)
        setFinalListState(true)
        return
      }

      if (outcome === "reload") {
        taskRequestVersion.current += 1
        setSelectedListId(null)
        setTaskPage(emptyTaskPage)
        setTaskLoading(false)
        await reloadListsAfterDelete()
        return
      }

      const nextList = remaining[0]
      setSelectedListId(nextList.id)
      setTaskPage(emptyTaskPage)
      await loadTasksPage(nextList.id, includeCompleted, undefined, "replace")
      focusById(`list-option-${nextList.id}`)
      return
    }

    const result = await runMutation("delete-task", () =>
      deleteTask({ taskId: request.id })
    )
    if (!result || !result.ok) {
      setConfirmError(
        result?.error.message ??
          "The task could not be deleted. Try again or cancel."
      )
      return
    }

    const deletedIndex = taskPage.items.findIndex(
      (task) => task.id === request.id
    )
    const remaining = taskPage.items.filter((task) => task.id !== request.id)
    const focusTask = remaining[deletedIndex] ?? remaining[deletedIndex - 1]

    setConfirmRequest(null)
    setTaskPage((current) => ({
      ...current,
      items: current.items.filter((task) => task.id !== request.id),
    }))
    setNotice({ tone: "success", message: `Deleted task “${request.label}”.` })
    const returnFocus = confirmReturnFocus.current
    confirmReturnFocus.current = null
    if (focusTask) {
      focusById(`task-delete-${focusTask.id}`)
    } else if (remaining.length === 0) {
      focusById("new-task-title")
    } else {
      requestAnimationFrame(() => returnFocus?.focus())
    }
  }

  async function handleCreateTask(
    title: string,
    notes: string
  ): Promise<boolean> {
    if (!selectedListId) return false
    if (!title.trim()) {
      setErrorNotice("A task title is required.")
      return false
    }

    const result = await runMutation("create-task", () =>
      createTask({ listId: selectedListId, title, notes })
    )
    if (!result || !result.ok) return false

    setTaskPage((current) => ({
      ...current,
      items: [
        result.data,
        ...current.items.filter((task) => task.id !== result.data.id),
      ],
    }))
    setNotice({
      tone: "success",
      message: `Added task “${result.data.title}”.`,
    })
    return true
  }

  async function handleUpdateTask(
    taskId: string,
    patch: TaskPatch
  ): Promise<boolean> {
    const result = await runMutation("update-task", () =>
      updateTask({ taskId, ...patch })
    )
    if (!result || !result.ok) return false

    setTaskPage((current) => ({
      ...current,
      items:
        result.data.status === "done" && !includeCompleted
          ? current.items.filter((task) => task.id !== result.data.id)
          : current.items.map((task) =>
              task.id === result.data.id ? result.data : task
            ),
    }))
    setNotice({
      tone: "success",
      message: `Updated task “${result.data.title}”.`,
    })
    return true
  }

  const hasLists = listPage.items.length > 0

  return (
    <div className="min-h-svh bg-background">
      <div ref={dashboardContentRef}>
        <AppHeader user={user} signOut={signOut} />
        <div className="flex min-h-[calc(100svh-81px)] min-w-0 flex-col lg:flex-row">
          {finalListState ? (
            <FinalListState reloadRef={reloadRef} />
          ) : (
            <ListRail
              lists={listPage.items}
              selectedListId={selectedListId}
              nextCursor={listPage.nextCursor}
              pendingOperation={pendingOperation}
              onSelectList={(listId) => void handleSelectList(listId)}
              onCreateList={handleCreateList}
              onRenameList={handleRenameList}
              onRequestDeleteList={requestDeleteList}
              onLoadMore={handleListLoadMore}
            />
          )}
          <main className="flex min-w-0 flex-1 flex-col">
            <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
              {notice ? (
                <Alert
                  className={
                    notice.tone === "error"
                      ? "border-destructive/40 text-destructive"
                      : "border-primary/40"
                  }
                >
                  {notice.message}
                </Alert>
              ) : null}
            </div>
            {finalListState ? (
              <FinalListWorkspace />
            ) : (
              <TaskWorkspace
                selectedList={selectedList}
                tasks={taskPage.items}
                nextCursor={taskPage.nextCursor}
                includeCompleted={includeCompleted}
                loading={taskLoading}
                loadError={taskLoadError}
                pendingOperation={pendingOperation}
                onToggleCompleted={(value) => void handleToggleCompleted(value)}
                onCreateTask={handleCreateTask}
                onUpdateTask={handleUpdateTask}
                onRequestDeleteTask={requestDeleteTask}
                onLoadMore={() =>
                  selectedListId
                    ? loadTasksPage(
                        selectedListId,
                        includeCompleted,
                        taskPage.nextCursor ?? undefined,
                        "append"
                      )
                    : Promise.resolve(0)
                }
                onRetryLoad={() => {
                  if (selectedListId) {
                    void loadTasksPage(
                      selectedListId,
                      includeCompleted,
                      undefined,
                      "replace"
                    )
                  }
                }}
              />
            )}
          </main>
        </div>
        {!hasLists && !finalListState ? (
          <p className="sr-only" role="status">
            No lists are available.
          </p>
        ) : null}
      </div>
      <ConfirmDialog
        request={confirmRequest}
        error={confirmError}
        pending={
          pendingOperation === "delete-list" ||
          pendingOperation === "delete-task"
        }
        onCancel={cancelDelete}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  )
}

interface FinalListStateProps {
  readonly reloadRef: React.RefObject<HTMLButtonElement | null>
}

function FinalListState({ reloadRef }: FinalListStateProps) {
  return (
    <aside className="border-b border-border bg-sidebar p-4 text-sidebar-foreground sm:p-6 lg:flex lg:w-64 lg:shrink-0 lg:border-r lg:border-b-0">
      <div className="my-auto grid max-w-sm gap-4">
        <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Workspace reset
        </p>
        <h2 className="text-lg font-semibold">Your lists are empty</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Inbox will be created the next time this workspace reloads.
        </p>
        <Button
          ref={reloadRef}
          type="button"
          onClick={() => window.location.reload()}
        >
          Reload workspace
        </Button>
      </div>
    </aside>
  )
}

function FinalListWorkspace() {
  return (
    <main className="flex min-w-0 flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-4xl min-w-0 flex-col gap-4 p-4 sm:p-6 lg:p-10">
        <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Workspace reset
        </p>
        <h1 className="text-3xl font-semibold tracking-tight wrap-break-word sm:text-4xl">
          Reload to recreate Inbox
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Use the focused Reload workspace control in the sidebar to start a
          fresh private list.
        </p>
      </div>
    </main>
  )
}

interface ConfirmDialogProps {
  readonly request: {
    readonly kind: "list" | "task"
    readonly id: string
    readonly label: string
  } | null
  readonly error: string | null
  readonly pending: boolean
  readonly onCancel: () => void
  readonly onConfirm: () => void
}

function ConfirmDialog({
  request,
  error,
  pending,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!request) return
    cancelRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) {
        onCancel()
        return
      }

      if (event.key !== "Tab") return
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])"
      )
      if (!focusable?.length) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onCancel, pending, request])

  if (!request) return null

  const resource = request.kind === "list" ? "list" : "task"

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4"
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        aria-describedby={
          error
            ? "delete-dialog-description delete-dialog-error"
            : "delete-dialog-description"
        }
        className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-xl"
      >
        <h2 id="delete-dialog-title" className="text-lg font-semibold">
          Delete this {resource}?
        </h2>
        <p
          id="delete-dialog-description"
          className="mt-2 text-sm leading-6 wrap-break-word text-muted-foreground"
        >
          “{request.label}” and its stored data will be permanently deleted.
          This action cannot be undone.
        </p>
        {error ? (
          <p
            id="delete-dialog-error"
            role="alert"
            className="mt-3 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button
            ref={cancelRef}
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? "Deleting…" : `Delete ${resource}`}
          </Button>
        </div>
      </div>
    </div>
  )
}
