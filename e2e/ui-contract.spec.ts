import { PLAYWRIGHT_USERS, signInWithPassword, expect, test } from "./fixtures"

test("seeded lists and tasks continue through pagination and completed filtering", async ({
  page,
}) => {
  await signInWithPassword(page, PLAYWRIGHT_USERS.pagination)
  await expect(
    page.getByRole("heading", { name: PLAYWRIGHT_USERS.pagination.listName })
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "Pagination seeded task 05" })
  ).toBeVisible()

  await page.getByRole("button", { name: "Load more lists" }).click()
  await expect(
    page.getByRole("button", { name: "Pagination List 21", exact: true })
  ).toBeVisible()

  await page.getByRole("button", { name: "Load more tasks" }).click()
  await expect(
    page.getByRole("heading", { name: "Pagination seeded task 21" })
  ).toBeVisible()

  const completedToggle = page.getByLabel("Show completed tasks")
  await completedToggle.uncheck()
  await expect(
    page.getByRole("heading", { name: "Pagination seeded task 05" })
  ).toHaveCount(0)
  await expect(
    page.getByRole("heading", { name: "Pagination seeded task 01" })
  ).toBeVisible()
  await completedToggle.check()
  await expect(
    page.getByRole("heading", { name: "Pagination seeded task 05" })
  ).toBeVisible()
})

test("dashboard skip link focuses main content and the next logical tab stop", async ({
  page,
}) => {
  await signInWithPassword(page, PLAYWRIGHT_USERS.skipLink)

  const skipLink = page.getByRole("link", { name: "Skip to main content" })
  await skipLink.focus()
  await expect(skipLink).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(page.locator("#dashboard-main")).toBeFocused()
  await page.keyboard.press("Tab")
  await expect(page.locator("#new-task-title")).toBeFocused()
})
