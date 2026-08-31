import {
  clearMagicLinkMailbox,
  PLAYWRIGHT_USERS,
  readMagicLinkWithRetry,
  expect,
  test,
} from "./fixtures"

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
    expect(message.url).toContain("/api/auth/magic-link/verify")

    await page.goto(message.url)
    await page.waitForURL((url) => url.pathname === "/dashboard")
    await expect(
      page.getByRole("heading", { name: PLAYWRIGHT_USERS.magicLink.listName })
    ).toBeVisible()
  } finally {
    await clearMagicLinkMailbox()
  }
})
