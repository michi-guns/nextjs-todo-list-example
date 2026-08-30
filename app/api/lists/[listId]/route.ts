import { requireUserForHeaders } from "@/src/modules/auth"
import { createListResourceHandlers } from "@/src/modules/lists/presentation/list-routes"

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

export const PATCH = handlers.PATCH
export const DELETE = handlers.DELETE
