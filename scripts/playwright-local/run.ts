import { spawn } from "node:child_process"

const argumentsForRunner = process.argv.slice(2)
const crossBrowser = argumentsForRunner.includes("--cross-browser")
const unexpectedArguments = argumentsForRunner.filter(
  (argument) => argument !== "--cross-browser"
)

if (unexpectedArguments.length > 0) {
  throw new Error(
    `Unsupported Playwright runner arguments: ${unexpectedArguments.join(", ")}`
  )
}

const environment = {
  ...process.env,
  ...(crossBrowser ? { PLAYWRIGHT_CROSS_BROWSER: "true" } : {}),
}

const child =
  process.platform === "win32"
    ? spawn(
        process.env.ComSpec || "cmd.exe",
        ["/d", "/s", "/c", "pnpm exec playwright test"],
        { env: environment, stdio: "inherit", windowsHide: true }
      )
    : spawn("pnpm", ["exec", "playwright", "test"], {
        env: environment,
        stdio: "inherit",
      })

child.once("error", (error) => {
  console.error(`Unable to start Playwright: ${error.message}`)
  process.exitCode = 1
})

child.once("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
  } else {
    process.exitCode = code ?? 1
  }
})
