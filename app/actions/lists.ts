"use server"

import { requireUser } from "@/src/modules/auth"
import { createListActionHandlers } from "@/src/modules/lists/presentation/list-actions"

import { listApplication, revalidateDashboard } from "../_todo-dependencies"

const handlers = createListActionHandlers({
  application: listApplication,
  authenticate: requireUser,
  revalidate: revalidateDashboard,
})

export async function createListAction(input: unknown) {
  return handlers.createList(input)
}

export async function renameListAction(input: unknown) {
  return handlers.renameList(input)
}

export async function deleteListAction(input: unknown) {
  return handlers.deleteList(input)
}
