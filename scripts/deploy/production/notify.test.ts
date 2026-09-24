import { spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { createServer, type IncomingHttpHeaders } from "node:http"
import type { AddressInfo } from "node:net"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"

import { createResendEmailNotifier } from "../../../src/shared/operational-alerts/resend-email"
import { buildReleaseFailureAlert, notifyReleaseFailure } from "./notify-core"

const SHA = "0123456789abcdef0123456789abcdef01234567"
const KEY = "re_notify_key_sentinel_0123456789"
const TO = "oncall-sentinel@example.com"
const RUN = {
  GITHUB_REPOSITORY: "michi-guns/nextjs-todo-list-example",
  GITHUB_RUN_ID: "4242",
  GITHUB_RUN_ATTEMPT: "2",
  GITHUB_SERVER_URL: "https://github.com",
  RELEASE_COMMIT_SHA: SHA,
}
const trusted = {
  repository: RUN.GITHUB_REPOSITORY,
  runId: "4242",
  runAttempt: 2,
  serverUrl: "https://github.com",
  commitSha: SHA,
}

function record(
  stages: Partial<Record<string, string>>,
  overrides: Record<string, unknown> = {}
) {
  return {
    ref: { requestedRef: SHA, commitSha: SHA, kind: "commit" },
    ci: { commitSha: SHA, runId: 1, runAttempt: 1 },
    actor: "operator",
    workflowRunId: "4242",
    startedAt: "2026-09-24T00:00:00.000Z",
    result: "failed",
    stages: {
      preflight: "succeeded",
      migration: "not_started",
      deployment: "not_started",
      smoke: "not_started",
      ...stages,
    },
    ...overrides,
  }
}

describe("TST-ALERTS-001 release-failure decision", () => {
  it.each([
    ["migration", { migration: "failed" }],
    ["deployment", { migration: "succeeded", deployment: "failed" }],
    [
      "smoke",
      { migration: "succeeded", deployment: "succeeded", smoke: "failed" },
    ],
  ])("alerts a %s failure from this run's safe record", (stage, stages) => {
    expect(buildReleaseFailureAlert(record(stages), trusted)).toEqual({
      kind: "release_failed",
      environment: "production",
      repository: RUN.GITHUB_REPOSITORY,
      runId: "4242",
      runAttempt: 2,
      runUrl:
        "https://github.com/michi-guns/nextjs-todo-list-example/actions/runs/4242",
      commitSha: SHA,
      stage,
    })
  })

  it("sends nothing for a successful record or a preflight-only refusal", () => {
    expect(
      buildReleaseFailureAlert(
        record(
          {
            migration: "succeeded",
            deployment: "succeeded",
            smoke: "succeeded",
          },
          { result: "succeeded" }
        ),
        trusted
      )
    ).toBeNull()
    expect(
      buildReleaseFailureAlert(record({ preflight: "failed" }), trusted)
    ).toBeNull()
  })

  it.each([
    ["an absent record", undefined],
    ["an invalid record", { result: "failed" }],
    [
      "another run's record",
      record({ migration: "failed" }, { workflowRunId: "1" }),
    ],
    [
      "another commit's record",
      record({ migration: "failed" }, { ref: { commitSha: "f".repeat(40) } }),
    ],
  ])(
    "falls back to trusted metadata with an unknown stage for %s",
    (_, value) => {
      expect(buildReleaseFailureAlert(value, trusted)).toMatchObject({
        stage: "unknown",
        runId: "4242",
        commitSha: SHA,
      })
    }
  )
})

type Captured = { headers: IncomingHttpHeaders; body: string }
const closers: Array<() => Promise<void>> = []
afterEach(async () => {
  await Promise.all(closers.splice(0).map((close) => close()))
})

async function collector(status: number, body: unknown) {
  const captured: Captured[] = []
  const server = createServer((request, response) => {
    let text = ""
    request.on("data", (chunk) => (text += chunk))
    request.on("end", () => {
      captured.push({ headers: request.headers, body: text })
      response.writeHead(status, { "content-type": "application/json" })
      response.end(JSON.stringify(body))
    })
  })
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done))
  closers.push(
    () =>
      new Promise((done) => {
        server.closeAllConnections()
        server.close(() => done())
      })
  )
  const endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}/emails`
  return { endpoint, captured }
}

describe("TST-ALERTS-001 protected-runner notification over HTTP", () => {
  const config = {
    apiKey: KEY,
    from: "alerts@mail.example.com",
    to: TO,
  }

  it("delivers the failed stage from the record to the provider", async () => {
    const api = await collector(200, { id: "email_1" })
    await expect(
      notifyReleaseFailure({
        environment: RUN,
        readRecord: async () =>
          record({ migration: "succeeded", deployment: "failed" }),
        notifier: () =>
          createResendEmailNotifier(config, { endpoint: api.endpoint }),
      })
    ).resolves.toEqual({ status: "accepted", stage: "deployment" })
    expect(api.captured).toHaveLength(1)
    expect(api.captured[0].headers["idempotency-key"]).toBe(
      "release_failed/michi-guns/nextjs-todo-list-example/4242/2"
    )
    expect(JSON.parse(api.captured[0].body).subject).toBe(
      "Production release failed: deployment (0123456789ab)"
    )
  })

  it("reports a provider refusal as a safe secondary notice", async () => {
    const api = await collector(403, { message: `bad key ${KEY}` })
    const outcome = await notifyReleaseFailure({
      environment: RUN,
      readRecord: async () => {
        throw new Error("ENOENT")
      },
      notifier: () =>
        createResendEmailNotifier(config, { endpoint: api.endpoint }),
    })
    expect(outcome).toEqual({ status: "not_sent", reason: "rejected" })
    expect(JSON.parse(api.captured[0].body).subject).toContain("unknown")
  })

  it("does not contact the provider when no alert is needed or the run is untrusted", async () => {
    const notifier = vi.fn()
    await expect(
      notifyReleaseFailure({
        environment: RUN,
        readRecord: async () =>
          record({ preflight: "failed" }, { result: "failed" }),
        notifier,
      })
    ).resolves.toEqual({ status: "not_needed" })
    await expect(
      notifyReleaseFailure({
        environment: { ...RUN, GITHUB_RUN_ID: "not-a-run" },
        readRecord: async () => record({ migration: "failed" }),
        notifier,
      })
    ).resolves.toEqual({ status: "not_sent", reason: "untrusted_run" })
    expect(notifier).not.toHaveBeenCalled()
  })
})

describe("TST-ALERTS-001 runner command", () => {
  function invoke(extra: Record<string, string>) {
    const dir = mkdtempSync(join(tmpdir(), "notify-"))
    return {
      dir,
      run: (recordValue?: unknown) => {
        if (recordValue !== undefined)
          writeFileSync(
            join(dir, "production-release-record.json"),
            JSON.stringify(recordValue)
          )
        return spawnSync(
          process.execPath,
          ["--import", "tsx", "scripts/deploy/production/notify.ts"],
          {
            // No inherited secrets: only what the protected step would get.
            env: {
              PATH: process.env.PATH ?? "",
              SystemRoot: process.env.SystemRoot ?? "",
              NODE_ENV: "test",
              RUNNER_TEMP: dir,
              ...RUN,
              ...extra,
            },
            encoding: "utf8",
            timeout: 20_000,
          }
        )
      },
    }
  }

  it("exits cleanly without a provider call when the record shows no alert is needed", () => {
    const result = invoke({}).run(record({ preflight: "failed" }))
    expect(result.status).toBe(0)
    expect(result.stdout).toContain("No release-failure alert needed")
  })

  it("fails its own step with a safe notice when configuration is missing", () => {
    const result = invoke({
      RESEND_API_KEY: KEY,
      RELEASE_ALERT_EMAIL: "x",
    }).run(record({ migration: "failed" }))
    expect(result.status).toBe(1)
    expect(result.stdout.trim()).toBe(
      "::error title=Release-failure alert not sent::not_configured"
    )
    expect(result.stdout + result.stderr).not.toContain(KEY)
  })

  it("imports no application, database or auth-mail module", () => {
    for (const file of [
      "scripts/deploy/production/notify.ts",
      "scripts/deploy/production/notify-core.ts",
      "src/shared/operational-alerts/resend-email.ts",
      "src/shared/operational-alerts/contracts.ts",
    ]) {
      const imports = [
        ...readFileSync(file, "utf8").matchAll(/from "([^"]+)"/g),
      ].map((match) => match[1])
      for (const specifier of imports)
        expect(specifier).toMatch(
          /^(zod|node:[\w/]+|\.\/[\w-]+|\.\.\/\.\.\/\.\.\/src\/shared\/operational-alerts\/[\w-]+)$/
        )
    }
  })
})
