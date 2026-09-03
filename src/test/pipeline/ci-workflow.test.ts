import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

const WORKFLOW_PATH = path.join(".github", "workflows", "ci.yml")
const ACTION_PIN = /^[\w-]+\/[\w-]+@[0-9a-f]{40}$/
const CHECKOUT_SHA = "d23441a48e516b6c34aea4fa41551a30e30af803"
const PNPM_SETUP_SHA = "c9883cc79df532ad1a7b81bf9ab944ceb090d65c"
const UPLOAD_ARTIFACT_SHA = "043fb46d1a93c77aae656e7c1c64a875d1fc6a0a"

function readWorkflow(): string {
  return readFileSync(WORKFLOW_PATH, "utf8")
}

function usesEntries(workflow: string): string[] {
  return [...workflow.matchAll(/\buses:\s+(\S+)/g)].map((match) => match[1])
}

describe("CI quality workflow contract", () => {
  it("is the only automatic workflow and runs on push and pull_request to main", () => {
    const workflow = readWorkflow()

    expect(workflow).toMatch(/^name:\s*CI\s*$/m)
    expect(workflow).toMatch(/^\s+push:\s*$/m)
    expect(workflow).toMatch(/^\s+pull_request:\s*$/m)
    expect(workflow).toMatch(/branches:\s*\[\s*main\s*\]/)
    expect(workflow).not.toMatch(/workflow_dispatch/)
    expect(workflow).not.toMatch(/deployment_status/)
    expect(workflow).not.toMatch(/repository_dispatch/)
    expect(workflow).not.toMatch(/workflow_call/)
  })

  it("keeps default token permissions at contents read and cancels overlapping runs", () => {
    const workflow = readWorkflow()

    expect(workflow).toMatch(/^permissions:\s*$/m)
    expect(workflow).toMatch(/^\s+contents:\s*read\s*$/m)
    expect(workflow).not.toMatch(/contents:\s*write/)
    expect(workflow).not.toMatch(/id-token:\s*write/)
    expect(workflow).not.toMatch(/deployments:\s*write/)
    expect(workflow).toMatch(/^concurrency:\s*$/m)
    expect(workflow).toMatch(/cancel-in-progress:\s*true/)
  })

  it("pins every action to a full commit SHA from the accepted allowlist", () => {
    const uses = usesEntries(readWorkflow())

    expect(uses.length).toBeGreaterThan(0)
    expect(uses).toContain(`actions/checkout@${CHECKOUT_SHA}`)
    expect(uses).toContain(`pnpm/setup@${PNPM_SETUP_SHA}`)
    expect(uses).toContain(`actions/upload-artifact@${UPLOAD_ARTIFACT_SHA}`)

    for (const reference of uses) {
      expect(reference, `${reference} must be SHA-pinned`).toMatch(ACTION_PIN)
    }
  })

  it("runs local quality and harness commands without hosted or production side effects", () => {
    const workflow = readWorkflow()

    expect(workflow).toMatch(/run:\s*pnpm typecheck/)
    expect(workflow).toMatch(/run:\s*pnpm lint/)
    expect(workflow).toMatch(/run:\s*pnpm test$/m)
    expect(workflow).toMatch(/drizzle-kit check --config drizzle.config.ts/)
    expect(workflow).toMatch(/run:\s*pnpm build/)
    expect(workflow).toMatch(/run:\s*pnpm test:integration/)
    expect(workflow).toMatch(/run:\s*pnpm test:e2e/)
    expect(workflow).toMatch(/playwright install --with-deps chromium/)

    expect(workflow).not.toMatch(/pnpm sanity:smoke/)
    expect(workflow).not.toMatch(/pnpm neon:performance/)
    expect(workflow).not.toMatch(/pnpm neon:development/)
    expect(workflow).not.toMatch(/test:e2e:cross-browser/)
    expect(workflow).not.toMatch(/vercel/i)
    expect(workflow).not.toMatch(/neon\s+connection-string/i)
    expect(workflow).not.toMatch(/secrets\./)
    expect(workflow).not.toMatch(/TEST_DATABASE_URL/)
    expect(workflow).not.toMatch(/neon\.tech/)
  })

  it("uses loopback placeholders for compile-time environment and does not grant write on the quality job", () => {
    const workflow = readWorkflow()

    expect(workflow).toMatch(/postgresql:\/\/ci:ci@127\.0\.0\.1:5432\/ci/)
    expect(workflow).toMatch(/BETTER_AUTH_URL:\s*http:\/\/127\.0\.0\.1:3000/)
    expect(workflow).toMatch(/ci-build-placeholder-not-a-real-secret/)
    expect(workflow).toMatch(/NEXT_PUBLIC_SANITY_PROJECT_ID:\s*ci/)
    expect(workflow).not.toMatch(/PLAYWRIGHT_E2E:\s*["']?true["']?/)
  })
})
