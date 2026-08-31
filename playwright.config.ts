import { defineConfig, devices } from "@playwright/test"

import {
  PLAYWRIGHT_BASE_URL,
  PLAYWRIGHT_SERVER_PORT,
} from "./src/test/playwright-lifecycle"

const browserProjects = [
  {
    name: "chromium",
    use: { ...devices["Desktop Chrome"] },
  },
  ...(process.env.PLAYWRIGHT_CROSS_BROWSER === "true"
    ? [
        {
          name: "firefox",
          use: { ...devices["Desktop Firefox"] },
        },
        {
          name: "webkit",
          use: { ...devices["Desktop Safari"] },
        },
      ]
    : []),
]

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["html", { open: "never" }]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: PLAYWRIGHT_BASE_URL,
    trace: "on-first-retry",
  },
  projects: browserProjects,
  expect: { timeout: 10_000 },
  timeout: 60_000,
  maxFailures: 1,
  metadata: { playwrightServerPort: PLAYWRIGHT_SERVER_PORT },
})
