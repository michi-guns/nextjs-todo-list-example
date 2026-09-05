import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

const WORKFLOW_DIR = path.join(".github", "workflows")
const WORKFLOW_PATH = path.join(WORKFLOW_DIR, "deploy-preview.yml")
const ACTION_PIN = /^[\w-]+\/[\w-]+@[0-9a-f]{40}$/
const CHECKOUT_SHA = "d23441a48e516b6c34aea4fa41551a30e30af803"
const PNPM_SETUP_SHA = "c9883cc79df532ad1a7b81bf9ab944ceb090d65c"

function readWorkflow(): string {
  return readFileSync(WORKFLOW_PATH, "utf8")
}

function usesEntries(workflow: string): string[] {
  return [...workflow.matchAll(/\buses:\s+(\S+)/g)].map((match) => match[1])
}

describe("Preview delivery workflow contract", () => {
  it("is manual workflow_dispatch only and never runs on push or pull_request", () => {
    const workflow = readWorkflow()

    expect(workflow).toMatch(/^name:\s*Preview\s*$/m)
    expect(workflow).toMatch(/workflow_dispatch:/)
    expect(workflow).toMatch(/preview-id:/)
    expect(workflow).toMatch(/action:/)
    expect(workflow).not.toMatch(/^\s+push:\s*$/m)
    expect(workflow).not.toMatch(/pull_request/)
    expect(workflow).not.toMatch(/deployment_status/)
    expect(workflow).not.toMatch(/repository_dispatch/)
    expect(workflow).not.toMatch(/workflow_call/)
  })

  it("keeps CI as the only automatic workflow", () => {
    const files = readdirSync(WORKFLOW_DIR).filter((file) =>
      file.endsWith(".yml")
    )
    expect(files).toContain("ci.yml")
    expect(files).toContain("deploy-preview.yml")

    for (const file of files) {
      if (file === "ci.yml") continue
      const workflow = readFileSync(path.join(WORKFLOW_DIR, file), "utf8")
      expect(workflow, file).not.toMatch(/^\s+push:\s*$/m)
      expect(workflow, file).not.toMatch(/pull_request/)
    }
  })

  it("uses the preview GitHub Environment, read-only contents, and SHA-pinned actions", () => {
    const workflow = readWorkflow()

    expect(workflow).toMatch(/^permissions:\s*$/m)
    expect(workflow).toMatch(/^\s+contents:\s*read\s*$/m)
    expect(workflow).not.toMatch(/contents:\s*write/)
    expect(workflow).not.toMatch(/id-token:\s*write/)
    expect(workflow).toMatch(/environment:\s*preview/)
    expect(workflow).not.toMatch(/environment:\s*production/)
    expect(workflow).toMatch(/cancel-in-progress:\s*false/)

    const uses = usesEntries(workflow)
    expect(uses).toContain(`actions/checkout@${CHECKOUT_SHA}`)
    expect(uses).toContain(`pnpm/setup@${PNPM_SETUP_SHA}`)
    for (const reference of uses) {
      expect(reference, `${reference} must be SHA-pinned`).toMatch(ACTION_PIN)
    }
  })

  it("deploys through the repository preview adapter without Production flags", () => {
    const workflow = readWorkflow()

    expect(workflow).toMatch(/with:\s*\n\s+ref:\s*\$\{\{ inputs\.ref \}\}/)
    expect(workflow).toMatch(/pnpm preview -- deploy/)
    expect(workflow).toMatch(/--ref\s+"\$REF"/)
    expect(workflow).toMatch(/pnpm preview -- cleanup/)
    expect(workflow).toMatch(/APP_ENV:\s*preview/)
    expect(workflow).toMatch(/NEXT_PUBLIC_SANITY_DATASET:\s*preview/)
    expect(workflow).toMatch(/APP_MAIL_TRANSPORT:\s*controlled-account/)
    expect(workflow).toMatch(/secrets\.NEON_API_KEY/)
    expect(workflow).toMatch(/secrets\.VERCEL_TOKEN/)
    expect(workflow).toMatch(/secrets\.BETTER_AUTH_SECRET/)
    expect(workflow).not.toMatch(/--prod\b/)
    expect(workflow).not.toMatch(/APP_ENV:\s*production/)
    expect(workflow).not.toMatch(/SANITY_WRITE_POLICY:\s*production-recovery/)
    expect(workflow).not.toMatch(/APP_MAIL_TRANSPORT:\s*local-mailbox/)
    expect(workflow).not.toMatch(/BETTER_AUTH_LOCAL_MAILBOX:\s*["']?true["']?/)
  })
})
