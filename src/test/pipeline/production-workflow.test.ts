import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const workflow = () =>
  readFileSync(".github/workflows/deploy-production.yml", "utf8")

describe("protected Production release workflow", () => {
  it("is manual, main-only and serializes releases without cancelling an active migration", () => {
    const source = workflow()
    expect(source).toMatch(/^  workflow_dispatch:/m)
    expect(source).not.toMatch(/\b(push|pull_request|workflow_call|schedule):/)
    expect(source.match(/github.ref == 'refs\/heads\/main'/g)).toHaveLength(2)
    expect(source).toContain("group: production-release")
    expect(source).toContain("cancel-in-progress: false")
    expect(source).toContain("rollback-compatible:")
    expect(source).toContain("default: false")
  })
  it("resolves and checks CI in a separate job without Production secrets", () => {
    const resolve = workflow().split("  release:")[0]
    expect(resolve).toContain('pnpm release -- resolve --ref "$REF"')
    expect(resolve).toContain("REF: ${{ inputs.ref }}")
    expect(resolve).not.toContain("environment:")
    expect(
      [...resolve.matchAll(/secrets\.(\w+)/g)].map((match) => match[1])
    ).toEqual(["GITHUB_TOKEN"])
    expect(resolve).toContain("actions: read")
  })
  it("approves, checks out and releases the same immutable SHA", () => {
    const release = workflow().split("  release:")[1]
    expect(release).toContain("needs: resolve")
    expect(release).toMatch(/^    environment: production$/m)
    expect(release).toContain("ref: ${{ needs.resolve.outputs.commitSha }}")
    expect(release).toContain(
      "RELEASE_COMMIT_SHA: ${{ needs.resolve.outputs.commitSha }}"
    )
    expect(release).toContain(
      "RELEASE_APPROVED_SHA: ${{ needs.resolve.outputs.commitSha }}"
    )
    expect(release).toContain(
      "RELEASE_CI_RUN_ID: ${{ needs.resolve.outputs.ciRunId }}"
    )
    expect(release).not.toContain("ref: ${{ inputs.ref }}")
    expect(release).toContain("fetch-depth: 0")
    expect(release).toContain("persist-credentials: false")
  })
  it("installs pinned tooling before secrets enter the release consumer", () => {
    const source = workflow()
    expect(source).toContain("vercel@59.11.2")
    expect(source).toContain("runtime: node@24")
    for (const match of source.matchAll(/\buses:\s+(\S+)/g))
      expect(match[1]).toMatch(/^[\w-]+\/[\w-]+@[0-9a-f]{40}$/)
    const before = source.split("      - name: Run protected release")[0]
    expect(before).not.toMatch(
      /secrets\.(VERCEL_TOKEN|DATABASE_URL|NEON_API_KEY|RESEND_API_KEY|BETTER_AUTH_SECRET|HEALTH_PROBE_SECRET)/
    )
    const consumer = source
      .split("      - name: Run protected release")[1]
      .split("      - name: Publish safe release record")[0]
    for (const name of [
      "VERCEL_TOKEN",
      "NEON_API_KEY",
      "DATABASE_URL",
      "DATABASE_URL_UNPOOLED",
      "BETTER_AUTH_SECRET",
      "RESEND_API_KEY",
      "SANITY_REVALIDATE_SECRET",
      "SANITY_MANUAL_RECOVERY_SECRET",
      "HEALTH_PROBE_SECRET",
    ])
      expect(consumer).toContain(`${name}: \${{ secrets.${name} }}`)
    expect(consumer).toContain("run: pnpm release -- release")
  })
  it("always attempts safe record publication and contains no seed or rollback command", () => {
    const source = workflow()
    const publish = source.split("      - name: Publish safe release record")[1]
    expect(publish).toContain("if: ${{ always() }}")
    expect(publish).toContain(
      "path: ${{ runner.temp }}/production-release-record.json"
    )
    expect(source).not.toMatch(/\b(reset|seed|rollback)\s+--|drizzle-kit push/)
  })
})
