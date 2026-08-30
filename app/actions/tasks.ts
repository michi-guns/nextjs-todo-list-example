"use server"

import { requireUser } from "@/src/modules/auth"
import { createTaskActionHandlers } from "@/src/modules/tasks/presentation/task-actions"

import { revalidateDashboard, taskApplication } from "../_todo-dependencies"

const handlers = createTaskActionHandlers({
  application: taskApplication,
  authenticate: requireUser,
  revalidate: revalidateDashboard,
})

export async function createTaskAction(input: unknown) {
  return handlers.createTask(input)
}

export async function updateTaskAction(input: unknown) {
  return handlers.updateTask(input)
}

export async function deleteTaskAction(input: unknown) {
  return handlers.deleteTask(input)
}
