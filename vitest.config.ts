import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    passWithNoTests: true,
    include: ["src/**/*.{test,spec}.ts", "src/**/*.{test,spec}.tsx"],
    exclude: ["**/node_modules/**", "**/e2e/**", "**/.playwright/**"],
  },
})
