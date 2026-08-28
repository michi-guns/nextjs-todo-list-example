import { fileURLToPath, URL } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    passWithNoTests: true,
    include: ["src/**/*.{test,spec}.ts", "src/**/*.{test,spec}.tsx"],
    exclude: ["**/node_modules/**", "**/e2e/**", "**/.playwright/**"],
  },
})
