import { describe, expect, it } from "vitest"

import { EnvironmentProfileError } from "../shared/environment/rules"
import {
  EDITORIAL_PREVIEW_FLAG,
  EDITORIAL_PREVIEW_TOKEN,
  parseEditorialPreview,
} from "./preview-config"

const TOKEN = "sk-viewer-token-sentinel-0123456789"
const enabled = {
  [EDITORIAL_PREVIEW_FLAG]: "true",
  [EDITORIAL_PREVIEW_TOKEN]: TOKEN,
  NEXT_PUBLIC_SANITY_DATASET: "production",
}

function refusal(run: () => unknown) {
  let error: unknown
  try {
    run()
  } catch (caught) {
    error = caught
  }
  expect(error).toBeInstanceOf(EnvironmentProfileError)
  expect(JSON.stringify([(error as Error).message, error])).not.toContain(TOKEN)
  return error as EnvironmentProfileError
}

describe("TST-LANDING-004 editorial preview configuration", () => {
  it("is disabled by default and needs no token", () => {
    for (const profile of [
      "local",
      "development",
      "preview",
      "production",
    ] as const)
      expect(
        parseEditorialPreview(profile, {
          NEXT_PUBLIC_SANITY_DATASET: "production",
        })
      ).toEqual({ enabled: false })
    expect(
      parseEditorialPreview("production", { [EDITORIAL_PREVIEW_FLAG]: "false" })
    ).toEqual({ enabled: false })
  })

  it.each(["local", "development", "production"] as const)(
    "enables %s editorial sessions on the production dataset with a Viewer token",
    (profile) => {
      expect(parseEditorialPreview(profile, enabled)).toEqual({
        enabled: true,
        token: TOKEN,
      })
    }
  )

  it("refuses Preview deployments even with a true flag, and refuses a token there", () => {
    expect(
      refusal(() => parseEditorialPreview("preview", enabled)).variable
    ).toBe(EDITORIAL_PREVIEW_FLAG)
    expect(
      refusal(() =>
        parseEditorialPreview("preview", { [EDITORIAL_PREVIEW_TOKEN]: TOKEN })
      ).variable
    ).toBe(EDITORIAL_PREVIEW_TOKEN)
  })

  it("refuses an unprofiled enabled runtime, a wrong dataset, a missing token and an unknown flag", () => {
    expect(
      refusal(() => parseEditorialPreview("unprofiled", enabled)).variable
    ).toBe(EDITORIAL_PREVIEW_FLAG)
    expect(
      refusal(() =>
        parseEditorialPreview("production", {
          ...enabled,
          NEXT_PUBLIC_SANITY_DATASET: "preview",
        })
      ).variable
    ).toBe("NEXT_PUBLIC_SANITY_DATASET")
    expect(
      refusal(() =>
        parseEditorialPreview("development", {
          ...enabled,
          [EDITORIAL_PREVIEW_TOKEN]: " ",
        })
      ).variable
    ).toBe(EDITORIAL_PREVIEW_TOKEN)
    expect(
      refusal(() =>
        parseEditorialPreview("production", {
          ...enabled,
          [EDITORIAL_PREVIEW_FLAG]: "yes",
        })
      ).variable
    ).toBe(EDITORIAL_PREVIEW_FLAG)
  })
})
