"use server"

import { requireUser } from "@/src/modules/auth"
import { createListActionHandlers } from "@/src/modules/lists/presentation/list-actions"
import { runLoggedOperation } from "@/src/shared/logging/server"

import { listApplication, revalidateDashboard } from "../_todo-dependencies"

const handlers = createListActionHandlers({
  application: listApplication,
  authenticate: requireUser,
  revalidate: revalidateDashboard,
})

export async function createListAction(input: unknown) {
  return runLoggedOperation("lists", "lists.create.action", () =>
    handlers.createList(input)
  )
}

export async function renameListAction(input: unknown) {
  return runLoggedOperation("lists", "lists.rename.action", () =>
    handlers.renameList(input)
  )
}

export async function deleteListAction(input: unknown) {
  return runLoggedOperation("lists", "lists.delete.action", () =>
    handlers.deleteList(input)
  )
}
