import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, it } from "node:test"
import { getBetterAuthStatus, setBetterAuthEnabled } from "./core"

describe("Better Auth MCP toggle", () => {
  it("reads the current state, toggles it, and verifies the new state", () => {
    const directory = mkdtempSync(join(tmpdir(), "better-auth-mcp-"))
    const configPath = join(directory, "config.toml")
    writeFileSync(
      configPath,
      `[mcp_servers.better_auth]\nurl = "https://mcp.better-auth.com/mcp"\nenabled = true\n`
    )

    const before = getBetterAuthStatus(configPath)
    setBetterAuthEnabled(configPath, before !== "enabled")
    const after = getBetterAuthStatus(configPath)

    assert.equal(before, "enabled")
    assert.equal(after, "disabled")
    assert.match(readFileSync(configPath, "utf8"), /enabled = false/)
  })
})
