export interface PageState<T> {
  readonly items: readonly T[]
  readonly nextCursor: string | null
}

export type ListDeleteOutcome = "select" | "reload" | "empty"

export function resolveListDeleteOutcome(
  remainingCount: number,
  nextCursor: string | null
): ListDeleteOutcome {
  if (remainingCount > 0) return "select"
  return nextCursor ? "reload" : "empty"
}

export function resetPage<T>(
  _current: PageState<T>,
  page: PageState<T>
): PageState<T> {
  return {
    items: page.items,
    nextCursor: page.nextCursor,
  }
}

export function appendPage<T>(
  current: PageState<T>,
  page: PageState<T>,
  identity?: (item: T) => string
): PageState<T> {
  const existing = identity ? new Set(current.items.map(identity)) : undefined
  const appendedItems = identity
    ? page.items.filter((item) => {
        const key = identity(item)
        if (existing?.has(key)) return false
        existing?.add(key)
        return true
      })
    : page.items

  return {
    items: [...current.items, ...appendedItems],
    nextCursor: page.nextCursor,
  }
}
