import { describe, expect, it } from "vitest"

import { InvalidTaskPageRequestError } from "../domain/task-errors"
import { decodeTaskCursor, encodeTaskCursor } from "./task-cursor"

const position = {
  userId: "user-a",
  listId: "0198f2c0-3a6b-7000-8000-000000000001",
  includeCompleted: false,
  createdAt: new Date("2026-08-30T13:00:00.000Z"),
  id: "0198f2c0-3a6b-7000-8000-000000000010",
}

describe("task cursors", () => {
  it("round-trips the settled position and filter context", () => {
    const cursor = encodeTaskCursor(position)
    expect(decodeTaskCursor(cursor, "user-a", position.listId, false)).toEqual(
      position
    )
  })

  it("rejects malformed or incompatible task cursors", () => {
    const cursor = encodeTaskCursor(position)
    expect(() =>
      decodeTaskCursor("bad", "user-a", position.listId, false)
    ).toThrow(InvalidTaskPageRequestError)
    expect(() =>
      decodeTaskCursor(cursor, "user-a", position.listId, true)
    ).toThrow(InvalidTaskPageRequestError)
    expect(() =>
      decodeTaskCursor(cursor, "other-user", position.listId, false)
    ).toThrow(InvalidTaskPageRequestError)
  })
})
