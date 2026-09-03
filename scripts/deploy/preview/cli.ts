import { config } from "dotenv"

import { EnvironmentProfileError } from "../../environment/core"
import { EnvironmentGuardError } from "../../environment/guards"
import {
  PreviewDeliveryError,
  parsePreviewCommand,
  runPreviewCommand,
} from "./core"

config({ path: ".env.local", quiet: true })

try {
  const parsed = parsePreviewCommand(process.argv.slice(2))
  await runPreviewCommand(parsed)
} catch (error) {
  if (
    error instanceof PreviewDeliveryError ||
    error instanceof EnvironmentProfileError ||
    error instanceof EnvironmentGuardError
  ) {
    const code = "code" in error ? error.code : "error"
    console.error(`Preview delivery failed [${code}]: ${error.message}`)
  } else {
    console.error("Preview delivery failed")
  }
  process.exitCode = 1
}
