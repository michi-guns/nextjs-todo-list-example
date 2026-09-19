import { LoggingSettingsError } from "../../src/shared/logging/settings-store"
import { parseLoggingCommand, runLoggingCommand } from "./core"
import { createLoggingCommandRuntime } from "./runtime"

try {
  const command = parseLoggingCommand(process.argv.slice(2))
  const result = await runLoggingCommand(
    command,
    process.env,
    createLoggingCommandRuntime()
  )
  console.log(JSON.stringify(result))
} catch (error) {
  const code =
    error instanceof LoggingSettingsError ? error.code : "refused_or_failed"
  console.error(
    `Logging settings [${code}]. Check explicit target, protected access and policy revision.`
  )
  process.exitCode = 1
}
