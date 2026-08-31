import type { Page } from "@playwright/test"

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
