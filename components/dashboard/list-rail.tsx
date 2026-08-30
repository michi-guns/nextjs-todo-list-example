"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ListViewModel } from "@/src/modules/lists/presentation/list-view-model"

import type { PendingOperation } from "./types"

export interface ListRailProps {
  readonly lists: readonly ListViewModel[]
  readonly selectedListId: string | null
  readonly nextCursor: string | null
  readonly pendingOperation: PendingOperation
  readonly onSelectList: (listId: string) => void
  readonly onCreateList: (name: string) => Promise<boolean>
  readonly onRenameList: (listId: string, name: string) => Promise<boolean>
  readonly onRequestDeleteList: (listId: string) => void
  readonly onLoadMore: () => Promise<boolean>
}

export function ListRail({
  lists,
  selectedListId,
  nextCursor,
  pendingOperation,
  onSelectList,
  onCreateList,
  onRenameList,
  onRequestDeleteList,
  onLoadMore,
}: ListRailProps) {
  const [createName, setCreateName] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const createInputRef = useRef<HTMLInputElement>(null)
  const loadMoreRef = useRef<HTMLButtonElement>(null)
  const listButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const lastSelectedIdRef = useRef<string | null>(selectedListId)

  useEffect(() => {
    if (
      selectedListId &&
      selectedListId !== lastSelectedIdRef.current &&
      listButtonRefs.current[selectedListId]
    ) {
      listButtonRefs.current[selectedListId]?.focus()
    }
    lastSelectedIdRef.current = selectedListId
  }, [selectedListId])

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const created = await onCreateList(createName)
    if (created) {
      setCreateName("")
      createInputRef.current?.focus()
    }
  }

  function beginRename(list: ListViewModel) {
    setEditingId(list.id)
    setEditName(list.name)
  }

  async function handleRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingId) return

    const listId = editingId
    const renamed = await onRenameList(listId, editName)
    if (renamed) {
      setEditingId(null)
      requestAnimationFrame(() => listButtonRefs.current[listId]?.focus())
    }
  }

  async function handleLoadMore() {
    const loaded = await onLoadMore()
    if (loaded) {
      requestAnimationFrame(() => loadMoreRef.current?.focus())
    }
  }

  const isCreating = pendingOperation === "create-list"
  const isRenaming = pendingOperation === "rename-list"
  const isLoadingMore = pendingOperation === "load-lists"
  const controlsDisabled = pendingOperation !== null

  return (
    <aside className="border-b border-border bg-sidebar text-sidebar-foreground lg:w-64 lg:shrink-0 lg:border-r lg:border-b-0">
      <div className="flex h-full min-h-0 flex-col gap-5 p-4 sm:p-5 lg:p-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            Workspace
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">Lists</h2>
        </div>

        <form
          onSubmit={handleCreate}
          className="grid gap-2"
          aria-busy={isCreating}
        >
          <Label htmlFor="new-list-name">Create a list</Label>
          <div className="flex gap-2">
            <Input
              ref={createInputRef}
              id="new-list-name"
              name="name"
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              placeholder="List name"
              maxLength={80}
              autoComplete="off"
              disabled={controlsDisabled}
            />
            <Button type="submit" size="sm" disabled={controlsDisabled}>
              {isCreating ? "Adding…" : "Add"}
            </Button>
          </div>
        </form>

        <nav
          aria-label="Your lists"
          aria-busy={isLoadingMore}
          className="min-h-0"
        >
          {lists.length === 0 ? (
            <p
              role="status"
              className="rounded-lg border border-dashed border-sidebar-border p-3 text-sm text-muted-foreground"
            >
              No lists yet. Create one to get started.
            </p>
          ) : (
            <ul className="flex gap-2 overflow-x-auto pb-1 lg:grid lg:overflow-visible">
              {lists.map((list) => {
                const selected = list.id === selectedListId
                const editing = list.id === editingId

                return (
                  <li key={list.id} className="min-w-44 lg:min-w-0">
                    <Button
                      ref={(element) => {
                        listButtonRefs.current[list.id] = element
                      }}
                      id={`list-option-${list.id}`}
                      type="button"
                      variant={selected ? "secondary" : "ghost"}
                      className="h-auto min-h-10 w-full justify-start px-3 py-2 text-left whitespace-normal"
                      aria-current={selected ? "page" : undefined}
                      onClick={() => onSelectList(list.id)}
                      disabled={controlsDisabled}
                    >
                      <span className="min-w-0 flex-1 wrap-break-word">
                        {list.name}
                      </span>
                    </Button>

                    {selected ? (
                      <div className="mt-1 flex items-center gap-1 pl-2">
                        <Button
                          type="button"
                          size="xs"
                          variant="ghost"
                          onClick={() => beginRename(list)}
                          disabled={controlsDisabled}
                        >
                          Rename
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          variant="destructive"
                          onClick={() => onRequestDeleteList(list.id)}
                          disabled={controlsDisabled}
                        >
                          Delete
                        </Button>
                      </div>
                    ) : null}

                    {editing ? (
                      <form
                        onSubmit={handleRename}
                        className="mt-2 grid gap-2 pl-2"
                      >
                        <Label
                          htmlFor={`rename-list-${list.id}`}
                          className="sr-only"
                        >
                          New name for {list.name}
                        </Label>
                        <Input
                          id={`rename-list-${list.id}`}
                          value={editName}
                          onChange={(event) => setEditName(event.target.value)}
                          maxLength={80}
                          autoFocus
                          disabled={isRenaming}
                        />
                        <div className="flex gap-1">
                          <Button
                            type="submit"
                            size="xs"
                            disabled={controlsDisabled}
                          >
                            {isRenaming ? "Saving…" : "Save"}
                          </Button>
                          <Button
                            type="button"
                            size="xs"
                            variant="ghost"
                            onClick={() => setEditingId(null)}
                            disabled={controlsDisabled}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </nav>

        {nextCursor ? (
          <Button
            ref={loadMoreRef}
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => void handleLoadMore()}
            disabled={controlsDisabled}
            aria-label="Load more lists"
          >
            {isLoadingMore ? "Loading lists…" : "Load more lists"}
          </Button>
        ) : null}
      </div>
    </aside>
  )
}
