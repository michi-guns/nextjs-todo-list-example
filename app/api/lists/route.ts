import { requireUserForHeaders } from "@/src/modules/auth"
import { createListCollectionHandlers } from "@/src/modules/lists/presentation/list-routes"
import { loggedHandler } from "@/src/shared/logging/server"

import { listApplication, revalidateDashboard } from "../../_todo-dependencies"

export const runtime = "nodejs"

const handlers = createListCollectionHandlers({
  application: listApplication,
  authenticate: requireUserForHeaders,
  revalidate: revalidateDashboard,
})

export const GET = loggedHandler("lists", "lists.read", handlers.GET)
export const POST = loggedHandler("lists", "lists.create", handlers.POST)
