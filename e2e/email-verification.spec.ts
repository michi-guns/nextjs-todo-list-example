import { randomUUID } from "node:crypto"

import {
  clearMagicLinkMailbox,
  readMagicLinkWithRetry,
  expect,
  test,
} from "./fixtures"

// Verification URLs contain credentials; keep them out of recorded traces.
test.use({ trace: "off" })

test("fresh signup verifies email before accessing Inbox and retains its password", async ({
  page,
  baseURL,
}) => {
  const email = `verification-${randomUUID()}@example.test`
  const password = "Verification-test-password-123!"

  await clearMagicLinkMailbox()
  try {
    await page.goto("/sign-up")
    await page.getByLabel("Name").fill("Verification browser test")
    await page.getByLabel("Email").fill(email)
    await page.getByLabel("Password").fill(password)
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click()

    await expect(
      page.getByRole("heading", { name: "Check your inbox" })
    ).toBeVisible()
    await expect(page.getByRole("status")).toContainText(
      "Your account is waiting for email verification"
    )

    const message = await readMagicLinkWithRetry(email)
    const verificationUrl = new URL(message.url)
    expect(message.email).toBe(email)
    expect(verificationUrl.origin).toBe(new URL(baseURL!).origin)
    expect(verificationUrl.pathname).toBe("/api/auth/verify-email")

    await page.goto("/dashboard")
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fdashboard/)

    // The evaluated argument is absent from Playwright's report step title.
    await page.evaluate((url) => {
      window.location.href = url
    }, message.url)
    await expect.poll(() => new URL(page.url()).pathname).toBe("/dashboard")
    await expect(
      page.getByRole("heading", { name: "Inbox", exact: true })
    ).toBeVisible()

    await page.getByRole("button", { name: "Sign out" }).click()
    await expect(page).toHaveURL((url) => url.pathname === "/")
    await page.goto("/sign-in")
    await page.getByLabel("Email").fill(email)
    await page.getByLabel("Password").fill(password)
    await page.getByRole("button", { name: "Sign in", exact: true }).click()
    await expect(page).toHaveURL((url) => url.pathname === "/dashboard")
    await expect(
      page.getByRole("heading", { name: "Inbox", exact: true })
    ).toBeVisible()
  } finally {
    await clearMagicLinkMailbox()
  }
})
