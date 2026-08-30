import { requireUserForHeaders } from "@/src/modules/auth"
import { createTaskListHandlers } from "@/src/modules/tasks/presentation/task-routes"

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

export const GET = handlers.GET
export const POST = handlers.POST
