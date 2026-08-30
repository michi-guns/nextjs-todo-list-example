"use client"

import { useRef, useState, type FormEvent } from "react"

import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { ListViewModel } from "@/src/modules/lists/presentation/list-view-model"
import type { TaskStatus } from "@/src/modules/tasks/domain/task"
import type { TaskViewModel } from "@/src/modules/tasks/presentation/task-view-model"

import type { PendingOperation } from "./types"

const statusLabels: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
}

type TaskPatch = {
  readonly title?: string
  readonly notes?: string | null
  readonly status?: TaskStatus
}

export interface TaskWorkspaceProps {
  readonly selectedList: ListViewModel | null
  readonly tasks: readonly TaskViewModel[]
  readonly nextCursor: string | null
  readonly includeCompleted: boolean
  readonly loading: boolean
  readonly loadError: string | null
  readonly pendingOperation: PendingOperation
  readonly onToggleCompleted: (includeCompleted: boolean) => void
  readonly onCreateTask: (title: string, notes: string) => Promise<boolean>
  readonly onUpdateTask: (taskId: string, patch: TaskPatch) => Promise<boolean>
  readonly onRequestDeleteTask: (taskId: string) => void
  readonly onLoadMore: () => Promise<number>
  readonly onRetryLoad: () => void
}

