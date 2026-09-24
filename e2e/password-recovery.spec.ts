import { randomUUID } from "node:crypto"

import {
  clearMagicLinkMailbox,
  readMagicLinkWithRetry,
  expect,
  test,
} from "./fixtures"

// Reset and verification URLs contain credentials; keep them out of traces.
test.use({ trace: "off", expectedRefusals: [401, 429] })

test("TST-AUTH-004 resets a forgotten password through the UI and ends the old session", async ({
  page,
  context,
}) => {
  const email = `recovery-${randomUUID()}@example.test`
  const oldPassword = "Original-recovery-password-1"
  const newPassword = "Replaced-recovery-password-2"

  await clearMagicLinkMailbox()
  try {
    await page.goto("/sign-up")
    await page.getByLabel("Name").fill("Recovery browser test")
    await page.getByLabel("Email").fill(email)
    await page.getByLabel("Password").fill(oldPassword)
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click()
    const verification = await readMagicLinkWithRetry(email)
    await page.evaluate((url) => {
      window.location.href = url
    }, verification.url)
    await expect
      .poll(() => new URL(page.url()).pathname === "/dashboard")
      .toBe(true)
    const oldSession = await context.cookies()

    // Request a reset from the sign-in screen.
    await clearMagicLinkMailbox()
    await context.clearCookies()
    await page.goto("/sign-in")
    await page.getByRole("link", { name: "Forgot password?" }).click()
    await expect(page).toHaveURL((url) => url.pathname === "/forgot-password")
    await page.getByLabel("Email").fill(email)
    await page.getByRole("button", { name: "Send reset link" }).click()
    await expect(page.getByRole("status")).toContainText(
      "If an account exists for that email"
    )

    const reset = await readMagicLinkWithRetry(email)
    expect(reset.metadata).toMatchObject({ kind: "password-reset" })
    // A boolean keeps the token-bearing path out of any failure message.
    expect(
      /^\/api\/auth\/reset-password\/[^/]+$/.test(new URL(reset.url).pathname)
    ).toBe(true)
    await page.evaluate((url) => {
      window.location.href = url
    }, reset.url)
    // The page keeps the token in memory and drops it from the address bar.
    await expect
      .poll(() => new URL(page.url()).pathname === "/reset-password")
      .toBe(true)
    await expect.poll(() => new URL(page.url()).search === "").toBe(true)

    await page.getByLabel("New password", { exact: true }).fill(newPassword)
    await page.getByLabel("Confirm new password").fill(newPassword)
    await page.getByRole("button", { name: "Save new password" }).click()
    await expect(page).toHaveURL((url) => url.pathname === "/sign-in")
    await expect(page.getByRole("status")).toContainText(
      "Your password was changed"
    )

    // The session from before the reset no longer opens private content.
    await context.addCookies(oldSession)
    await page.goto("/dashboard")
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fdashboard/)
    await context.clearCookies()

    await page.goto("/sign-in")
    await page.getByLabel("Email").fill(email)
    await page.getByLabel("Password").fill(oldPassword)
    await page.getByRole("button", { name: "Sign in", exact: true }).click()
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "The email or password is incorrect." })
    ).toBeVisible()
    await page.getByLabel("Password").fill(newPassword)
    await page.getByRole("button", { name: "Sign in", exact: true }).click()
    await expect(page).toHaveURL((url) => url.pathname === "/dashboard")
    await expect(
      page.getByRole("heading", { name: "Inbox", exact: true })
    ).toBeVisible()

    // A used link cannot be replayed; the page offers a fresh request.
    await page.evaluate((url) => {
      window.location.href = url
    }, reset.url)
    await expect
      .poll(() => new URL(page.url()).pathname === "/reset-password")
      .toBe(true)
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "That link is invalid or has expired." })
    ).toBeVisible()
    await expect(
      page.getByRole("link", { name: "Request a new link" })
    ).toBeVisible()
  } finally {
    await clearMagicLinkMailbox()
  }
})

test("TST-AUTH-004 answers a forgotten-password request neutrally and bounds repeats", async ({
  page,
}) => {
  const email = `absent-${randomUUID()}@example.test`
  await page.goto("/forgot-password")
  await page.getByLabel("Email").fill(email)
  await page.getByRole("button", { name: "Send reset link" }).click()
  await expect(page.getByRole("status")).toContainText(
    "If an account exists for that email"
  )
  await page.getByRole("button", { name: "Send another link" }).click()
  await expect(
    page.getByRole("alert").filter({
      hasText:
        "An email was sent recently. Wait a minute before requesting another.",
    })
  ).toBeVisible()
})
