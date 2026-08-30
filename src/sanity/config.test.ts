import { describe, expect, it } from "vitest"

import { getSanityConfig } from "./config"

describe("getSanityConfig", () => {
  it("returns the configured project, dataset, and API version", () => {
    expect(
      getSanityConfig({
        NEXT_PUBLIC_SANITY_PROJECT_ID: "project-id",
        NEXT_PUBLIC_SANITY_DATASET: "production",
        NEXT_PUBLIC_SANITY_API_VERSION: "2026-08-27",
      })
    ).toEqual({
      projectId: "project-id",
      dataset: "production",
      apiVersion: "2026-08-27",
    })
  })

  it("uses the current repository default API version when none is configured", () => {
    expect(
      getSanityConfig({
        NEXT_PUBLIC_SANITY_PROJECT_ID: "project-id",
        NEXT_PUBLIC_SANITY_DATASET: "production",
      }).apiVersion
    ).toBe("2026-08-27")
  })

  it("rejects a missing project id", () => {
    expect(() =>
      getSanityConfig({ NEXT_PUBLIC_SANITY_DATASET: "production" })
    ).toThrow("Missing NEXT_PUBLIC_SANITY_PROJECT_ID")
  })

  it("rejects a missing dataset", () => {
    expect(() =>
      getSanityConfig({ NEXT_PUBLIC_SANITY_PROJECT_ID: "project-id" })
    ).toThrow("Missing NEXT_PUBLIC_SANITY_DATASET")
  })

  it("rejects values that contain only whitespace", () => {
    expect(() =>
      getSanityConfig({
        NEXT_PUBLIC_SANITY_PROJECT_ID: "  ",
        NEXT_PUBLIC_SANITY_DATASET: "production",
      })
    ).toThrow("Missing NEXT_PUBLIC_SANITY_PROJECT_ID")
  })
})
