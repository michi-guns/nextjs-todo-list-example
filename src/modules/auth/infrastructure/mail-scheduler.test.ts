import { afterEach, describe, expect, it } from "vitest"

import {
  createDrainableScheduler,
  currentAuthMailScheduler,
  nextAfterScheduler,
  selectAuthMailScheduler,
  selectStandaloneAuthMail,
} from "./mail-scheduler"

afterEach(() => selectAuthMailScheduler(undefined))

describe("TST-AUTH-004 auth mail scheduler", () => {
  it("defaults to Next's post-response lifetime", () => {
    expect(currentAuthMailScheduler()).toBe(nextAfterScheduler)
  })

  it("lets a standalone caller select an explicit, drainable scheduler process-wide", async () => {
    const standalone = selectStandaloneAuthMail()
    expect(currentAuthMailScheduler()).toBe(standalone)
    let finished = false
    standalone.schedule(async () => {
      await new Promise((done) => setTimeout(done, 20))
      finished = true
    })
    expect(finished).toBe(false)
    await standalone.drain()
    expect(finished).toBe(true)
  })

  it("drains work scheduled while draining and reports a failed task", async () => {
    const scheduler = createDrainableScheduler()
    const order: string[] = []
    scheduler.schedule(async () => {
      order.push("first")
      scheduler.schedule(async () => {
        order.push("nested")
      })
    })
    await scheduler.drain()
    expect(order).toEqual(["first", "nested"])
    scheduler.schedule(async () => {
      throw new Error("delivery failed")
    })
    await expect(scheduler.drain()).rejects.toThrow("delivery failed")
    await expect(scheduler.drain()).resolves.toBeUndefined()
  })
})
