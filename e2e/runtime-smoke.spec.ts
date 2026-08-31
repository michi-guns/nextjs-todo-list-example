import { expect, test } from "@playwright/test"

import { PLAYWRIGHT_USERS, signInWithPassword } from "./fixtures"

test("local runtime serves deterministic landing content", async ({ page }) => {
  const response = await page.goto("/")

  expect(response?.ok()).toBe(true)
  await expect(
    page.getByRole("heading", { name: "Make progress visible." })
  ).toBeVisible()
  await expect(
    page.getByText("Keep personal tasks clear, focused, and moving forward.")
  ).toBeVisible()
})

test("behavior seed exposes deterministic pagination labels", async ({
  page,
}) => {
  await signInWithPassword(page, PLAYWRIGHT_USERS.pagination)

  await expect(
    page.getByRole("heading", { name: PLAYWRIGHT_USERS.pagination.listName })
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Load more lists" })
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Load more tasks" })
  ).toBeVisible()
})
