import type { CurrentUser } from "../../auth/domain/current-user"
import {
  assertSameOriginMutation,
  InvalidEntryInputError,
  jsonErrorResponse,
} from "../../../shared/entry-contract"
import { parsePaginationQuery } from "../../../shared/pagination"
import type { createTaskApplication } from "../application/task-use-cases"
import {
  createTaskBodySchema,
  listIdSchema,
  taskIdSchema,
  taskPatchSchema,
} from "./task-schemas"
import { toTaskPageViewModel, toTaskViewModel } from "./task-view-model"

type TaskApplication = ReturnType<typeof createTaskApplication>

export interface TaskRouteDependencies {
  readonly application: TaskApplication
  readonly authenticate: (headers: Headers) => Promise<CurrentUser>
  readonly revalidate?: () => void | Promise<void>
}

export type TaskListRouteContext = {
  readonly params: Promise<{ readonly listId: string }>
}

export type TaskResourceRouteContext = {
  readonly params: Promise<{ readonly taskId: string }>
}

async function getAuthenticatedUser(
  request: Request,
  dependencies: TaskRouteDependencies
): Promise<{ readonly user: CurrentUser } | { readonly response: Response }> {
  try {
    return {
      user: await dependencies.authenticate(new Headers(request.headers)),
    }
  } catch (error) {
    return { response: jsonErrorResponse(error) }
  }
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    throw new InvalidEntryInputError()
  }
}

function parseTaskQuery(request: Request) {
  const searchParams = new URL(request.url).searchParams
  const includeCompletedValues = searchParams.getAll("includeCompleted")
  if (includeCompletedValues.length > 1) {
    throw new InvalidEntryInputError()
  }

  const includeCompletedValue = includeCompletedValues[0]
  let includeCompleted = true
  if (includeCompletedValue !== undefined) {
    if (includeCompletedValue === "true") {
      includeCompleted = true
    } else if (includeCompletedValue === "false") {
      includeCompleted = false
    } else {
      throw new InvalidEntryInputError()
    }
  }

  return {
    ...parsePaginationQuery(searchParams),
    includeCompleted,
  }
}

function pageResponse(page: Awaited<ReturnType<TaskApplication["listTasks"]>>) {
  return Response.json(toTaskPageViewModel(page))
}

export function createTaskListHandlers(dependencies: TaskRouteDependencies) {
  async function resourceId(
    context: TaskListRouteContext
  ): Promise<string | Response> {
    const { listId } = await context.params
    const parsed = listIdSchema.safeParse(listId)
    return parsed.success
      ? parsed.data
      : jsonErrorResponse(new InvalidEntryInputError())
  }

  async function GET(
    request: Request,
    context: TaskListRouteContext
  ): Promise<Response> {
    const authentication = await getAuthenticatedUser(request, dependencies)
    if ("response" in authentication) {
      return authentication.response
    }

    let listId: string | Response
    try {
      listId = await resourceId(context)
    } catch (error) {
      return jsonErrorResponse(error)
    }
    if (listId instanceof Response) {
      return listId
    }

    try {
      const page = parseTaskQuery(request)
      const result = await dependencies.application.listTasks(
        authentication.user.id,
        listId,
        page
      )
      return pageResponse(result)
    } catch (error) {
      return jsonErrorResponse(error)
    }
  }

  async function POST(
    request: Request,
    context: TaskListRouteContext
  ): Promise<Response> {
    const authentication = await getAuthenticatedUser(request, dependencies)
    if ("response" in authentication) {
      return authentication.response
    }

    try {
      assertSameOriginMutation(request, { jsonBody: true })
    } catch (error) {
      return jsonErrorResponse(error)
    }

    let listId: string | Response
    try {
      listId = await resourceId(context)
    } catch (error) {
      return jsonErrorResponse(error)
    }
    if (listId instanceof Response) {
      return listId
    }

    let value: unknown
    try {
      value = await readJson(request)
    } catch (error) {
      return jsonErrorResponse(error)
    }

    const parsed = createTaskBodySchema.safeParse(value)
    if (!parsed.success) {
      return jsonErrorResponse(new InvalidEntryInputError())
    }

    try {
      const task = await dependencies.application.createTask(
        authentication.user.id,
        listId,
        parsed.data
      )
      await dependencies.revalidate?.()
      return Response.json(toTaskViewModel(task))
    } catch (error) {
      return jsonErrorResponse(error)
    }
  }

  return { GET, POST }
}

export function createTaskResourceHandlers(
  dependencies: TaskRouteDependencies
) {
  async function resourceId(
    context: TaskResourceRouteContext
  ): Promise<string | Response> {
    const { taskId } = await context.params
    const parsed = taskIdSchema.safeParse(taskId)
    return parsed.success
      ? parsed.data
      : jsonErrorResponse(new InvalidEntryInputError())
  }

  async function PATCH(
    request: Request,
    context: TaskResourceRouteContext
  ): Promise<Response> {
    const authentication = await getAuthenticatedUser(request, dependencies)
    if ("response" in authentication) {
      return authentication.response
    }

    try {
      assertSameOriginMutation(request, { jsonBody: true })
    } catch (error) {
      return jsonErrorResponse(error)
    }

    let taskId: string | Response
    try {
      taskId = await resourceId(context)
    } catch (error) {
      return jsonErrorResponse(error)
    }
    if (taskId instanceof Response) {
      return taskId
    }

    let value: unknown
    try {
      value = await readJson(request)
    } catch (error) {
      return jsonErrorResponse(error)
    }

    const parsed = taskPatchSchema.safeParse(value)
    if (!parsed.success) {
      return jsonErrorResponse(new InvalidEntryInputError())
    }

    try {
      const task = await dependencies.application.updateTask(
        authentication.user.id,
        taskId,
        parsed.data
      )
      await dependencies.revalidate?.()
      return Response.json(toTaskViewModel(task))
    } catch (error) {
      return jsonErrorResponse(error)
    }
  }

  async function DELETE(
    request: Request,
    context: TaskResourceRouteContext
  ): Promise<Response> {
    const authentication = await getAuthenticatedUser(request, dependencies)
    if ("response" in authentication) {
      return authentication.response
    }

    try {
      assertSameOriginMutation(request)
    } catch (error) {
      return jsonErrorResponse(error)
    }

    let taskId: string | Response
    try {
      taskId = await resourceId(context)
    } catch (error) {
      return jsonErrorResponse(error)
    }
    if (taskId instanceof Response) {
      return taskId
    }

    try {
      await dependencies.application.deleteTask(authentication.user.id, taskId)
      await dependencies.revalidate?.()
      return Response.json({ deleted: true })
    } catch (error) {
      return jsonErrorResponse(error)
    }
  }

  return { PATCH, DELETE }
}
