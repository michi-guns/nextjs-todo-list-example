import { spawnSync } from "node:child_process"
import { describe, expect, it } from "vitest"

function invoke(args: string[], overrides: Partial<NodeJS.ProcessEnv> = {}) {
  return spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/deploy/production/cli.ts", ...args],
    {
      env: {
        ...process.env,
        GITHUB_ACTIONS: "false",
        GITHUB_REF: "refs/heads/other",
        ...overrides,
      },
      encoding: "utf8",
      timeout: 10_000,
    }
  )
}
describe("Production command entry", () => {
  it.each([
    ["unknown"],
    ["resolve"],
    ["resolve", "--ref", "main"],
    ["resolve", "--ref", "bad;secret"],
    ["release"],
  ])(
    "refuses invalid input or unprotected execution without disclosing values: %j",
    (...args) => {
      const result = invoke(args, { VERCEL_TOKEN: "private-value" })
      expect(result.status).toBe(1)
      expect(result.stdout).toBe("")
      expect(result.stderr.trim()).toBe(
        "Production release command refused or failed; inspect the safe release record when available"
      )
      expect(result.stderr).not.toContain("private-value")
    }
  )
  it("refuses release from a branch even inside Actions", () => {
    expect(invoke(["release"], { GITHUB_ACTIONS: "true" }).status).toBe(1)
  })
})
