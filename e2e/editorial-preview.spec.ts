import { expect, test } from "./fixtures"

// The local harness runs with editorial preview disabled (the default).
test.use({ expectedRefusals: [404] })

test("TST-LANDING-004 refuses Draft Mode entry while editorial preview is disabled", async ({
  page,
  context,
}) => {
  const response = await page.request.get(
    "/api/draft-mode/enable?sanity-preview-secret=not-a-real-secret&sanity-preview-pathname=%2F",
    { maxRedirects: 0 }
  )
  expect(response.status()).toBe(404)
  expect(response.headers()["set-cookie"] ?? "").not.toContain(
    "__prerender_bypass"
  )
  expect(
    (await context.cookies()).some((cookie) =>
      cookie.name.startsWith("__prerender_bypass")
    )
  ).toBe(false)
})

test("TST-LANDING-004 exits Draft Mode to the published landing page", async ({
  page,
}) => {
  await page.goto("/api/draft-mode/disable")
  await expect.poll(() => new URL(page.url()).pathname === "/").toBe(true)
  await expect(
    page.getByRole("heading", { name: "Make progress visible." })
  ).toBeVisible()
})

test("TST-LANDING-004 serves the public landing page without preview markup", async ({
  page,
}) => {
  const response = await page.request.get("/")
  expect(response.ok()).toBe(true)
  const html = await response.text()
  expect(html).toContain("Make progress visible.")
  // No editing attributes, exit control or Live draft subscription.
  expect(html).not.toContain("data-sanity")
  expect(html).not.toContain("/api/draft-mode/disable")
  expect(html).not.toContain("includeDrafts")
})
