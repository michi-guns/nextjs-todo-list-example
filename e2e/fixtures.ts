import { createHash } from "node:crypto"

import { expect, test as base, type Page } from "@playwright/test"
import {
  isBrowserRequestCancellation,
  redactAuthTokens,
} from "../src/test/browser-diagnostics"

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

export const test = base.extend<{
  browserDiagnostics: void
  syntheticClient: void
  /**
   * HTTP statuses a journey deliberately provokes (a wrong password, a
   * cooldown). Chromium logs each as "Failed to load resource"; only those
   * exact statuses are tolerated, every other diagnostic still fails.
   */
  expectedRefusals: readonly number[]
}>({
  expectedRefusals: [[], { option: true }],
  // Real auth limits stay on. Each test and retry is its own synthetic client
  // (derived from its id, so a restarted worker cannot reuse an address), and
  // one journey cannot spend another's per-address budget. Only same-origin
  // auth requests carry it; third-party requests are untouched.
  syntheticClient: [
    async ({ context, baseURL }, use, testInfo) => {
      const digest = createHash("sha256")
        .update(`${testInfo.testId}:${testInfo.retry}`)
        .digest()
      const address = `198.18.${digest[0]}.${(digest[1] % 254) + 1}`
      await context.route(`${baseURL}/api/auth/**`, (route) =>
        route.continue({
          headers: { ...route.request().headers(), "x-forwarded-for": address },
        })
      )
      await use()
    },
    { auto: true },
  ],
  browserDiagnostics: [
    async ({ page, expectedRefusals }, use, testInfo) => {
      const failures: string[] = []
      const refusal =
        /^Failed to load resource: the server responded with a status of (\d{3}) /

      page.on("console", (message) => {
        if (message.type() === "error") {
          const status = refusal.exec(message.text())?.[1]
          if (status && expectedRefusals.includes(Number(status))) return
          failures.push(`console: ${message.text()}`)
        }
      })
      page.on("pageerror", (error) => {
        failures.push(`pageerror: ${error.message}`)
      })
      page.on("requestfailed", (request) => {
        const failure = request.failure()?.errorText
        if (
          isBrowserRequestCancellation(failure, {
            method: request.method(),
            resourceType: request.resourceType(),
            url: request.url(),
          })
        )
          return
        failures.push(
          `requestfailed: ${request.method()} ${request.url()} (${failure ?? "unknown"})`
        )
      })

      await use()

      expect(
        failures.map(redactAuthTokens),
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
