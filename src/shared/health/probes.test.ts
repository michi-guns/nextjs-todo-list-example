import { describe, expect, it, vi } from "vitest"

import { probeCms, singleFlight, type ProbeResult } from "./probes"

describe("TST-RUNTIME-001 bounded probes", () => {
  it("reports fresh valid published CMS content as available", async () => {
    const fetchPublished = vi.fn(async () => ({ valid: true }))
    await expect(
      probeCms(fetchPublished, (document) => document, { deadlineMs: 100 })
    ).resolves.toEqual({ status: "ok" })
    expect(fetchPublished).toHaveBeenCalledWith(expect.any(AbortSignal))
  })

  it("aborts the CMS request at the deadline instead of abandoning it", async () => {
    let signal: AbortSignal | undefined
    const result = await probeCms(
      (abort) => {
        signal = abort
        return new Promise((_, reject) =>
          abort.addEventListener("abort", () => reject(abort.reason))
        )
      },
      (document) => document,
      { deadlineMs: 20 }
    )
    expect(result).toEqual({ status: "unavailable", code: "timeout" })
    expect(signal?.aborted).toBe(true)
  })

  it("distinguishes an unreachable CMS from invalid published content", async () => {
    await expect(
      probeCms(
        async () => {
          throw new Error("getaddrinfo ENOTFOUND api.sanity.io secret-token")
        },
        (document) => document,
        { deadlineMs: 100 }
      )
    ).resolves.toEqual({ status: "unavailable", code: "unreachable" })
    await expect(
      probeCms(
        async () => ({}),
        () => {
          throw new Error("Invalid Sanity landingPage payload")
        },
        { deadlineMs: 100 }
      )
    ).resolves.toEqual({ status: "unavailable", code: "invalid_content" })
  })

  it("shares one in-flight probe per component instead of queueing work", async () => {
    let resolve!: (value: ProbeResult) => void
    const work = vi.fn(
      () => new Promise<ProbeResult>((done) => (resolve = done))
    )
    const probe = singleFlight(work)
    const first = probe()
    const second = probe()
    expect(work).toHaveBeenCalledOnce()
    resolve({ status: "ok" })
    await expect(Promise.all([first, second])).resolves.toEqual([
      { status: "ok" },
      { status: "ok" },
    ])
    const next = probe()
    expect(work).toHaveBeenCalledTimes(2)
    resolve({ status: "ok" })
    await next
  })
})
