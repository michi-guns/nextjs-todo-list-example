import type { CurrentUser } from "../../auth/domain/current-user"
import {
  assertSameOriginMutation,
  InvalidEntryInputError,
  jsonErrorResponse,
} from "../../../shared/entry-contract"
import { parsePaginationQuery } from "../../../shared/pagination"
import type { createListApplication } from "../application/list-use-cases"
import {
  createListInputSchema,
  listIdSchema,
  renameListInputSchema,
} from "./list-schemas"
import { toListPageViewModel, toListViewModel } from "./list-view-model"

type ListApplication = ReturnType<typeof createListApplication>

export interface ListRouteDependencies {
  readonly application: ListApplication
  readonly authenticate: (headers: Headers) => Promise<CurrentUser>
  readonly revalidate?: () => void | Promise<void>
}

export type ListResourceRouteContext = {
  readonly params: Promise<{ readonly listId: string }>
}

async function getAuthenticatedUser(
  request: Request,
  dependencies: ListRouteDependencies
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

function parseListId(value: string) {
  return listIdSchema.safeParse(value)
}

function pageResponse(page: Awaited<ReturnType<ListApplication["listLists"]>>) {
  return Response.json(toListPageViewModel(page))
}

export function createListCollectionHandlers(
  dependencies: ListRouteDependencies
) {
  async function GET(request: Request): Promise<Response> {
    const authentication = await getAuthenticatedUser(request, dependencies)
    if ("response" in authentication) {
      return authentication.response
    }

    try {
      const page = parsePaginationQuery(new URL(request.url).searchParams)
      const result = await dependencies.application.listLists(
        authentication.user.id,
        page
      )
      return pageResponse(result)
    } catch (error) {
      return jsonErrorResponse(error)
    }
  }

  async function POST(request: Request): Promise<Response> {
    const authentication = await getAuthenticatedUser(request, dependencies)
    if ("response" in authentication) {
      return authentication.response
    }

    try {
      assertSameOriginMutation(request, { jsonBody: true })
    } catch (error) {
      return jsonErrorResponse(error)
    }

    let value: unknown
    try {
      value = await readJson(request)
    } catch (error) {
      return jsonErrorResponse(error)
    }

    const parsed = createListInputSchema.safeParse(value)
    if (!parsed.success) {
      return jsonErrorResponse(new InvalidEntryInputError())
    }

    try {
      const list = await dependencies.application.createList(
        authentication.user.id,
        parsed.data
      )
      await dependencies.revalidate?.()
      return Response.json(toListViewModel(list))
    } catch (error) {
      return jsonErrorResponse(error)
    }
  }

  return { GET, POST }
}

export function createListResourceHandlers(
  dependencies: ListRouteDependencies
) {
  async function resourceId(
    context: ListResourceRouteContext
  ): Promise<string | Response> {
    const { listId } = await context.params
    const parsed = parseListId(listId)
    return parsed.success
      ? parsed.data
      : jsonErrorResponse(new InvalidEntryInputError())
  }

  async function PATCH(
    request: Request,
    context: ListResourceRouteContext
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

    const parsed = renameListInputSchema.safeParse({
      ...(typeof value === "object" && value !== null ? value : {}),
      listId,
    })
    if (!parsed.success) {
      return jsonErrorResponse(new InvalidEntryInputError())
    }

    try {
      const list = await dependencies.application.renameList(
        authentication.user.id,
        listId,
        { name: parsed.data.name }
      )
      await dependencies.revalidate?.()
      return Response.json(toListViewModel(list))
    } catch (error) {
      return jsonErrorResponse(error)
    }
  }

  async function DELETE(
    request: Request,
    context: ListResourceRouteContext
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
      await dependencies.application.deleteList(authentication.user.id, listId)
      await dependencies.revalidate?.()
      return Response.json({ deleted: true })
    } catch (error) {
      return jsonErrorResponse(error)
    }
  }

  return { PATCH, DELETE }
}
