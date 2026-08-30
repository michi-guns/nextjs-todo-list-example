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
