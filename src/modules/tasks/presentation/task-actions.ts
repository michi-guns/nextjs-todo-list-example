import type { CurrentUser } from "../../auth/domain/current-user"
import {
  actionErrorResult,
  inputFromActionValue,
  invalidInputActionResult,
  type ActionResult,
} from "../../../shared/entry-contract"
import type { createTaskApplication } from "../application/task-use-cases"
import {
  createTaskInputSchema,
  deleteTaskInputSchema,
  updateTaskInputSchema,
} from "./task-schemas"
import { toTaskViewModel, type TaskViewModel } from "./task-view-model"

type TaskApplication = ReturnType<typeof createTaskApplication>

export interface TaskActionDependencies {
  readonly application: TaskApplication
  readonly authenticate: () => Promise<CurrentUser>
  readonly revalidate?: () => void | Promise<void>
}

type AuthenticationResult =
  { readonly user: CurrentUser } | { readonly failure: ActionResult<never> }

async function authenticate(
  dependencies: TaskActionDependencies
): Promise<AuthenticationResult> {
  try {
    return { user: await dependencies.authenticate() }
  } catch (error) {
    return { failure: actionErrorResult(error) }
  }
}

export function createTaskActionHandlers(dependencies: TaskActionDependencies) {
  async function createTask(
    value: unknown
  ): Promise<ActionResult<TaskViewModel>> {
    const authentication = await authenticate(dependencies)
    if ("failure" in authentication) {
      return authentication.failure
    }

    const parsed = createTaskInputSchema.safeParse(inputFromActionValue(value))
    if (!parsed.success) {
      return invalidInputActionResult()
    }

    try {
      const task = await dependencies.application.createTask(
        authentication.user.id,
        parsed.data.listId,
        { title: parsed.data.title, notes: parsed.data.notes }
      )
      await dependencies.revalidate?.()
      return { ok: true, data: toTaskViewModel(task) }
    } catch (error) {
      return actionErrorResult(error)
    }
  }

  async function updateTask(
    value: unknown
  ): Promise<ActionResult<TaskViewModel>> {
    const authentication = await authenticate(dependencies)
    if ("failure" in authentication) {
      return authentication.failure
    }

    const parsed = updateTaskInputSchema.safeParse(inputFromActionValue(value))
    if (!parsed.success) {
      return invalidInputActionResult()
    }

    const { taskId, ...patch } = parsed.data
    try {
      const task = await dependencies.application.updateTask(
        authentication.user.id,
        taskId,
        patch
      )
      await dependencies.revalidate?.()
      return { ok: true, data: toTaskViewModel(task) }
    } catch (error) {
      return actionErrorResult(error)
    }
  }

  async function deleteTask(
    value: unknown
  ): Promise<ActionResult<{ readonly deleted: true }>> {
    const authentication = await authenticate(dependencies)
    if ("failure" in authentication) {
      return authentication.failure
    }

    const parsed = deleteTaskInputSchema.safeParse(inputFromActionValue(value))
    if (!parsed.success) {
      return invalidInputActionResult()
    }

    try {
      await dependencies.application.deleteTask(
        authentication.user.id,
        parsed.data.taskId
      )
      await dependencies.revalidate?.()
      return { ok: true, data: { deleted: true } }
    } catch (error) {
      return actionErrorResult(error)
    }
  }

  return { createTask, updateTask, deleteTask }
}
