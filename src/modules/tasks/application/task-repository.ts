import type { ListId, Task, TaskId, TaskStatus, UserId } from "../domain/task"

export interface TaskPageRequest {
  readonly cursor?: string
  readonly limit?: number
  readonly includeCompleted?: boolean
}

export interface Page<T> {
  readonly items: readonly T[]
  readonly nextCursor: string | null
}

export interface TaskPatch {
  readonly title?: string
  readonly notes?: string | null
  readonly status?: TaskStatus
}

export interface TaskRepository {
  listByOwnedList(
    userId: UserId,
    listId: ListId,
    options: TaskPageRequest & { readonly includeCompleted: boolean }
  ): Promise<Page<Task> | "list_not_found">
  insert(input: {
    readonly userId: UserId
    readonly listId: ListId
    readonly title: string
    readonly notes: string | null
    readonly status: TaskStatus
    readonly now: Date
  }): Promise<Task | "list_not_found">
  findByIdForUser(userId: UserId, taskId: TaskId): Promise<Task | null>
  updateForUser(
    userId: UserId,
    taskId: TaskId,
    patch: TaskPatch,
    now: Date
  ): Promise<Task | null>
  deleteForUser(userId: UserId, taskId: TaskId): Promise<boolean>
}
