import { describe, expect, it, vi } from "vitest"

import {
  HEALTH_SECRET_HEADER,
  createHealthHandler,
  resolveHealthAccess,
  resolveRelease,
  type HealthAccess,
} from "./handler"
import type { ProbeResult } from "./probes"

const SHA = "0123456789abcdef0123456789abcdef01234567"
const SECRET = "monitor-secret-sentinel-0123456789abcdef"

function setup(
  access: HealthAccess,
  results: Partial<Record<"database" | "cms", ProbeResult>> = {}
) {
  const probes = {
    database: vi.fn(async () => results.database ?? { status: "ok" as const }),
    cms: vi.fn(async () => results.cms ?? { status: "ok" as const }),
  }
  const onUnavailable = vi.fn()
  const GET = createHealthHandler({
    probes,
    release: SHA,
    access,
    onUnavailable,
  })
  const call = async (component: string, headers: HeadersInit = {}) => {
    const response = await GET(
      new Request(`http://127.0.0.1/api/health/${component}`, { headers }),
      { params: Promise.resolve({ component }) }
    )
    return {
      status: response.status,
      body: await response.json(),
      cache: response.headers.get("cache-control"),
    }
  }
  return { probes, onUnavailable, call }
}

describe("TST-RUNTIME-001 health endpoints", () => {
  it("answers liveness publicly without touching dependencies", async () => {
    const f = setup({ mode: "unconfigured" })
    await expect(f.call("app")).resolves.toEqual({
      status: 200,
      body: { component: "app", status: "ok", release: SHA },
      cache: "no-store",
    })
    expect(f.probes.database).not.toHaveBeenCalled()
  })

  it("keeps CMS-only degradation distinct from database readiness", async () => {
    const f = setup(
      { mode: "open" },
      { cms: { status: "unavailable", code: "timeout" } }
    )
    await expect(f.call("database")).resolves.toMatchObject({
      status: 200,
      body: { component: "database", status: "ok" },
    })
    await expect(f.call("cms")).resolves.toEqual({
      status: 503,
      body: {
        component: "cms",
        status: "unavailable",
        code: "timeout",
        release: SHA,
      },
      cache: "no-store",
    })
    expect(f.onUnavailable).toHaveBeenCalledExactlyOnceWith("cms", "timeout")
  })

  it("requires the monitor secret header for protected dependency probes", async () => {
    const f = setup({ mode: "protected", secret: SECRET })
    await expect(f.call("database")).resolves.toMatchObject({
      status: 401,
      body: { status: "refused", code: "unauthorized" },
    })
    await expect(
      f.call("database", { [HEALTH_SECRET_HEADER]: `${SECRET}x` })
    ).resolves.toMatchObject({ status: 401 })
    expect(f.probes.database).not.toHaveBeenCalled()
    await expect(
      f.call("database", { [HEALTH_SECRET_HEADER]: SECRET })
    ).resolves.toMatchObject({ status: 200 })
  })

  it("never reports readiness when remote monitor setup is missing", async () => {
    const f = setup({ mode: "unconfigured" })
    await expect(
      f.call("cms", { [HEALTH_SECRET_HEADER]: SECRET })
    ).resolves.toMatchObject({
      status: 503,
      body: { status: "unavailable", code: "monitor_unconfigured" },
    })
    expect(f.probes.cms).not.toHaveBeenCalled()
  })

  it("refuses unknown components without echoing the input", async () => {
    const f = setup({ mode: "open" })
    const result = await f.call("secret-path-sentinel")
    expect(result).toMatchObject({ status: 404 })
    expect(JSON.stringify(result.body)).not.toContain("sentinel")
  })
})

describe("TST-RUNTIME-001 health configuration", () => {
  it("protects dependency probes in remote profiles and opens them locally", () => {
    expect(resolveHealthAccess({ APP_ENV: "production" })).toEqual({
      mode: "unconfigured",
    })
    expect(resolveHealthAccess({ VERCEL: "1" }).mode).toBe("unconfigured")
    expect(resolveHealthAccess({ APP_ENV: "local" })).toEqual({ mode: "open" })
    expect(
      resolveHealthAccess({ APP_ENV: "preview", HEALTH_PROBE_SECRET: SECRET })
    ).toEqual({ mode: "protected", secret: SECRET })
    // A weak secret is treated as missing configuration, not as protection.
    expect(
      resolveHealthAccess({ APP_ENV: "preview", HEALTH_PROBE_SECRET: "short" })
    ).toEqual({ mode: "unconfigured" })
  })

  it("reports the supplied release or an explicit unknown/unreleased identity", () => {
    expect(resolveRelease({ APP_RELEASE_SHA: SHA.toUpperCase() })).toBe(SHA)
    expect(resolveRelease({ VERCEL_GIT_COMMIT_SHA: SHA })).toBe(SHA)
    expect(
      resolveRelease({ APP_ENV: "production", APP_RELEASE_SHA: "v1" })
    ).toBe("unknown")
    expect(resolveRelease({})).toBe("unreleased")
  })
})
