"use server"

import { requireUser } from "@/src/modules/auth"
import { createTaskActionHandlers } from "@/src/modules/tasks/presentation/task-actions"
import { runLoggedOperation } from "@/src/shared/logging/server"

import { revalidateDashboard, taskApplication } from "../_todo-dependencies"

const handlers = createTaskActionHandlers({
  application: taskApplication,
  authenticate: requireUser,
  revalidate: revalidateDashboard,
})

export async function createTaskAction(input: unknown) {
  return runLoggedOperation("tasks", "tasks.create.action", () =>
    handlers.createTask(input)
  )
}

export async function updateTaskAction(input: unknown) {
  return runLoggedOperation("tasks", "tasks.update.action", () =>
    handlers.updateTask(input)
  )
}

export async function deleteTaskAction(input: unknown) {
  return runLoggedOperation("tasks", "tasks.delete.action", () =>
    handlers.deleteTask(input)
  )
}
