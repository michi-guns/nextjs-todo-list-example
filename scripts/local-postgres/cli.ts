import { config } from "dotenv"

import { EnvironmentProfileError } from "../environment/core"
import { EnvironmentGuardError } from "../environment/guards"
import {
  LocalPostgresError,
  parseLocalPostgresCommand,
  runLocalPostgresCommand,
} from "./core"

config({ path: ".env.local", quiet: true })

try {
  const command = parseLocalPostgresCommand(process.argv.slice(2))
  await runLocalPostgresCommand(command)
} catch (error) {
  if (
    error instanceof LocalPostgresError ||
    error instanceof EnvironmentProfileError ||
    error instanceof EnvironmentGuardError
  ) {
    const code = "code" in error ? error.code : "error"
    console.error(`Local PostgreSQL failed [${code}]: ${error.message}`)
  } else {
    console.error("Local PostgreSQL failed")
  }
  process.exitCode = 1
}
