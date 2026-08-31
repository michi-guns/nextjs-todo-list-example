import { expect, test as base, type Page } from "@playwright/test"

import {
  clearMagicLinkMailbox,
  readLatestMagicLink,
  type MagicLinkMessage,
} from "../src/modules/auth/infrastructure/local-mailbox"
import {
  PLAYWRIGHT_USERS,
  type PlaywrightUserFixture,
} from "../scripts/playwright-local/seed"

export type PlaywrightSeedUser = PlaywrightUserFixture

export { PLAYWRIGHT_USERS }

export { expect }

export const test = base.extend<{ browserDiagnostics: void }>({
  browserDiagnostics: [
    async ({ page }, use, testInfo) => {
      const failures: string[] = []

      page.on("console", (message) => {
        if (message.type() === "error") {
          failures.push(`console: ${message.text()}`)
        }
      })
      page.on("pageerror", (error) => {
        failures.push(`pageerror: ${error.message}`)
      })
      page.on("requestfailed", (request) => {
        const failure = request.failure()?.errorText
        if (failure === "net::ERR_ABORTED") return
        failures.push(
          `requestfailed: ${request.method()} ${request.url()} (${failure ?? "unknown"})`
        )
      })

      await use()

      expect(
        failures,
        `Unexpected browser diagnostics in ${testInfo.title}`
      ).toEqual([])
    },
    { auto: true },
  ],
})

export async function signInWithPassword(
  page: Page,
  user: PlaywrightSeedUser
): Promise<void> {
  await page.goto("/sign-in")
  await page.getByLabel("Email").fill(user.email)
  await page.getByLabel("Password").fill(user.password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await page.waitForURL("**/dashboard")
}

export async function readMagicLinkWithRetry(
  email: string
): Promise<MagicLinkMessage> {
  const timeoutMs = 5_000
  const deadline = Date.now() + timeoutMs

  while (Date.now() <= deadline) {
    const message = await readLatestMagicLink(email)
    if (message) return message
    await new Promise((resolve) => setTimeout(resolve, 50))
  }

  throw new Error("The local mailbox did not receive the requested link")
}

export { clearMagicLinkMailbox }
