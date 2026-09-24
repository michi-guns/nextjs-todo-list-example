// Loaded only by instrumentation.ts in the Node.js runtime. It shares the one
// logging composition in db/db.ts; no provider SDK loads for `none`.
import { waitUntil } from "@vercel/functions"
import { logging } from "../../../db/db"
import { diagnosticsAdapters } from "./adapters"
import { createRequestErrorReporter } from "./request-error"
import { startDiagnostics } from "./runtime"

export function startApplicationDiagnostics() {
  return startDiagnostics(logging.diagnostics, diagnosticsAdapters)
}

export const reportRequestError = createRequestErrorReporter(logging, waitUntil)
