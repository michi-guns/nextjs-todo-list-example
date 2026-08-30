import { requireUserForHeaders } from "@/src/modules/auth"
import { createListCollectionHandlers } from "@/src/modules/lists/presentation/list-routes"

import { listApplication, revalidateDashboard } from "../../_todo-dependencies"

export const runtime = "nodejs"

const handlers = createListCollectionHandlers({
  application: listApplication,
  authenticate: requireUserForHeaders,
  revalidate: revalidateDashboard,
})

export const GET = handlers.GET
export const POST = handlers.POST
