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
    // Process next-sanity through Vitest so route tests can stand in for the
    // Next request APIs (`next/headers`) its Draft Mode helper imports.
    server: { deps: { inline: ["next-sanity"] } },
    include: [
      "src/**/*.{test,spec}.ts",
      "src/**/*.{test,spec}.tsx",
      "scripts/verify-neon-performance/**/*.test.mjs",
      "scripts/local-postgres/**/*.test.ts",
      "scripts/neon-development/**/*.test.ts",
      "scripts/logging/**/*.test.ts",
      "scripts/deploy/**/*.test.ts",
    ],
    exclude: [
      "**/node_modules/**",
      "**/e2e/**",
      "**/.playwright/**",
      "**/*.integration.test.ts",
    ],
  },
})
