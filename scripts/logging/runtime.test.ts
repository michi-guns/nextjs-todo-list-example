import { spawnSync } from "node:child_process"
import { describe, expect, it, vi } from "vitest"
import { parseLoggingCommand } from "./core"
import { createLoggingCommandRuntime } from "./runtime"

const command = parseLoggingCommand([
  "inspect",
  "--environment",
  "development",
  "--project",
  "project-id",
  "--branch",
  "development",
  "--database",
  "todo",
])
describe("logging operator runtime", () => {
  it("resolves branch and direct host through the provider without returning credentials", async () => {
    const run = vi
      .fn()
      .mockResolvedValueOnce(
        JSON.stringify({
          id: "br-dev",
          name: "development",
          project_id: "project-id",
          default: false,
        })
      )
      .mockResolvedValueOnce(
        "postgresql://role:private-password@ep-dev.neon.tech/todo?sslmode=verify-full"
      )
    const result = await createLoggingCommandRuntime(run).observe(command)
    expect(result).toMatchObject({
      provider: "neon",
      projectId: "project-id",
      branch: "development",
      host: "ep-dev.neon.tech",
      database: "todo",
      port: 5432,
    })
    expect(JSON.stringify(result)).not.toContain("private-password")
  })
  it.each([
    { id: "br-dev", name: "development", project_id: "wrong", default: false },
    { id: "br-dev", name: "wrong", project_id: "project-id", default: false },
    {
      id: "br-dev",
      name: "development",
      project_id: "project-id",
      default: true,
    },
  ])(
    "refuses mismatched and default hosted branches before reading credentials",
    async (branch) => {
      const run = vi.fn().mockResolvedValue(JSON.stringify(branch))
      await expect(
        createLoggingCommandRuntime(run).observe(command)
      ).rejects.toThrow()
      expect(run).toHaveBeenCalledTimes(1)
    }
  )
  it.each([
    "postgresql://role:secret@ep-dev-pooler.neon.tech/todo",
    "postgresql://role:secret@ep-dev.neon.tech/other",
  ])("refuses pooled or wrong database provider endpoints", async (url) => {
    const run = vi
      .fn()
      .mockResolvedValueOnce(
        JSON.stringify({
          id: "br-dev",
          name: "development",
          project_id: "project-id",
          default: false,
        })
      )
      .mockResolvedValueOnce(url)
    await expect(
      createLoggingCommandRuntime(run).observe(command)
    ).rejects.toThrow()
  })
  it("refuses Production outside the protected main job", async () => {
    await expect(
      createLoggingCommandRuntime().verifyProduction({
        RELEASE_COMMIT_SHA: "a".repeat(40),
        RELEASE_APPROVED_SHA: "a".repeat(40),
      })
    ).rejects.toThrow("Protected Production approval required")
  })
  it("prints only a safe diagnostic on stderr for real CLI refusal", () => {
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "scripts/logging/cli.ts",
        "inspect",
        "--api-key",
        "private-argument-token",
      ],
      {
        encoding: "utf8",
        timeout: 15_000,
        env: {
          ...process.env,
          DATABASE_URL:
            "postgresql://user:private-env-password@remote.test/todo",
        },
      }
    )
    expect(result.status).toBe(1)
    expect(result.stdout).toBe("")
    expect(result.stderr).toContain("refused_or_failed")
    expect(result.stderr).not.toMatch(/private-|postgresql|remote.test/)
  })
})
