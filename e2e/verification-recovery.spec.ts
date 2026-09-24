import { randomUUID } from "node:crypto"

import type { Page } from "@playwright/test"

import {
  clearMagicLinkMailbox,
  readMagicLinkWithRetry,
  expect,
  test,
} from "./fixtures"

// Verification URLs contain credentials; keep them out of recorded traces.
test.use({ trace: "off", expectedRefusals: [403, 429] })

async function signUpPending(page: Page, email: string, password: string) {
  await page.goto("/sign-up")
  await page.getByLabel("Name").fill("Verification recovery test")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(password)
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click()
  await expect(
    page.getByRole("heading", { name: "Check your inbox" })
  ).toBeVisible()
}

async function followLink(page: Page, url: string) {
  // The evaluated argument is absent from Playwright's report step title.
  await page.evaluate((target) => {
    window.location.href = target
  }, url)
}

test("TST-AUTH-005 resends verification from the pending screen, bounded, before private access", async ({
  page,
}) => {
  const email = `resend-${randomUUID()}@example.test`
  await clearMagicLinkMailbox()
  try {
    await signUpPending(page, email, "Resend-recovery-password-1")
    await readMagicLinkWithRetry(email)
    await clearMagicLinkMailbox()

    await page
      .getByRole("button", { name: "Send a new verification email" })
      .click()
    await expect(page.getByRole("status").last()).toContainText(
      "If this address is waiting for verification"
    )
    const second = await readMagicLinkWithRetry(email)
    await page
      .getByRole("button", { name: "Send a new verification email" })
      .click()
    await expect(
      page.getByRole("alert").filter({ hasText: "An email was sent recently." })
    ).toBeVisible()

    // Pending accounts still cannot open private content.
    await page.goto("/dashboard")
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fdashboard/)

    await followLink(page, second.url)
    await expect
      .poll(() => new URL(page.url()).pathname === "/dashboard")
      .toBe(true)
    await expect(
      page.getByRole("heading", { name: "Inbox", exact: true })
    ).toBeVisible()
  } finally {
    await clearMagicLinkMailbox()
  }
})

test("TST-AUTH-005 recovers an invalid link and an unverified sign-in with a fresh link", async ({
  page,
}) => {
  const email = `invalid-link-${randomUUID()}@example.test`
  const password = "Invalid-link-password-2"
  await clearMagicLinkMailbox()
  try {
    await signUpPending(page, email, password)
    await readMagicLinkWithRetry(email)

    // A broken link lands on the recovery page, not on private content.
    await page.goto(
      "/api/auth/verify-email?token=not-a-real-token&callbackURL=%2Fverify-email%3Fnext%3D%252Fdashboard"
    )
    await expect
      .poll(() => new URL(page.url()).pathname === "/verify-email")
      .toBe(true)
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "That link is invalid or has expired." })
    ).toBeVisible()

    // Signing in before verifying explains why and offers a new link.
    await clearMagicLinkMailbox()
    await page.goto("/sign-in")
    await page.getByLabel("Email").fill(email)
    await page.getByLabel("Password").fill(password)
    await page.getByRole("button", { name: "Sign in", exact: true }).click()
    await expect(
      page.getByRole("alert").filter({
        hasText: "Check your email to verify your account before signing in.",
      })
    ).toBeVisible()
    await page
      .getByRole("button", { name: "Send a new verification email" })
      .click()
    await expect(page.getByRole("status").last()).toContainText(
      "If this address is waiting for verification"
    )
    const fresh = await readMagicLinkWithRetry(email)
    await followLink(page, fresh.url)
    await expect
      .poll(() => new URL(page.url()).pathname === "/dashboard")
      .toBe(true)
  } finally {
    await clearMagicLinkMailbox()
  }
})

test("TST-AUTH-005 explains an expired link and offers a fresh one by email", async ({
  page,
}) => {
  await page.goto("/verify-email?next=%2Fdashboard&error=TOKEN_EXPIRED")
  await expect(
    page.getByRole("alert").filter({ hasText: "That link has expired." })
  ).toBeVisible()
  await page.getByLabel("Email").fill(`expired-${randomUUID()}@example.test`)
  await page
    .getByRole("button", { name: "Send a new verification email" })
    .click()
  await expect(page.getByRole("status").last()).toContainText(
    "If this address is waiting for verification"
  )
})
