import { describe, expect, it, vi } from "vitest"
import { createLogPolicy, defaultLogPolicy } from "./config"
import { createLogger } from "./logger"
import {
  createOperationRunner,
  observeOperation,
  reportOperationError,
} from "./operation"

vi.mock("server-only", () => ({}))

function fixture() {
  const policy = createLogPolicy()
  const write = vi.fn()
  const refresh = vi.fn(async () => {})
  const logger = createLogger({
    environment: "preview",
    policy: policy.current,
    write,
  })
  return {
    policy,
    write,
    refresh,
    ...createOperationRunner({ logger, refresh }),
  }
}

describe("adopted backend operations", () => {
  it("does not re-report a suppressed provider error at the outer owner", async () => {
    const f = fixture()
    f.policy.update({
      ...defaultLogPolicy,
      revision: 1,
      suppressedEvents: ["sanity.read.failed"],
    })
    const failure = new Error("private")
    await expect(
      f.run("landing", "landing.read", () =>
        observeOperation("sanity", "sanity.read", async () => {
          throw failure
        })
      )
    ).rejects.toBe(failure)
    expect(f.write).not.toHaveBeenCalled()
  })
  it("reports a provider failure once when an entry maps the same error", async () => {
    const f = fixture()
    const failure = Object.assign(new Error("token=private@example.test"), {
      code: "ECONNREFUSED",
    })
    const result = await f.run("tasks", "tasks.create", async () => {
      try {
        await observeOperation("auth.mail", "auth.mail.delivery", async () => {
          throw failure
        })
      } catch (error) {
        reportOperationError(error)
        return "generic failure"
      }
    })
    expect(result).toBe("generic failure")
    expect(f.refresh).toHaveBeenCalledOnce()
    expect(f.write).toHaveBeenCalledTimes(1)
    expect(f.write.mock.calls[0]).toEqual([
      "error",
      expect.objectContaining({
        module: "auth.mail",
        event: "auth.mail.delivery.failed",
        operation: "tasks.create",
        outcome: "failed",
        error: { kind: "unavailable", code: "ECONNREFUSED" },
      }),
    ])
    expect(JSON.stringify(f.write.mock.calls)).not.toContain(
      "private@example.test"
    )
  })

  it("keeps concurrent requests isolated and refreshes even after global off", async () => {
    const f = fixture()
    const work = () =>
      f.run("lists", "lists.read", async () => {
        await Promise.resolve()
        reportOperationError(new Error("private"))
      })
    await Promise.all([work(), work()])
    const ids = f.write.mock.calls.map(([, record]) => record.correlationId)
    expect(new Set(ids).size).toBe(2)
    f.refresh.mockImplementation(async () => {
      f.policy.update({ ...defaultLogPolicy, revision: 1, enabled: false })
    })
    await work()
    expect(f.write).toHaveBeenCalledTimes(2)
    expect(f.refresh).toHaveBeenCalledTimes(3)
  })

  it("preserves expected refusals and thrown errors when refresh/output fail", async () => {
    const f = fixture()
    f.refresh.mockRejectedValue(new Error("refresh failed"))
    const refused = Object.assign(new Error("private"), {
      code: "unauthenticated",
    })
    await expect(
      f.run("lists", "lists.read", async () => {
        throw refused
      })
    ).rejects.toBe(refused)
    expect(f.write).not.toHaveBeenCalled()
    f.write.mockImplementation(() => {
      throw new Error("destination failed")
    })
    const failure = new Error("business failure")
    await expect(
      f.run("lists", "lists.read", async () => {
        throw failure
      })
    ).rejects.toBe(failure)
  })
})
