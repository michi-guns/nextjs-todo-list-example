import { expect, PLAYWRIGHT_USERS, signInWithPassword, test } from "./fixtures"

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

test("health endpoints report liveness and real database readiness", async ({
  request,
}) => {
  const app = await request.get("/api/health/app")
  expect(app.status()).toBe(200)
  expect(app.headers()["cache-control"]).toBe("no-store")
  expect(await app.json()).toEqual({
    component: "app",
    status: "ok",
    release: "unreleased",
  })

  // The local harness is unprofiled, so dependency probes are open here.
  const database = await request.get("/api/health/database")
  expect(database.status()).toBe(200)
  expect(await database.json()).toMatchObject({
    component: "database",
    status: "ok",
  })

  const unknown = await request.get("/api/health/users")
  expect(unknown.status()).toBe(404)
  expect(await unknown.json()).toEqual({ status: "unknown_component" })
})
