import "server-only"
import { logging } from "../../../db/db"
import { createOperationRunner } from "./operation"

export const { run: runLoggedOperation } = createOperationRunner(logging)

export function loggedHandler<Args extends unknown[], Result>(
  module: string,
  operation: string,
  handler: (...args: Args) => Promise<Result>
) {
  return (...args: Args): Promise<Result> =>
    runLoggedOperation(module, operation, () => handler(...args))
}
