import { mapApplicationError, type ErrorEnvelope } from "./error-contract"

export type ActionResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: ErrorEnvelope["error"] }

export class InvalidEntryInputError extends Error {
  readonly code = "invalid_input" as const

  constructor() {
    super("Input is invalid")
    this.name = "InvalidEntryInputError"
  }
}

export function assertSameOriginMutation(
  request: Request,
  options: { readonly jsonBody?: boolean } = {}
): void {
  const origin = request.headers.get("origin")
  let requestOrigin: string

  try {
    requestOrigin = new URL(request.url).origin
  } catch {
    throw new InvalidEntryInputError()
  }

  if (!origin || origin !== requestOrigin) {
    throw new InvalidEntryInputError()
  }

  if (options.jsonBody) {
    const contentType = request.headers.get("content-type")
    const mediaType = contentType?.split(";", 1)[0]?.trim().toLowerCase()
    if (mediaType !== "application/json") {
      throw new InvalidEntryInputError()
    }
  }
}

export function inputFromActionValue(value: unknown): unknown {
  if (typeof FormData !== "undefined" && value instanceof FormData) {
    return Object.fromEntries(value.entries())
  }

  return value
}

export function jsonErrorResponse(error: unknown): Response {
  const mapping = mapApplicationError(error)
  return Response.json(mapping.body, { status: mapping.status })
}

export function actionErrorResult(error: unknown): ActionResult<never> {
  return { ok: false, error: mapApplicationError(error).body.error }
}

export function invalidInputActionResult(): ActionResult<never> {
  return actionErrorResult(new InvalidEntryInputError())
}
