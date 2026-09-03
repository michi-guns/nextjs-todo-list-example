import "server-only"

import { revalidatePath } from "next/cache"

import { db } from "@/db/db"
import { createListApplication } from "@/src/modules/lists/application/list-use-cases"
import { createDrizzleListRepository } from "@/src/modules/lists/infrastructure/drizzle-list-repository"
import { createTaskApplication } from "@/src/modules/tasks/application/task-use-cases"
import { createDrizzleTaskRepository } from "@/src/modules/tasks/infrastructure/drizzle-task-repository"

export const listApplication = createListApplication(
  createDrizzleListRepository(db)
)

export const taskApplication = createTaskApplication(
  createDrizzleTaskRepository(db)
)

export function revalidateDashboard() {
  revalidatePath("/dashboard", "page")
}
