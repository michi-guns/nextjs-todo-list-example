const applicationErrorCodes = [
  "unauthenticated",
  "not_found",
  "conflict",
  "invalid_input",
] as const

export type ApplicationErrorCode = (typeof applicationErrorCodes)[number]
export type ErrorResponseCode = ApplicationErrorCode | "internal_error"

export interface ErrorEnvelope {
  readonly error: {
    readonly code: ErrorResponseCode
    readonly message: string
  }
}

export interface ErrorMapping {
  readonly status: 401 | 404 | 409 | 422 | 500
  readonly body: ErrorEnvelope
}

const statusByCode: Record<ApplicationErrorCode, 401 | 404 | 409 | 422> = {
  unauthenticated: 401,
  not_found: 404,
  conflict: 409,
  invalid_input: 422,
}

const fallbackMessageByCode: Record<ApplicationErrorCode, string> = {
  unauthenticated: "Authentication is required",
  not_found: "Resource not found",
  conflict: "Resource already exists",
  invalid_input: "Input is invalid",
}

function getApplicationErrorCode(
  error: unknown
): ApplicationErrorCode | undefined {
  if (!(error instanceof Error)) {
    return undefined
  }

  const code = (error as { code?: unknown }).code
  return typeof code === "string" &&
    (applicationErrorCodes as readonly string[]).includes(code)
    ? (code as ApplicationErrorCode)
    : undefined
}

function internalError(): ErrorMapping {
  return {
    status: 500,
    body: {
      error: {
        code: "internal_error",
        message: "Internal server error",
      },
    },
  }
}

export function mapApplicationError(error: unknown): ErrorMapping {
  const code = getApplicationErrorCode(error)
  if (!code) {
    return internalError()
  }

  return {
    status: statusByCode[code],
    body: { error: { code, message: fallbackMessageByCode[code] } },
  }
}
