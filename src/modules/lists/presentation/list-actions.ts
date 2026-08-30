import type { CurrentUser } from "../../auth/domain/current-user"
import {
  actionErrorResult,
  inputFromActionValue,
  invalidInputActionResult,
  type ActionResult,
} from "../../../shared/entry-contract"
import type { createListApplication } from "../application/list-use-cases"
import {
  createListInputSchema,
  deleteListInputSchema,
  renameListInputSchema,
} from "./list-schemas"
import { toListViewModel, type ListViewModel } from "./list-view-model"

type ListApplication = ReturnType<typeof createListApplication>

export interface ListActionDependencies {
  readonly application: ListApplication
  readonly authenticate: () => Promise<CurrentUser>
  readonly revalidate?: () => void | Promise<void>
}

type AuthenticationResult =
  { readonly user: CurrentUser } | { readonly failure: ActionResult<never> }

async function authenticate(
  dependencies: ListActionDependencies
): Promise<AuthenticationResult> {
  try {
    return { user: await dependencies.authenticate() }
  } catch (error) {
    return { failure: actionErrorResult(error) }
  }
}

export function createListActionHandlers(dependencies: ListActionDependencies) {
  async function createList(
    value: unknown
  ): Promise<ActionResult<ListViewModel>> {
    const authentication = await authenticate(dependencies)
    if ("failure" in authentication) {
      return authentication.failure
    }

    const parsed = createListInputSchema.safeParse(inputFromActionValue(value))
    if (!parsed.success) {
      return invalidInputActionResult()
    }

    try {
      const list = await dependencies.application.createList(
        authentication.user.id,
        parsed.data
      )
      await dependencies.revalidate?.()
      return { ok: true, data: toListViewModel(list) }
    } catch (error) {
      return actionErrorResult(error)
    }
  }

  async function renameList(
    value: unknown
  ): Promise<ActionResult<ListViewModel>> {
    const authentication = await authenticate(dependencies)
    if ("failure" in authentication) {
      return authentication.failure
    }

    const parsed = renameListInputSchema.safeParse(inputFromActionValue(value))
    if (!parsed.success) {
      return invalidInputActionResult()
    }

    try {
      const list = await dependencies.application.renameList(
        authentication.user.id,
        parsed.data.listId,
        { name: parsed.data.name }
      )
      await dependencies.revalidate?.()
      return { ok: true, data: toListViewModel(list) }
    } catch (error) {
      return actionErrorResult(error)
    }
  }

  async function deleteList(
    value: unknown
  ): Promise<ActionResult<{ readonly deleted: true }>> {
    const authentication = await authenticate(dependencies)
    if ("failure" in authentication) {
      return authentication.failure
    }

    const parsed = deleteListInputSchema.safeParse(inputFromActionValue(value))
    if (!parsed.success) {
      return invalidInputActionResult()
    }

    try {
      await dependencies.application.deleteList(
        authentication.user.id,
        parsed.data.listId
      )
      await dependencies.revalidate?.()
      return { ok: true, data: { deleted: true } }
    } catch (error) {
      return actionErrorResult(error)
    }
  }

  return { createList, renameList, deleteList }
}
