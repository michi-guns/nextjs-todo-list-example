import { PLAYWRIGHT_USERS, signInWithPassword, expect, test } from "./fixtures"

test("two users cannot see or fetch each other's private records", async ({
  page,
}) => {
  await signInWithPassword(page, PLAYWRIGHT_USERS.privacyPrimary)
  await expect(
    page.getByRole("heading", {
      name: PLAYWRIGHT_USERS.privacyPrimary.listName,
    })
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "Primary private task" })
  ).toBeVisible()

  const primaryListButton = page.locator('button[id^="list-option-"]').first()
  const primaryListButtonId = await primaryListButton.getAttribute("id")
  expect(primaryListButtonId).toMatch(/^list-option-[0-9a-f-]{36}$/)
  const primaryListId = primaryListButtonId?.slice("list-option-".length)
  if (!primaryListId)
    throw new Error("The primary private list ID was not rendered")

  await page.getByRole("button", { name: "Sign out" }).click()
  await page.waitForURL((url) => url.pathname === "/")
  await signInWithPassword(page, PLAYWRIGHT_USERS.privacySecondary)

  await expect(
    page.getByRole("heading", {
      name: PLAYWRIGHT_USERS.privacySecondary.listName,
    })
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "Secondary private task" })
  ).toBeVisible()
  await expect(
    page.getByRole("button", {
      name: PLAYWRIGHT_USERS.privacyPrimary.listName,
      exact: true,
    })
  ).toHaveCount(0)
  await expect(
    page.getByRole("heading", { name: "Primary private task" })
  ).toHaveCount(0)

  const privateTaskResponse = await page
    .context()
    .request.get(
      new URL(
        `/api/lists/${encodeURIComponent(primaryListId)}/tasks?limit=20&includeCompleted=true`,
        page.url()
      ).toString(),
      { headers: { Accept: "application/json" } }
    )
  expect(privateTaskResponse.status()).toBe(404)
})
