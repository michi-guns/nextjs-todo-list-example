import { describe, expect, it } from "vitest"

import { mapApplicationError } from "./error-contract"

describe("shared error contracts", () => {
  it("maps known application outcomes to stable statuses and envelopes", () => {
    const cases = [
      ["unauthenticated", 401, "Authentication is required"],
      ["not_found", 404, "Resource not found"],
      ["conflict", 409, "Resource already exists"],
      ["invalid_input", 422, "Input is invalid"],
    ] as const

    for (const [code, status, message] of cases) {
      const error = Object.assign(new Error(message), { code })

      expect(mapApplicationError(error)).toEqual({
        status,
        body: { error: { code, message } },
      })
    }
  })

  it("does not expose unknown error details", () => {
    expect(mapApplicationError(new Error("database credentials"))).toEqual({
      status: 500,
      body: {
        error: {
          code: "internal_error",
          message: "Internal server error",
        },
      },
    })
    expect(
      mapApplicationError({ code: "unexpected", message: "secret" })
    ).toEqual({
      status: 500,
      body: {
        error: {
          code: "internal_error",
          message: "Internal server error",
        },
      },
    })

    expect(
      mapApplicationError(
        Object.assign(new Error("postgresql://user:password@host/db"), {
          code: "invalid_input",
        })
      )
    ).toEqual({
      status: 422,
      body: { error: { code: "invalid_input", message: "Input is invalid" } },
    })
  })
})
