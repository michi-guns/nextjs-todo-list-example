import type { Page } from "../../../shared/pagination"
import type { List } from "../domain/list"

export interface ListViewModel {
  readonly id: string
  readonly name: string
  readonly createdAt: string
  readonly updatedAt: string
}

export interface ListPageViewModel {
  readonly items: readonly ListViewModel[]
  readonly nextCursor: string | null
}

export function toListViewModel(list: List): ListViewModel {
  return {
    id: list.id,
    name: list.name,
    createdAt: list.createdAt.toISOString(),
    updatedAt: list.updatedAt.toISOString(),
  }
}

export function toListPageViewModel(page: Page<List>): ListPageViewModel {
  return {
    items: page.items.map(toListViewModel),
    nextCursor: page.nextCursor,
  }
}
