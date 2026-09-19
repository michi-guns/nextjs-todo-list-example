import { requireUserForHeaders } from "@/src/modules/auth"
import { createListResourceHandlers } from "@/src/modules/lists/presentation/list-routes"
import { loggedHandler } from "@/src/shared/logging/server"

import {
  listApplication,
  revalidateDashboard,
} from "../../../_todo-dependencies"

export const runtime = "nodejs"

const handlers = createListResourceHandlers({
  application: listApplication,
  authenticate: requireUserForHeaders,
  revalidate: revalidateDashboard,
})

export const PATCH = loggedHandler("lists", "lists.rename", handlers.PATCH)
export const DELETE = loggedHandler("lists", "lists.delete", handlers.DELETE)
