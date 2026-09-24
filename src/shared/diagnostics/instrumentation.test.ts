import { afterEach, describe, expect, it, vi } from "vitest"

const startApplicationDiagnostics = vi.fn(async () => "none")
const reportRequestError = vi.fn(async () => {})
vi.mock("./startup", () => ({
  startApplicationDiagnostics,
  reportRequestError,
}))

const { register, onRequestError } = await import("../../../instrumentation")

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe("TST-DIAGNOSTICS-001 Next instrumentation entry", () => {
  it("starts diagnostics once in the Node runtime and never during build or on edge", async () => {
    vi.stubEnv("NEXT_RUNTIME", "edge")
    await register()
    vi.stubEnv("NEXT_RUNTIME", "nodejs")
    vi.stubEnv("NEXT_PHASE", "phase-production-build")
    await register()
    expect(startApplicationDiagnostics).not.toHaveBeenCalled()
    vi.stubEnv("NEXT_PHASE", "phase-production-server")
    await register()
    expect(startApplicationDiagnostics).toHaveBeenCalledOnce()
  })

  it("forwards only the error and route type, never the raw request", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs")
    const failure = new Error("x")
    await onRequestError(
      failure,
      {
        path: "/dashboard?token=secret",
        method: "GET",
        headers: { cookie: "session=secret" },
      },
      {
        routerKind: "App Router",
        routePath: "/dashboard",
        routeType: "render",
        renderSource: "react-server-components",
        revalidateReason: undefined,
      }
    )
    expect(reportRequestError).toHaveBeenCalledExactlyOnceWith(failure, {
      routeType: "render",
    })
    vi.stubEnv("NEXT_RUNTIME", "edge")
    await onRequestError(
      failure,
      { path: "/", method: "GET", headers: {} },
      {
        routerKind: "App Router",
        routePath: "/",
        routeType: "render",
        renderSource: "react-server-components",
        revalidateReason: undefined,
      }
    )
    expect(reportRequestError).toHaveBeenCalledOnce()
  })
})
