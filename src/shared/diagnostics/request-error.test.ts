import { describe, expect, it, vi } from "vitest"
import { createLogPolicy, defaultLogPolicy } from "../logging/config"
import { currentLogContext, withLogContext } from "../logging/context"
import { createLogger } from "../logging/logger"
import {
  reportOperationError,
  createOperationRunner,
} from "../logging/operation"
import { createRequestErrorReporter } from "./request-error"

vi.mock("server-only", () => ({}))

function setup() {
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
  const write = vi.fn()
  const diagnostics = { active: () => true, log: vi.fn(), reportError: vi.fn() }
  const flush = vi.fn(async () => {})
  const waitUntil = vi.fn()
  const logger = createLogger({
    environment: "production",
    policy: policy.current,
    write,
    diagnostics,
  })
  return {
    write,
    diagnostics,
    flush,
    waitUntil,
    logger,
    report: createRequestErrorReporter({ logger, flush }, waitUntil),
  }
}

describe("TST-DIAGNOSTICS-001 Next onRequestError ownership", () => {
  it.each(["render", "route", "action", "proxy"])(
    "owns an unreported %s failure: one safe log, one report and an awaited flush",
    async (routeType) => {
      const f = setup()
      const failure = new Error("person@example.com")
      await f.report(failure, { routeType })
      const event = `next.${routeType}.failed`
      expect(f.write).toHaveBeenCalledExactlyOnceWith(
        "error",
        expect.objectContaining({
          module: "next",
          event,
          outcome: "failed",
          error: { kind: "unexpected" },
          correlationId: expect.any(String),
        })
      )
      expect(f.diagnostics.reportError).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ module: "next", event }),
        failure
      )
      expect(f.flush).toHaveBeenCalledOnce()
      // Next drops the hook's promise on render/action paths; the platform
      // keeps the bounded flush alive past the response.
      expect(f.waitUntil).toHaveBeenCalledExactlyOnceWith(
        f.flush.mock.results[0].value
      )
      expect(JSON.stringify(f.write.mock.calls)).not.toContain("person@")
      // Next may call the hook again for the same object (e.g. HTML and RSC).
      await f.report(failure, { routeType })
      expect(f.diagnostics.reportError).toHaveBeenCalledOnce()
    }
  )

  it("skips a failure its application boundary already reported, even after Next adds a digest", async () => {
    const f = setup()
    const runner = createOperationRunner({
      logger: f.logger,
      refresh: async () => {},
      flush: f.flush,
    })
    const failure = new Error("x")
    await expect(
      runner.run("dashboard", "dashboard.read", async () => {
        throw failure
      })
    ).rejects.toBe(failure)
    expect(f.diagnostics.reportError).toHaveBeenCalledOnce()
    Object.assign(failure, { digest: "2718281828" })
    await f.report(failure, { routeType: "render" })
    expect(f.diagnostics.reportError).toHaveBeenCalledOnce()
  })

  it.each([
    ["redirect", { digest: "NEXT_REDIRECT;replace;/sign-in;307;" }],
    ["notFound", { digest: "NEXT_HTTP_ERROR_FALLBACK;404" }],
    ["dynamic usage", { digest: "DYNAMIC_SERVER_USAGE" }],
    ["client bailout", { digest: "BAILOUT_TO_CLIENT_SIDE_RENDERING" }],
  ])("ignores %s control flow", async (_, fields) => {
    const f = setup()
    await f.report(Object.assign(new Error("x"), fields), {
      routeType: "render",
    })
    expect(f.write).not.toHaveBeenCalled()
    expect(f.diagnostics.reportError).not.toHaveBeenCalled()
  })

  it("ignores expected application refusals that escaped to Next", async () => {
    const f = setup()
    const { InvalidEntryInputError } = await import("../entry-contract")
    await f.report(new InvalidEntryInputError(), { routeType: "action" })
    expect(f.diagnostics.reportError).not.toHaveBeenCalled()
  })

  it("keeps an active request correlation and never throws into Next", async () => {
    const f = setup()
    let correlation: string | undefined
    await withLogContext("landing.read", async () => {
      correlation = currentLogContext()?.correlationId
      await f.report(new Error("x"), { routeType: "render" })
    })
    expect(f.write.mock.calls[0][1].correlationId).toBe(correlation)
    f.flush.mockRejectedValue(new Error("network"))
    f.waitUntil.mockImplementation(() => {
      throw new Error("no request context")
    })
    await expect(
      f.report(new Error("y"), { routeType: "unknown-kind" })
    ).resolves.toBeUndefined()
    expect(f.write.mock.calls[1][1].event).toBe("next.request.failed")
  })

  it("does not double-report when a swallowed boundary report precedes the hook", async () => {
    const f = setup()
    const runner = createOperationRunner({
      logger: f.logger,
      refresh: async () => {},
      flush: f.flush,
    })
    const failure = new Error("x")
    await runner.run("sanity", "sanity.webhook", async () => {
      reportOperationError(failure)
      return new Response(null, { status: 500 })
    })
    await f.report(failure, { routeType: "route" })
    expect(f.diagnostics.reportError).toHaveBeenCalledOnce()
  })
})
