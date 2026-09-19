import { requireUserForHeaders } from "@/src/modules/auth"
import { createTaskResourceHandlers } from "@/src/modules/tasks/presentation/task-routes"
import { loggedHandler } from "@/src/shared/logging/server"

import {
  revalidateDashboard,
  taskApplication,
} from "../../../_todo-dependencies"

export const runtime = "nodejs"

const handlers = createTaskResourceHandlers({
  application: taskApplication,
  authenticate: requireUserForHeaders,
  revalidate: revalidateDashboard,
})

export const PATCH = loggedHandler("tasks", "tasks.update", handlers.PATCH)
export const DELETE = loggedHandler("tasks", "tasks.delete", handlers.DELETE)
