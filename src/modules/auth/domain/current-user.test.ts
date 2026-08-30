import { describe, expect, it } from "vitest"

import { toCurrentUser } from "./current-user"

describe("toCurrentUser", () => {
  it("projects only the app-facing identity fields", () => {
    const currentUser = toCurrentUser({
      id: "user-123",
      email: "person@example.test",
      name: undefined,
    })

    expect(currentUser).toEqual({
      id: "user-123",
      email: "person@example.test",
      name: null,
    })
    expect(currentUser).not.toHaveProperty("password")
    expect(currentUser).not.toHaveProperty("session")
  })
})
