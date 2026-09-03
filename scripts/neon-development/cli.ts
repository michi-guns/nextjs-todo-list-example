import { config } from "dotenv"

import { EnvironmentProfileError } from "../environment/core"
import { EnvironmentGuardError } from "../environment/guards"
import {
  NeonDevelopmentError,
  parseNeonDevelopmentCommand,
  runNeonDevelopmentCommand,
} from "./core"

config({ path: ".env.local", quiet: true })

try {
  const parsed = parseNeonDevelopmentCommand(process.argv.slice(2))
  await runNeonDevelopmentCommand(parsed)
} catch (error) {
  if (
    error instanceof NeonDevelopmentError ||
    error instanceof EnvironmentProfileError ||
    error instanceof EnvironmentGuardError
  ) {
    const code = "code" in error ? error.code : "error"
    console.error(`Neon Development failed [${code}]: ${error.message}`)
  } else {
    console.error("Neon Development failed")
  }
  process.exitCode = 1
}
