import { expect, test } from "@playwright/test"

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
