import { requireUserForHeaders } from "@/src/modules/auth"
import { createTaskListHandlers } from "@/src/modules/tasks/presentation/task-routes"
import { loggedHandler } from "@/src/shared/logging/server"

import {
  revalidateDashboard,
  taskApplication,
} from "../../../../_todo-dependencies"

export const runtime = "nodejs"

const handlers = createTaskListHandlers({
  application: taskApplication,
  authenticate: requireUserForHeaders,
  revalidate: revalidateDashboard,
})

export const GET = loggedHandler("tasks", "tasks.read", handlers.GET)
export const POST = loggedHandler("tasks", "tasks.create", handlers.POST)
