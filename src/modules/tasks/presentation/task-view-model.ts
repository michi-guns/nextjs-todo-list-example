import type { Page } from "../../../shared/pagination"
import type { Task } from "../domain/task"

export interface TaskViewModel {
  readonly id: string
  readonly listId: string
  readonly title: string
  readonly notes: string | null
  readonly status: Task["status"]
  readonly createdAt: string
  readonly updatedAt: string
}

export interface TaskPageViewModel {
  readonly items: readonly TaskViewModel[]
  readonly nextCursor: string | null
}

export function toTaskViewModel(task: Task): TaskViewModel {
  return {
    id: task.id,
    listId: task.listId,
    title: task.title,
    notes: task.notes,
    status: task.status,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  }
}

export function toTaskPageViewModel(page: Page<Task>): TaskPageViewModel {
  return {
    items: page.items.map(toTaskViewModel),
    nextCursor: page.nextCursor,
  }
}
