import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

export const sectionName = "[mcp_servers.better_auth]"
export const serverUrl = "https://mcp.better-auth.com/mcp"

export function getConfigPath(
  codexHome = process.env.CODEX_HOME || join(homedir(), ".codex")
): string {
  return join(codexHome, "config.toml")
}

function findSection(lines: string[]): { start: number; end: number } {
  const start = lines.findIndex((line) => line.trim() === sectionName)
  if (start < 0) return { start: -1, end: -1 }

  const end = lines.findIndex(
    (line, index) => index > start && /^\s*\[[^\]]+\]\s*$/.test(line)
  )

  return { start, end: end < 0 ? lines.length : end }
}

export function getBetterAuthStatus(
  configPath: string
): "enabled" | "disabled" | "not-configured" {
  if (!existsSync(configPath)) return "not-configured"

  const lines = readFileSync(configPath, "utf8").split(/\r?\n/)
  const { start, end } = findSection(lines)
  if (start < 0) return "not-configured"

  for (let index = start + 1; index < end; index += 1) {
    const match = lines[index].match(
      /^\s*enabled\s*=\s*(true|false)\s*(?:#.*)?$/
    )
    if (match) return match[1] === "true" ? "enabled" : "disabled"
  }

  return "enabled"
}

export function setBetterAuthEnabled(
  configPath: string,
  enabled: boolean
): void {
  if (!existsSync(configPath))
    throw new Error(`Codex configuration was not found: ${configPath}`)

  const original = readFileSync(configPath, "utf8")
  const lines = original.split(/\r?\n/)
  const { start, end } = findSection(lines)
  const updated = [...lines]

  if (start < 0) {
    while (updated.at(-1) === "") updated.pop()
    updated.push(
      "",
      sectionName,
      `url = \"${serverUrl}\"`,
      `enabled = ${enabled}`,
      ""
    )
  } else {
    const enabledLine = updated.findIndex(
      (line, index) =>
        index > start && index < end && /^\s*enabled\s*=/.test(line)
    )

    if (enabledLine >= 0) updated[enabledLine] = `enabled = ${enabled}`
    else updated.splice(start + 1, 0, `enabled = ${enabled}`)
  }

  const result = updated.join("\n")
  if (result !== original) {
    copyFileSync(configPath, `${configPath}.bak`)
    writeFileSync(configPath, result, "utf8")
  }
}

export function run(
  action: string | undefined,
  configPath = getConfigPath()
): "enabled" | "disabled" | "not-configured" {
  if (!action || !["enable", "disable", "status"].includes(action)) {
    throw new Error("Usage: pnpm better-auth-mcp -- <enable|disable|status>")
  }

  if (action === "status") return getBetterAuthStatus(configPath)

  setBetterAuthEnabled(configPath, action === "enable")
  return action === "enable" ? "enabled" : "disabled"
}
