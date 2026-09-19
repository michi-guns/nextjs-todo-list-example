import { redirect } from "next/navigation"
import { connection } from "next/server"

import {
  createListAction,
  deleteListAction,
  renameListAction,
} from "@/app/actions/lists"
import {
  createTaskAction,
  deleteTaskAction,
  updateTaskAction,
} from "@/app/actions/tasks"
import { signOutAction } from "@/app/actions/auth"
import { DashboardClient } from "@/components/dashboard/dashboard-client"
import type { DashboardUser } from "@/components/dashboard/types"
import { listApplication, taskApplication } from "@/app/_todo-dependencies"
import { requireUser, UnauthenticatedError } from "@/src/modules/auth"
import { toListPageViewModel } from "@/src/modules/lists/presentation/list-view-model"
import { toTaskPageViewModel } from "@/src/modules/tasks/presentation/task-view-model"
import { runLoggedOperation } from "@/src/shared/logging/server"

export const runtime = "nodejs"

export const metadata = {
  title: "Dashboard | Focus Rail",
  description: "Manage your private lists and tasks.",
}

export default async function DashboardPage() {
  // Refresh policy only for real requests, before auth reads can stop prerendering.
  await connection()
  let data
  try {
    data = await runLoggedOperation("dashboard", "dashboard.read", async () => {
      const user = await requireUser()
      await listApplication.ensureDefaultInbox(user.id)
      const listPage = toListPageViewModel(
        await listApplication.listLists(user.id)
      )
      const selectedList = listPage.items[0]
      const initialTasks = selectedList
        ? toTaskPageViewModel(
            await taskApplication.listTasks(user.id, selectedList.id)
          )
        : null
      return { user, listPage, initialTasks }
    })
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      redirect("/sign-in?next=%2Fdashboard")
    }
    throw error
  }

  const { user, listPage, initialTasks } = data
  const dashboardUser: DashboardUser = {
    email: user.email,
    name: user.name,
  }

  return (
    <DashboardClient
      user={dashboardUser}
      initialLists={listPage}
      initialTasks={initialTasks}
      createList={createListAction}
      renameList={renameListAction}
      deleteList={deleteListAction}
      createTask={createTaskAction}
      updateTask={updateTaskAction}
      deleteTask={deleteTaskAction}
      signOut={signOutAction}
    />
  )
}
