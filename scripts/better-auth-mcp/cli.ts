// Better Auth MCP CLI
//
// Usage from the project root:
//   pnpm better-auth-mcp -- status
//   pnpm better-auth-mcp -- enable
//   pnpm better-auth-mcp -- disable
//
// This changes only [mcp_servers.better_auth] in
// %USERPROFILE%\\.codex\\config.toml (or $CODEX_HOME/config.toml).

import { getConfigPath, run } from "./core"

const action = process.argv[2]
const configPath = getConfigPath()

try {
  console.log(`Better Auth MCP: ${run(action, configPath)}`)
  console.log(`Config: ${configPath}`)
  if (action !== "status") console.log(`Backup: ${configPath}.bak`)
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
