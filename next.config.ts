import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  ...(process.env.PLAYWRIGHT_E2E === "true"
    ? { distDir: ".next-playwright" }
    : {}),
}

export default nextConfig
