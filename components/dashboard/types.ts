export type PendingOperation =
  | "create-list"
  | "rename-list"
  | "delete-list"
  | "load-lists"
  | "load-tasks"
  | "load-more-tasks"
  | "create-task"
  | "update-task"
  | "delete-task"
  | null

export type Notice = {
  readonly tone: "error" | "success"
  readonly message: string
}
