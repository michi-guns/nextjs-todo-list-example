import { describe, expect, it } from "vitest"

import {
  createPlaywrightSeedPlan,
  PLAYWRIGHT_USERS,
  PLAYWRIGHT_USER_KEYS,
} from "../../scripts/playwright-local/seed"

describe("Playwright behavior seed plan", () => {
  it("defines one isolated fixture user for every browser scenario", () => {
    const users = PLAYWRIGHT_USER_KEYS.map((key) => PLAYWRIGHT_USERS[key])

    expect(users).toHaveLength(6)
    expect(new Set(users.map((user) => user.email)).size).toBe(users.length)
    expect(new Set(users.map((user) => user.listName)).size).toBe(users.length)
    expect(users.every((user) => user.password === users[0]?.password)).toBe(
      true
    )
  })

  it("creates deterministic fixed-id records for pagination and privacy checks", () => {
    const plan = createPlaywrightSeedPlan()
    const listIds = plan.lists.map((list) => list.id)
    const taskIds = plan.tasks.map((task) => task.id)

    expect(plan.lists).toHaveLength(26)
    expect(plan.tasks).toHaveLength(26)
    expect(new Set(listIds).size).toBe(listIds.length)
    expect(new Set(taskIds).size).toBe(taskIds.length)
    expect(listIds.every((id) => /^[0-9a-f-]{36}$/.test(id))).toBe(true)
    expect(taskIds.every((id) => /^[0-9a-f-]{36}$/.test(id))).toBe(true)

    expect(
      plan.lists.filter((list) => list.userKey === "pagination")
    ).toHaveLength(21)
    expect(
      plan.tasks.filter((task) => task.userKey === "pagination")
    ).toHaveLength(21)
    expect(plan.tasks.some((task) => task.status === "done")).toBe(true)
    expect(plan.tasks.some((task) => task.status === "todo")).toBe(true)
  })

  it("keeps list and task ownership keys aligned", () => {
    const plan = createPlaywrightSeedPlan()
    const listOwners = new Map(
      plan.lists.map((list) => [list.id, list.userKey])
    )

    for (const task of plan.tasks) {
      expect(listOwners.get(task.listId)).toBe(task.userKey)
    }
  })
})
