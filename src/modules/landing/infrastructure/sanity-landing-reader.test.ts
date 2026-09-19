import { afterEach, describe, expect, it, vi } from "vitest"
import landingFixture from "@/sanity/fixtures/landingPage.json"
import { createLogger } from "../../../shared/logging/logger"
import { defaultLogPolicy } from "../../../shared/logging/config"
import { createOperationRunner } from "../../../shared/logging/operation"

import { getPublishedLandingContent } from "./sanity-landing-reader"

const { fetchPublished } = vi.hoisted(() => ({ fetchPublished: vi.fn() }))
vi.mock("../../../sanity/client", () => ({
  sanityClient: { fetch: fetchPublished },
}))
afterEach(() => fetchPublished.mockReset())

describe("getPublishedLandingContent", () => {
  it("observes validated published reads and reports provider failure once without payloads", async () => {
    const write = vi.fn()
    const logging = createOperationRunner({
      logger: createLogger({
        environment: "preview",
        policy: () => ({ ...defaultLogPolicy, minimumLevel: "debug" }),
        write,
      }),
      refresh: async () => {},
    })
    fetchPublished.mockResolvedValue(landingFixture)
    const read = () =>
      logging.run("landing", "landing.read", () =>
        getPublishedLandingContent({ NODE_ENV: "production" })
      )
    expect(await read()).toMatchObject({ headline: landingFixture.headline })
    expect(write).toHaveBeenCalledWith(
      "debug",
      expect.objectContaining({ event: "sanity.read.completed" })
    )
    const failure = new Error("private CMS body")
    fetchPublished.mockRejectedValue(failure)
    await expect(read()).rejects.toBe(failure)
    expect(
      write.mock.calls.filter(([level]) => level === "error")
    ).toHaveLength(1)
    expect(JSON.stringify(write.mock.calls)).not.toContain("private CMS")
    expect(JSON.stringify(write.mock.calls)).not.toContain(
      landingFixture.headline
    )
  })
  it("uses deterministic local content for the Playwright runtime", async () => {
    await expect(
      getPublishedLandingContent({
        NODE_ENV: "development",
        PLAYWRIGHT_E2E: "true",
      })
    ).resolves.toEqual({
      headline: "Make progress visible.",
      blurb: "Keep personal tasks clear, focused, and moving forward.",
      primaryCtaLabel: "Get started",
      secondaryCtaLabel: "Sign in",
    })
  })

  it("never uses the local fixture in production", async () => {
    await expect(
      getPublishedLandingContent({
        NODE_ENV: "production",
        PLAYWRIGHT_E2E: "true",
      })
    ).rejects.toThrow()
  })
})
