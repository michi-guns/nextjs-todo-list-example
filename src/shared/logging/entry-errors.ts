import "server-only"
import {
  actionErrorResult,
  InvalidEntryInputError,
  jsonErrorResponse,
} from "../entry-contract"
import { reportOperationError } from "./operation"

export function loggedJsonErrorResponse(error: unknown): Response {
  reportOperationError(error)
  return jsonErrorResponse(error)
}

export function loggedActionErrorResult(error: unknown) {
  reportOperationError(error)
  return actionErrorResult(error)
}

export function loggedInvalidInputActionResult() {
  return loggedActionErrorResult(new InvalidEntryInputError())
}
