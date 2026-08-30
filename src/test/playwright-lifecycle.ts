import { createServer } from "node:net"

export const PLAYWRIGHT_BASE_URL = "http://127.0.0.1:3100"
export const PLAYWRIGHT_SERVER_HOST = "127.0.0.1"
export const PLAYWRIGHT_SERVER_PORT = 3100
export const PLAYWRIGHT_TEST_SECRET =
  "playwright-local-test-secret-do-not-use-outside-tests"

export interface PlaywrightRuntimeEnvironment {
  readonly NODE_ENV: "development"
  readonly DATABASE_URL: string
  readonly BETTER_AUTH_URL: string
  readonly BETTER_AUTH_SECRET: string
  readonly BETTER_AUTH_LOCAL_MAILBOX: "true"
  readonly BETTER_AUTH_MAILBOX_DIR: string
  readonly PLAYWRIGHT_E2E: "true"
}

export function createPlaywrightRuntimeEnvironment(
  databaseUrl: string,
  mailboxDirectory: string
): PlaywrightRuntimeEnvironment {
  return {
    NODE_ENV: "development",
    DATABASE_URL: databaseUrl,
    BETTER_AUTH_URL: PLAYWRIGHT_BASE_URL,
    BETTER_AUTH_SECRET: PLAYWRIGHT_TEST_SECRET,
    BETTER_AUTH_LOCAL_MAILBOX: "true",
    BETTER_AUTH_MAILBOX_DIR: mailboxDirectory,
    PLAYWRIGHT_E2E: "true",
  }
}

export interface ServerReadyOptions {
  readonly timeoutMs?: number
  readonly pollIntervalMs?: number
  readonly fetchImpl?: typeof fetch
}

export async function waitForServerReady(
  url: string = PLAYWRIGHT_BASE_URL,
  options: ServerReadyOptions = {}
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? 30_000
  const pollIntervalMs = options.pollIntervalMs ?? 100
  const fetchImpl = options.fetchImpl ?? fetch
  const deadline = Date.now() + timeoutMs
  let lastError: unknown

  while (Date.now() <= deadline) {
    try {
      const response = await fetchImpl(url, { redirect: "manual" })
      if (response.ok) return
      lastError = new Error(`HTTP ${response.status}`)
    } catch (error) {
      lastError = error
    }

    const remainingMs = deadline - Date.now()
    if (remainingMs <= 0) break
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(pollIntervalMs, remainingMs))
    )
  }

  const detail = lastError instanceof Error ? `: ${lastError.message}` : ""
  throw new Error(
    `Timed out waiting for the Playwright server at ${url}${detail}`
  )
}

export function assertPortAvailable(
  host: string = PLAYWRIGHT_SERVER_HOST,
  port: number = PLAYWRIGHT_SERVER_PORT
): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    let settled = false

    const fail = (error: Error) => {
      if (settled) return
      settled = true
      reject(
        new Error(
          `Playwright test port ${host}:${port} is already in use; stop the other process before running the local suite`,
          { cause: error }
        )
      )
    }

    server.once("error", fail)
    server.listen(port, host, () => {
      server.close((error) => {
        if (settled) return
        settled = true
        if (error) {
          reject(error)
        } else {
          resolve()
        }
      })
    })
  })
}

export interface CleanupStep {
  readonly name: string
  readonly run: () => Promise<void>
}

/** Run every cleanup step and surface the first failure after all attempts. */
export async function runCleanupSteps(
  steps: readonly CleanupStep[]
): Promise<void> {
  let firstError: unknown

  for (const step of steps) {
    try {
      await step.run()
    } catch (error) {
      firstError ??= new Error(`Failed to clean up ${step.name}`, {
        cause: error,
      })
    }
  }

  if (firstError) throw firstError
}
