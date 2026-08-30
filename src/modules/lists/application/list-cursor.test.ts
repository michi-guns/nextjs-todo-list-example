import { describe, expect, it } from "vitest"

import { InvalidPageRequestError } from "../domain/list-errors"
import { decodeListCursor, encodeListCursor } from "./list-cursor"

const position = {
  userId: "user-a",
  createdAt: new Date("2026-08-30T12:00:00.123Z"),
  id: "0198f2c0-3a6b-7000-8000-000000000001",
}

describe("list cursors", () => {
  it("round-trips a list position without exposing a readable payload", () => {
    const cursor = encodeListCursor(position)

    expect(cursor).not.toContain(position.userId)
    expect(cursor).not.toContain(position.id)
    expect(decodeListCursor(cursor, position.userId)).toEqual(position)
  })

  it("rejects malformed and cross-context cursors", () => {
    expect(() => decodeListCursor("not-a-cursor", position.userId)).toThrow(
      InvalidPageRequestError
    )

    const cursor = encodeListCursor(position)
    expect(() => decodeListCursor(cursor, "user-b")).toThrow(
      InvalidPageRequestError
    )
  })

  it("rejects invalid cursor positions before they reach a query", () => {
    const encoded = Buffer.from(
      JSON.stringify({
        version: 1,
        scope: "lists:user-a",
        createdAt: "not-a-date",
        id: position.id,
      }),
      "utf8"
    ).toString("base64url")

    expect(() => decodeListCursor(encoded, position.userId)).toThrow(
      InvalidPageRequestError
    )
  })
})
