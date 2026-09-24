import { describe, expect, it, vi } from "vitest"
import { createLogPolicy, defaultLogPolicy } from "./config"
import { createLogger } from "./logger"
import {
  createOperationRunner,
  observeOperation,
  reportOperationError,
  wasReported,
  markReported,
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

describe("TST-DIAGNOSTICS-001 failure ownership and completion flush", () => {
  function reporting() {
    const policy = createLogPolicy()
    policy.update({
      ...defaultLogPolicy,
      revision: 1,
      diagnostics: {
        ...defaultLogPolicy.diagnostics,
        enabled: true,
        errorReportsEnabled: true,
      },
    })
    const diagnostics = {
      active: () => true,
      log: vi.fn(),
      reportError: vi.fn(),
    }
    const flush = vi.fn(async () => {})
    const logger = createLogger({
      environment: "preview",
      policy: policy.current,
      write: vi.fn(),
      diagnostics,
    })
    return {
      diagnostics,
      flush,
      ...createOperationRunner({ logger, refresh: async () => {}, flush }),
    }
  }

  it("reports a caught unexpected failure once at its owning boundary and marks it", async () => {
    const f = reporting()
    const failure = new Error("private")
    await expect(
      f.run("landing", "landing.read", () =>
        observeOperation("sanity", "sanity.read", async () => {
          throw failure
        })
      )
    ).rejects.toBe(failure)
    expect(f.diagnostics.reportError).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        module: "sanity",
        event: "sanity.read.failed",
      }),
      failure
    )
    expect(wasReported(failure)).toBe(true)
    expect(f.flush).toHaveBeenCalledOnce()
  })

  it("does not report expected refusals and awaits flush after successful work", async () => {
    const f = reporting()
    const { InvalidEntryInputError } = await import("../entry-contract")
    const refusal = new InvalidEntryInputError()
    await expect(
      f.run("lists", "lists.create", async () => {
        throw refusal
      })
    ).rejects.toBe(refusal)
    expect(f.diagnostics.reportError).not.toHaveBeenCalled()
    expect(wasReported(refusal)).toBe(false)
    await expect(f.run("lists", "lists.read", async () => 7)).resolves.toBe(7)
    expect(f.flush).toHaveBeenCalledTimes(2)
  })

  it.each([
    ["redirect", "NEXT_REDIRECT;replace;/;307;"],
    ["notFound", "NEXT_HTTP_ERROR_FALLBACK;404"],
    ["forbidden", "NEXT_HTTP_ERROR_FALLBACK;403"],
  ])(
    "treats Next %s control flow inside an operation as no failure",
    async (_, digest) => {
      const f = reporting()
      const control = Object.assign(new Error("x"), { digest })
      await expect(
        f.run("items", "items.read", async () => {
          throw control
        })
      ).rejects.toBe(control)
      expect(f.diagnostics.reportError).not.toHaveBeenCalled()
      expect(wasReported(control)).toBe(false)
    }
  )

  it("reports a failure once when operations are nested", async () => {
    const f = reporting()
    const failure = new Error("x")
    await expect(
      f.run("jobs", "jobs.run", () =>
        f.run("lists", "lists.read", async () => {
          throw failure
        })
      )
    ).rejects.toBe(failure)
    expect(f.diagnostics.reportError).toHaveBeenCalledOnce()
    // A reused error object (e.g. a memoized rejection) is a new occurrence
    // in each separate operation.
    await expect(
      f.run("lists", "lists.read", async () => {
        throw failure
      })
    ).rejects.toBe(failure)
    expect(f.diagnostics.reportError).toHaveBeenCalledTimes(2)
  })

  it("keeps results and errors when the completion flush fails", async () => {
    const f = reporting()
    f.flush.mockRejectedValue(new Error("network"))
    await expect(f.run("lists", "lists.read", async () => 7)).resolves.toBe(7)
    const failure = new Error("x")
    await expect(
      f.run("lists", "lists.read", async () => {
        throw failure
      })
    ).rejects.toBe(failure)
  })
})

describe("TST-DIAGNOSTICS-001 process-wide report ownership", () => {
  it("shares reported-error identity across separately bundled module copies", async () => {
    const failure = new Error("x")
    markReported(failure)
    vi.resetModules()
    const copy = await import("./operation")
    expect(copy.wasReported(failure)).toBe(true)
  })
})

describe("TST-LOGGING-001 process-wide request context", () => {
  it("lets a logger from one module copy see context set by another copy", async () => {
    const { withLogContext: setInOriginal } = await import("./context")
    vi.resetModules()
    const copy = await import("./context")
    setInOriginal("lists.read", () => {
      expect(copy.currentLogContext()?.operation).toBe("lists.read")
    })
  })
})
