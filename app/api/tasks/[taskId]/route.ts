import { requireUserForHeaders } from "@/src/modules/auth"
import { createTaskResourceHandlers } from "@/src/modules/tasks/presentation/task-routes"

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

export const PATCH = handlers.PATCH
export const DELETE = handlers.DELETE
