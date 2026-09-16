import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

const mailEnvironment = {
  APP_ENV: "production",
  NODE_ENV: "production",
  APP_MAIL_TRANSPORT: "remote",
  APP_MAIL_PROVIDER: "resend",
  SECRET_NAMESPACE: "production",
  BETTER_AUTH_LOCAL_MAILBOX: "false",
  RESEND_API_KEY: "re_private_test_fixture",
  APP_MAIL_FROM: "private-sender@example.com",
} satisfies NodeJS.ProcessEnv

function inspect(overrides: Partial<NodeJS.ProcessEnv> = {}) {
  return spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/auth-mail/inspect.ts"],
    {
      env: { ...process.env, ...mailEnvironment, ...overrides },
      encoding: "utf8",
      timeout: 10_000,
    }
  )
}

describe("protected Production mail inspection", () => {
  it("validates configuration without exposing the key or sender", () => {
    const result = inspect()
    expect(result.status).toBe(0)
    expect(result.stderr).toBe("")
    expect(JSON.parse(result.stdout)).toEqual({
      result: "configuration_valid",
      provider: "resend",
      secretNamespace: "production",
      remoteDeliveryTested: false,
    })
    expect(result.stdout).not.toContain(mailEnvironment.RESEND_API_KEY)
    expect(result.stdout).not.toContain(mailEnvironment.APP_MAIL_FROM)
  })

  it.each([
    { RESEND_API_KEY: "" },
    { APP_MAIL_FROM: "onboarding@resend.dev" },
    { SECRET_NAMESPACE: "preview" },
    { BETTER_AUTH_LOCAL_MAILBOX: "true" },
  ])("fails closed with safe diagnostics for %j", (overrides) => {
    const result = inspect(overrides)
    expect(result.status).toBe(1)
    expect(result.stdout).toBe("")
    expect(result.stderr.trim()).toBe("Invalid Production Resend configuration")
  })
})

describe("Production mail workflow boundary", () => {
  const workflow = () =>
    readFileSync(".github/workflows/verify-production-mail.yml", "utf8")

  it("is manual, main-only and uses the protected environment at the triggering SHA", () => {
    const source = workflow()
    expect(source).toMatch(/^  workflow_dispatch:\s*$/m)
    expect(source).not.toMatch(/\b(push|pull_request|workflow_call|schedule):/)
    expect(source).toContain("github.ref == 'refs/heads/main'")
    expect(source).toMatch(/^    environment: production$/m)
    expect(source).toContain("ref: ${{ github.sha }}")
    expect(source).toContain("persist-credentials: false")
    expect(source).toMatch(/^  contents: read$/m)
    expect(source).not.toMatch(/:\s*write\b/)
    for (const match of source.matchAll(/\buses:\s+(\S+)/g)) {
      expect(match[1]).toMatch(/^[\w-]+\/[\w-]+@[0-9a-f]{40}$/)
    }
  })

  it("limits credentials to validation and has no send, database or deploy step", () => {
    const source = workflow()
    expect(source).toContain("run: pnpm exec tsx scripts/auth-mail/inspect.ts")
    expect(source).toMatch(
      /^          RESEND_API_KEY: \$\{\{ secrets.RESEND_API_KEY \}\}$/m
    )
    for (const name of Object.keys(mailEnvironment).filter(
      (name) => name !== "RESEND_API_KEY"
    )) {
      expect(source).toContain(name + ": ${{ vars." + name + " }}")
    }
    expect(source).not.toMatch(
      /DATABASE_URL|VERCEL_TOKEN|NEON_API_KEY|sendResendAuthEmail/
    )
    expect(source).not.toMatch(/pnpm (build|preview)|drizzle-kit|vercel deploy/)
    const otherWorkflows = ["ci.yml", "deploy-preview.yml"].map((name) =>
      readFileSync(`.github/workflows/${name}`, "utf8")
    )
    for (const other of otherWorkflows) {
      expect(other).not.toContain("secrets.RESEND_API_KEY")
      expect(other).not.toMatch(/environment: production/)
    }
  })
})
