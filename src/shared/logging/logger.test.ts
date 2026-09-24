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
      console: { ...defaultLogPolicy.console, moduleLevels: { auth: "debug" } },
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

describe("TST-DIAGNOSTICS-001 facade routing", () => {
  const exporting = {
    ...defaultLogPolicy,
    revision: 1,
    console: { ...defaultLogPolicy.console, minimumLevel: "error" as const },
    diagnostics: {
      ...defaultLogPolicy.diagnostics,
      enabled: true,
      minimumLevel: "info" as const,
      errorReportsEnabled: true,
    },
  }
  function sink(active = true) {
    return {
      active: vi.fn(() => active),
      log: vi.fn(),
      reportError: vi.fn(),
    }
  }

  it("builds lazy metadata once for any accepting destination and skips it when none accepts", () => {
    const policy = createLogPolicy()
    policy.update(exporting)
    const write = vi.fn()
    const diagnostics = sink()
    const log = createLogger({
      environment: "local",
      policy: policy.current,
      write,
      diagnostics,
    })("lists")
    const metadata = vi.fn(() => ({ durationMs: 3, outcome: "completed" }))
    withLogContext("list.read", () =>
      log.emit("info", "list.read.completed", metadata)
    )
    expect(write).not.toHaveBeenCalled()
    expect(diagnostics.log).toHaveBeenCalledExactlyOnceWith(
      "info",
      expect.objectContaining({
        module: "lists",
        event: "list.read.completed",
        durationMs: 3,
        correlationId: expect.any(String),
        operation: "list.read",
      })
    )
    log.emit("error", "list.read.failed", metadata)
    expect(write).toHaveBeenCalledOnce()
    expect(diagnostics.log).toHaveBeenCalledTimes(2)
    expect(metadata).toHaveBeenCalledTimes(2)
    log.emit("debug", "list.read.completed", metadata)
    expect(metadata).toHaveBeenCalledTimes(2)
  })

  it("does not build remote-only metadata without an active startup provider", () => {
    const write = vi.fn()
    const metadata = vi.fn(() => ({}))
    for (const diagnostics of [undefined, sink(false)]) {
      createLogger({
        environment: "local",
        policy: () => exporting,
        write,
        diagnostics,
      })("lists").emit("info", "list.read.completed", metadata)
      if (diagnostics) expect(diagnostics.log).not.toHaveBeenCalled()
    }
    expect(metadata).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
  })

  it("sends explicit reports independently of thresholds and only when policy allows", () => {
    const policy = createLogPolicy()
    policy.update({
      ...exporting,
      diagnostics: { ...exporting.diagnostics, minimumLevel: "fatal" },
    })
    const diagnostics = sink()
    const log = createLogger({
      environment: "production",
      policy: policy.current,
      write: vi.fn(),
      diagnostics,
    })("lists")
    const failure = new Error("private text")
    withLogContext("list.create", () =>
      log.reportError("list.create.failed", failure)
    )
    expect(diagnostics.reportError).toHaveBeenCalledExactlyOnceWith(
      {
        module: "lists",
        event: "list.create.failed",
        environment: "production",
        correlationId: expect.any(String),
        operation: "list.create",
      },
      failure
    )
    policy.update({ ...exporting, revision: 2, disabledModules: ["lists"] })
    log.reportError("list.create.failed", failure)
    log.reportError("bad event\nname", failure)
    expect(diagnostics.reportError).toHaveBeenCalledOnce()
  })

  it("contains diagnostics sink failures without affecting console output or callers", () => {
    const write = vi.fn()
    const diagnostics = {
      active: () => true,
      log: vi.fn(() => {
        throw new Error("sink")
      }),
      reportError: vi.fn(() => {
        throw new Error("sink")
      }),
    }
    const log = createLogger({
      environment: "local",
      policy: () => ({
        ...exporting,
        console: { ...exporting.console, minimumLevel: "info" as const },
      }),
      write,
      diagnostics,
    })("lists")
    expect(() => log.emit("info", "list.read.completed")).not.toThrow()
    expect(() =>
      log.reportError("list.read.failed", new Error("x"))
    ).not.toThrow()
    expect(write).toHaveBeenCalledOnce()
  })
})

describe("TST-DIAGNOSTICS-001 destination failure isolation", () => {
  it("still exports an eligible remote event when the console writer fails", () => {
    const diagnostics = {
      active: () => true,
      log: vi.fn(),
      reportError: vi.fn(),
    }
    const log = createLogger({
      environment: "local",
      policy: () => ({
        ...defaultLogPolicy,
        diagnostics: {
          ...defaultLogPolicy.diagnostics,
          enabled: true,
          minimumLevel: "info" as const,
        },
      }),
      write: () => {
        throw new Error("stdout closed")
      },
      diagnostics,
    })("lists")
    expect(() => log.emit("warn", "list.read.slow")).not.toThrow()
    expect(diagnostics.log).toHaveBeenCalledOnce()
  })
})