export function TaskWorkspace({
  selectedList,
  tasks,
  nextCursor,
  includeCompleted,
  loading,
  loadError,
  pendingOperation,
  onToggleCompleted,
  onCreateTask,
  onUpdateTask,
  onRequestDeleteTask,
  onLoadMore,
  onRetryLoad,
}: TaskWorkspaceProps) {
  const controlsDisabled = pendingOperation !== null
  const isLoadingMore = pendingOperation === "load-more-tasks"
  const [paginationAnnouncement, setPaginationAnnouncement] = useState("")
  const paginationStatusRef = useRef<HTMLParagraphElement>(null)

  function announcePagination(added: number) {
    setPaginationAnnouncement(
      added > 0
        ? `Loaded ${added} more ${added === 1 ? "task" : "tasks"}.`
        : "No new tasks were loaded."
    )
    requestAnimationFrame(() => paginationStatusRef.current?.focus())
  }

  return (
    <section className="min-w-0 flex-1" aria-labelledby="workspace-heading">
      <div className="mx-auto flex max-w-4xl min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-10">
        <header className="grid gap-2">
          <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            Task queue
          </p>
          <h1
            id="workspace-heading"
            className="text-3xl font-semibold tracking-tight wrap-break-word sm:text-4xl"
          >
            {selectedList?.name ?? "Your workspace"}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Keep the next meaningful action visible. Tasks stay private to your
            account and remain stored when you hide completed work.
          </p>
        </header>

        {selectedList ? (
          <>
            {loadError ? (
              <Alert className="grid gap-3 border-destructive/40 text-destructive">
                <p>{loadError}</p>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-self-start"
                  onClick={onRetryLoad}
                  disabled={controlsDisabled}
                >
                  Try again
                </Button>
              </Alert>
            ) : null}
            <TaskCapture
              disabled={controlsDisabled}
              pending={pendingOperation === "create-task"}
              onCreateTask={onCreateTask}
            />
            <TaskToolbar
              includeCompleted={includeCompleted}
              disabled={controlsDisabled}
              loading={loading}
              onToggleCompleted={onToggleCompleted}
            />
            <TaskQueue
              tasks={tasks}
              loading={loading}
              includeCompleted={includeCompleted}
              controlsDisabled={controlsDisabled}
              pendingOperation={pendingOperation}
              onUpdateTask={onUpdateTask}
              onRequestDeleteTask={onRequestDeleteTask}
            />
            {nextCursor ? (
              <LoadMoreTasks
                loading={isLoadingMore}
                disabled={controlsDisabled}
                onLoadMore={onLoadMore}
                onLoaded={announcePagination}
              />
            ) : null}
            <p
              ref={paginationStatusRef}
              tabIndex={-1}
              role="status"
              aria-live="polite"
              className="sr-only"
            >
              {paginationAnnouncement}
            </p>
          </>
        ) : (
          <div
            className="rounded-xl border border-dashed border-border bg-muted/30 p-6"
            role="status"
          >
            <h2 className="text-base font-semibold">No list selected</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Create a list in the rail to start capturing tasks.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

interface TaskCaptureProps {
  readonly disabled: boolean
  readonly pending: boolean
  readonly onCreateTask: (title: string, notes: string) => Promise<boolean>
}

function TaskCapture({ disabled, pending, onCreateTask }: TaskCaptureProps) {
  const [title, setTitle] = useState("")
  const [notes, setNotes] = useState("")
  const titleRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const created = await onCreateTask(title, notes)
    if (created) {
      setTitle("")
      setNotes("")
      titleRef.current?.focus()
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:p-5"
      aria-labelledby="capture-heading"
      aria-busy={pending}
    >
      <div>
        <h2 id="capture-heading" className="text-base font-semibold">
          Capture a task
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Start with a clear title; notes are optional.
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="new-task-title">Title</Label>
        <Input
          ref={titleRef}
          id="new-task-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What needs doing?"
          maxLength={200}
          autoComplete="off"
          disabled={disabled}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="new-task-notes">Notes (optional)</Label>
        <Textarea
          id="new-task-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Add useful context"
          maxLength={5000}
          rows={3}
          disabled={disabled}
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={disabled}>
          {pending ? "Adding task…" : "Add task"}
        </Button>
      </div>
    </form>
  )
}

interface TaskToolbarProps {
  readonly includeCompleted: boolean
  readonly disabled: boolean
  readonly loading: boolean
  readonly onToggleCompleted: (includeCompleted: boolean) => void
}

function TaskToolbar({
  includeCompleted,
  disabled,
  loading,
  onToggleCompleted,
}: TaskToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
      <label className="inline-flex min-h-9 cursor-pointer items-center gap-3 text-sm font-medium">
        <input
          type="checkbox"
          checked={includeCompleted}
          onChange={(event) => onToggleCompleted(event.target.checked)}
          disabled={disabled}
          className="size-4 accent-primary focus-visible:ring-3 focus-visible:ring-ring/40"
        />
        Show completed tasks
      </label>
      <p
        className="text-sm text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        {loading
          ? "Loading tasks…"
          : includeCompleted
            ? "Completed tasks are shown"
            : "Completed tasks are hidden"}
      </p>
    </div>
  )
}

interface TaskQueueProps {
  readonly tasks: readonly TaskViewModel[]
  readonly loading: boolean
  readonly includeCompleted: boolean
  readonly controlsDisabled: boolean
  readonly pendingOperation: PendingOperation
  readonly onUpdateTask: (taskId: string, patch: TaskPatch) => Promise<boolean>
  readonly onRequestDeleteTask: (taskId: string) => void
}

function TaskQueue({
  tasks,
  loading,
  includeCompleted,
  controlsDisabled,
  pendingOperation,
  onUpdateTask,
  onRequestDeleteTask,
}: TaskQueueProps) {
  if (loading && tasks.length === 0) {
    return (
      <div className="grid gap-3" aria-busy="true" aria-live="polite">
        <div className="h-28 animate-pulse rounded-xl border border-border bg-muted/40" />
        <div className="h-28 animate-pulse rounded-xl border border-border bg-muted/40" />
        <p className="sr-only" role="status">
          Loading tasks…
        </p>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div
        className="rounded-xl border border-dashed border-border bg-muted/30 p-6"
        role="status"
      >
        <h2 className="text-base font-semibold">
          {includeCompleted ? "This list is clear" : "No active tasks"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {includeCompleted
            ? "Capture a task above when something needs your attention."
            : "Completed tasks are hidden. Show completed tasks to review them."}
        </p>
      </div>
    )
  }

  return (
    <ul className="grid gap-3" aria-label="Tasks">
      {tasks.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          controlsDisabled={controlsDisabled}
          updating={pendingOperation === "update-task"}
          deleting={pendingOperation === "delete-task"}
          onUpdateTask={onUpdateTask}
          onRequestDeleteTask={onRequestDeleteTask}
        />
      ))}
    </ul>
  )
}

interface TaskRowProps {
  readonly task: TaskViewModel
  readonly controlsDisabled: boolean
  readonly updating: boolean
  readonly deleting: boolean
  readonly onUpdateTask: (taskId: string, patch: TaskPatch) => Promise<boolean>
  readonly onRequestDeleteTask: (taskId: string) => void
}

function TaskRow({
  task,
  controlsDisabled,
  updating,
  deleting,
  onUpdateTask,
  onRequestDeleteTask,
}: TaskRowProps) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(task.title)
  const [notes, setNotes] = useState(task.notes ?? "")
  const [error, setError] = useState<string | null>(null)
  const editButtonRef = useRef<HTMLButtonElement>(null)

  function beginEditing() {
    setTitle(task.title)
    setNotes(task.notes ?? "")
    setError(null)
    setEditing(true)
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedTitle = title.trim()
    if (!normalizedTitle) {
      setError("A task title is required.")
      return
    }

    const updated = await onUpdateTask(task.id, {
      title: normalizedTitle,
      notes: notes.trim() || null,
    })
    if (updated) {
      setEditing(false)
      setError(null)
      requestAnimationFrame(() => editButtonRef.current?.focus())
    }
  }

  return (
    <li
      className={`min-w-0 rounded-xl border border-border bg-card p-4 transition-colors sm:p-5 ${
        task.status === "done" ? "bg-muted/50" : ""
      }`}
      aria-busy={updating || deleting}
    >
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3
              className={`text-base leading-6 font-semibold wrap-break-word ${
                task.status === "done"
                  ? "text-muted-foreground line-through"
                  : ""
              }`}
            >
              {task.title}
            </h3>
            {task.notes ? (
              <p className="mt-2 text-sm leading-6 wrap-break-word text-muted-foreground">
                {task.notes}
              </p>
            ) : null}
          </div>
          <span className="shrink-0 rounded-md border border-border px-2 py-1 text-xs font-medium">
            Status: {statusLabels[task.status]}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Label
            htmlFor={`task-status-${task.id}`}
            className="text-xs text-muted-foreground"
          >
            Change status
          </Label>
          <select
            id={`task-status-${task.id}`}
            value={task.status}
            onChange={(event) =>
              void onUpdateTask(task.id, {
                status: event.target.value as TaskStatus,
              })
            }
            disabled={controlsDisabled}
            className="h-9 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
          >
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button
              ref={editButtonRef}
              type="button"
              size="sm"
              variant="outline"
              onClick={beginEditing}
              disabled={controlsDisabled}
            >
              Edit
            </Button>
            <Button
              id={`task-delete-${task.id}`}
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => onRequestDeleteTask(task.id)}
              disabled={controlsDisabled}
            >
              Delete
            </Button>
          </div>
        </div>

        {editing ? (
          <form
            onSubmit={saveEdit}
            className="grid gap-3 border-t border-border pt-4"
          >
            <div className="grid gap-2">
              <Label htmlFor={`edit-task-title-${task.id}`}>Task title</Label>
              <Input
                id={`edit-task-title-${task.id}`}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={200}
                autoFocus
                disabled={controlsDisabled}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`edit-task-notes-${task.id}`}>Notes</Label>
              <Textarea
                id={`edit-task-notes-${task.id}`}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                maxLength={5000}
                rows={3}
                disabled={controlsDisabled}
              />
            </div>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="submit" size="sm" disabled={controlsDisabled}>
                {updating ? "Saving…" : "Save changes"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setEditing(false)}
                disabled={controlsDisabled}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : null}
      </div>
    </li>
  )
}

interface LoadMoreTasksProps {
  readonly loading: boolean
  readonly disabled: boolean
  readonly onLoadMore: () => Promise<number>
  readonly onLoaded: (added: number) => void
}

function LoadMoreTasks({
  loading,
  disabled,
  onLoadMore,
  onLoaded,
}: LoadMoreTasksProps) {
  async function handleLoadMore() {
    onLoaded(await onLoadMore())
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="self-start"
      onClick={() => void handleLoadMore()}
      disabled={disabled}
      aria-label="Load more tasks"
    >
      {loading ? "Loading tasks…" : "Load more tasks"}
    </Button>
  )
}
