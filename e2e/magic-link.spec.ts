import {
  clearMagicLinkMailbox,
  PLAYWRIGHT_USERS,
  readMagicLinkWithRetry,
  expect,
  test,
} from "./fixtures"

// Magic-link URLs contain credentials; keep them out of recorded traces.
test.use({ trace: "off" })

test("magic-link journey requests, reads, and consumes a local mailbox link", async ({
  page,
}) => {
  await clearMagicLinkMailbox()
  try {
    await page.goto("/magic-link")
    await page.getByLabel("Email").fill(PLAYWRIGHT_USERS.magicLink.email)
    await page.getByRole("button", { name: "Email me a link" }).click()

    await expect(page.getByRole("status")).toContainText(
      "We sent a sign-in link"
    )
    const message = await readMagicLinkWithRetry(
      PLAYWRIGHT_USERS.magicLink.email
    )
    expect(new URL(message.url).pathname).toBe("/api/auth/magic-link/verify")

    // The evaluated argument is absent from Playwright's report step title.
    await page.evaluate((url) => {
      window.location.href = url
    }, message.url)
    await page.waitForURL((url) => url.pathname === "/dashboard")
    await expect(
      page.getByRole("heading", { name: PLAYWRIGHT_USERS.magicLink.listName })
    ).toBeVisible()
  } finally {
    await clearMagicLinkMailbox()
  }
})
