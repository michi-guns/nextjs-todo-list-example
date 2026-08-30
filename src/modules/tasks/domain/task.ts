export type TaskId = string
export type ListId = string
export type UserId = string
export type TaskStatus = "todo" | "in_progress" | "done"

export interface Task {
  readonly id: TaskId
  readonly listId: ListId
  readonly userId: UserId
  readonly title: string
  readonly notes: string | null
  readonly status: TaskStatus
  readonly createdAt: Date
  readonly updatedAt: Date
}
