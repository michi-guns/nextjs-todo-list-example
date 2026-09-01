import { config } from "dotenv"

import {
  EnvironmentProfileError,
  inspectEnvironment,
  parseEnvironmentProfile,
} from "./core"

config({ path: ".env.local", quiet: true })

const [command, ...unexpectedArguments] = process.argv.slice(2)

if (command !== "inspect" || unexpectedArguments.length > 0) {
  console.error("Usage: pnpm environment:inspect")
  process.exitCode = 2
} else {
  try {
    const profile = parseEnvironmentProfile()
    console.log(JSON.stringify(inspectEnvironment(profile), null, 2))
  } catch (error) {
    if (error instanceof EnvironmentProfileError) {
      const variable = error.variable ? ` (${error.variable})` : ""
      console.error(
        `Environment inspection failed [${error.code}]${variable}: ${error.message}`
      )
    } else {
      console.error("Environment inspection failed")
    }
    process.exitCode = 1
  }
}
