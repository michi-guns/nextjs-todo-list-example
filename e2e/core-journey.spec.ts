import { PLAYWRIGHT_USERS, signInWithPassword, expect, test } from "./fixtures"

test("core password journey creates a list and task, changes status, and signs out", async ({
  page,
}) => {
  await page.goto("/")
  await expect(
    page.getByRole("heading", { name: "Make progress visible." })
  ).toBeVisible()

  await signInWithPassword(page, PLAYWRIGHT_USERS.core)
  await expect(
    page.getByRole("heading", { name: PLAYWRIGHT_USERS.core.listName })
  ).toBeVisible()

  const suffix = `${test.info().project.name}-${test.info().retry}`
  const listName = `Playwright ${suffix} core list`
  await page.getByLabel("Create a list").fill(listName)
  await page.getByRole("button", { name: "Add", exact: true }).click()
  await expect(
    page.getByRole("button", { name: listName, exact: true })
  ).toBeVisible()
  await page.getByRole("button", { name: listName, exact: true }).click()
  await expect(page.getByRole("heading", { name: listName })).toBeVisible()

  const taskTitle = `Playwright ${suffix} core task`
  await page.getByLabel("Title").fill(taskTitle)
  await page
    .getByLabel("Notes (optional)")
    .fill("Created by the core browser journey.")
  await page.getByRole("button", { name: "Add task", exact: true }).click()

  const taskRow = page.locator("li").filter({
    has: page.getByRole("heading", { name: taskTitle, exact: true }),
  })
  await expect(taskRow).toBeVisible()
  await taskRow.getByLabel("Change status").selectOption("done")
  await expect(taskRow).toContainText("Status: Done")

  await page.getByRole("button", { name: "Sign out" }).click()
  await page.waitForURL((url) => url.pathname === "/")
  await page.goto("/dashboard")
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fdashboard/)
})
