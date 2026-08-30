import type { List, ListId, UserId } from "../domain/list"
import type { Page, PageRequest } from "../../../shared/pagination"

export type { Page, PageRequest } from "../../../shared/pagination"

export interface ListRepository {
  listByUser(userId: UserId, page: PageRequest): Promise<Page<List>>
  findByIdForUser(userId: UserId, listId: ListId): Promise<List | null>
  ensureDefaultInbox(userId: UserId, now: Date): Promise<List>
  insert(input: { userId: UserId; name: string; now: Date }): Promise<List>
  rename(
    userId: UserId,
    listId: ListId,
    name: string,
    now: Date
  ): Promise<List | null>
  delete(userId: UserId, listId: ListId): Promise<boolean>
}
