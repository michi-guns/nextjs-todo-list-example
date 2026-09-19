import { describe, expect, it, vi } from "vitest"
vi.mock("server-only", () => ({}))
import { createLogPolicy, defaultLogPolicy } from "./config"
import { currentLogContext, withLogContext } from "./context"
import { createLogger } from "./logger"

describe("TST-LOGGING-001 contextual facade", () => {
  it("filters lazy metadata using the current snapshot even on existing loggers", () => {
    const policy = createLogPolicy()
    const write = vi.fn()
    const log = createLogger({
      environment: "local",
      policy: policy.current,
      write,
    })("auth")
    const metadata = vi.fn(() => ({ durationMs: 5 }))
    log.emit("debug", "mail.sent", metadata)
    expect(metadata).not.toHaveBeenCalled()
    policy.update({
      ...defaultLogPolicy,
      revision: 1,
      moduleLevels: { auth: "debug" },
    })
    log.emit("debug", "mail.sent", metadata)
    expect(write).toHaveBeenCalledWith(
      "debug",
      expect.objectContaining({
        module: "auth",
        event: "mail.sent",
        environment: "local",
        durationMs: 5,
      })
    )
    policy.update({ ...defaultLogPolicy, revision: 2, enabled: false })
    log.emit("fatal", "mail.failed", metadata)
    expect(metadata).toHaveBeenCalledTimes(1)
  })

  it("protects trusted fields from metadata and drops invalid event names", () => {
    const write = vi.fn()
    const log = createLogger({ environment: "production", write })("auth")
    log.emit("info", "mail.sent", {
      level: "fatal",
      severity: "fatal",
      time: 0,
      event: "override",
      module: "override",
      environment: "override",
      correlationId: "client-id",
      operation: "override",
      durationMs: 10,
    })
    expect(write).toHaveBeenCalledWith("info", {
      event: "mail.sent",
      module: "auth",
      environment: "production",
      durationMs: 10,
    })
    log.emit("info", "person@example.com")
    log.emit("info", "event\nforged")
    expect(write).toHaveBeenCalledTimes(1)
  })

  it("refuses an invalid environment and captures valid configuration at creation", () => {
    const write = vi.fn()
    const options = { environment: "production" as const, write }
    const log = createLogger(options)("auth")
    Object.assign(options, { environment: "SENTINEL-secret" })
    log.emit("info", "mail.sent")
    expect(write.mock.calls[0][1].environment).toBe("production")
    createLogger(options)("auth").emit("info", "mail.sent")
    expect(write).toHaveBeenCalledTimes(1)
  })

  it("isolates interleaved requests and restores nested context without trusting caller IDs", async () => {
    const write = vi.fn()
    const log = createLogger({ environment: "local", write })("jobs")
    let resume!: () => void
    const gate = new Promise<void>((resolve) => {
      resume = resolve
    })
    const first = withLogContext("job.first", async () => {
      const context = currentLogContext()!
      expect(Object.isFrozen(context)).toBe(true)
      await gate
      log.emit("info", "job.done")
      return context
    })
    const second = await withLogContext("job.second", async () => {
      await Promise.resolve()
      log.emit("info", "job.done")
      const context = currentLogContext()!
      withLogContext("job.nested", () =>
        expect(currentLogContext()?.correlationId).not.toBe(
          context.correlationId
        )
      )
      expect(currentLogContext()).toBe(context)
      resume()
      return context
    })
    const firstContext = await first
    expect(firstContext.correlationId).not.toBe(second.correlationId)
    expect(firstContext.correlationId).toMatch(/^[0-9a-f-]{36}$/)
    expect(write.mock.calls.map(([, record]) => record.correlationId)).toEqual([
      second.correlationId,
      firstContext.correlationId,
    ])
    expect(currentLogContext()).toBeUndefined()
    log.emit("info", "process.done")
    expect(write.mock.lastCall?.[1]).not.toHaveProperty("correlationId")
  })

  it("contains metadata/policy/writer failures without replacing business results or errors", () => {
    const failure = new Error("original business error")
    const write = vi.fn(() => {
      throw new Error("writer failure")
    })
    const log = createLogger({ environment: "local", write })("jobs")
    expect(() =>
      log.emit("error", "job.failed", () => {
        throw failure
      })
    ).not.toThrow()
    expect(() =>
      log.emit("error", "job.failed", { error: failure })
    ).not.toThrow()
    expect(
      withLogContext("job.run", () => {
        log.emit("info", "job.done")
        return 42
      })
    ).toBe(42)
    expect(() => {
      try {
        throw failure
      } catch (error) {
        log.emit("error", "job.failed", { error })
        throw error
      }
    }).toThrow(failure)
    const broken = createLogger({
      environment: "local",
      write,
      policy: () => {
        throw failure
      },
    })("jobs")
    expect(() => broken.emit("error", "job.failed")).not.toThrow()
  })
})
