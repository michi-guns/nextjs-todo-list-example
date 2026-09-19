import { afterEach, describe, expect, it, vi } from "vitest"
import { defaultLogPolicy } from "./config"
import { createSettingsCache, SETTINGS_REFRESH_MS } from "./settings-cache"
import { createLogger } from "./logger"

vi.mock("server-only", () => ({}))
afterEach(() => vi.useRealTimers())

describe("TST-LOGGING-002 settings refresh", () => {
  it("reports only failure/recovery transitions and contains diagnostic failure", async () => {
    vi.useFakeTimers()
    const read = vi
      .fn<() => Promise<unknown>>()
      .mockRejectedValue(new Error("private database error"))
    const notify = vi.fn()
    const cache = createSettingsCache({ read }, notify)
    await cache.refresh()
    await vi.advanceTimersByTimeAsync(SETTINGS_REFRESH_MS)
    await cache.refresh()
    expect(notify.mock.calls).toEqual([["failed"]])
    read.mockResolvedValue(defaultLogPolicy)
    notify.mockImplementation(() => {
      throw new Error("output failed")
    })
    await vi.advanceTimersByTimeAsync(SETTINGS_REFRESH_MS)
    await expect(cache.refresh()).resolves.toBeUndefined()
    expect(notify.mock.calls).toEqual([["failed"], ["recovered"]])
    expect(cache.current()).toEqual(defaultLogPolicy)
  })
  it("coalesces boundary reads, updates old loggers and never reads on emission", async () => {
    vi.useFakeTimers()
    let resolve!: (value: unknown) => void
    const read = vi.fn(
      () =>
        new Promise((done) => {
          resolve = done
        })
    )
    const cache = createSettingsCache({ read })
    const write = vi.fn()
    const logger = createLogger({
      environment: "local",
      policy: cache.current,
      write,
    })("auth")
    logger.emit("info", "mail.sent")
    expect(read).not.toHaveBeenCalled()
    const first = cache.refresh()
    const second = cache.refresh()
    expect(read).toHaveBeenCalledTimes(1)
    resolve({ ...defaultLogPolicy, revision: 1, enabled: false })
    await Promise.all([first, second])
    logger.emit("fatal", "mail.failed")
    expect(write).toHaveBeenCalledTimes(1)
    await cache.refresh()
    expect(read).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(SETTINGS_REFRESH_MS)
    const third = cache.refresh()
    resolve({ ...defaultLogPolicy, revision: 2 })
    await third
    logger.emit("info", "mail.sent")
    expect(write).toHaveBeenCalledTimes(2)
  })

  it("retains defaults or last valid off policy on missing, invalid and failed reads", async () => {
    vi.useFakeTimers()
    const read = vi
      .fn<() => Promise<unknown>>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        ...defaultLogPolicy,
        revision: 2,
        enabled: false,
      })
      .mockRejectedValueOnce(new Error("sensitive provider text"))
      .mockResolvedValueOnce({ revision: 3, enabled: true })
      .mockResolvedValueOnce({ ...defaultLogPolicy, revision: 1 })
      .mockResolvedValueOnce({ ...defaultLogPolicy, revision: 3 })
    const cache = createSettingsCache({ read })
    await cache.refresh()
    expect(cache.current()).toEqual(defaultLogPolicy)
    for (let i = 0; i < 4; i++) {
      await vi.advanceTimersByTimeAsync(SETTINGS_REFRESH_MS)
      await cache.refresh()
      expect(cache.current().enabled).toBe(false)
      await cache.refresh()
      expect(read).toHaveBeenCalledTimes(i + 2)
    }
    await vi.advanceTimersByTimeAsync(SETTINGS_REFRESH_MS)
    await cache.refresh()
    expect(cache.current()).toMatchObject({ enabled: true, revision: 3 })
  })

  it("counts retry delay from completion and performs no idle background refresh", async () => {
    vi.useFakeTimers()
    const read = vi.fn(
      () =>
        new Promise((_, reject) => setTimeout(() => reject(new Error()), 1000))
    )
    const cache = createSettingsCache({ read })
    const attempt = cache.refresh()
    await vi.advanceTimersByTimeAsync(1000)
    await attempt
    await vi.advanceTimersByTimeAsync(SETTINGS_REFRESH_MS - 1)
    await cache.refresh()
    expect(read).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(100_000)
    expect(read).toHaveBeenCalledTimes(1)
    const next = cache.refresh()
    await vi.advanceTimersByTimeAsync(1000)
    await next
    expect(read).toHaveBeenCalledTimes(2)
  })
})
