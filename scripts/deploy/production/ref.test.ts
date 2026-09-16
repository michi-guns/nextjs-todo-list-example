import { execFileSync } from "node:child_process"
import { describe, expect, it, vi } from "vitest"
import { runReleaseProcess } from "./process"
import {
  assertReleaseCheckout,
  requireReleaseCi,
  resolveReleaseRef,
} from "./ref"

const sha = "a".repeat(40)
const repository = "michi-guns/nextjs-todo-list-example"
const runRecord = {
  id: 123,
  run_attempt: 1,
  head_sha: sha,
  head_branch: "main",
  event: "push",
  status: "completed",
  conclusion: "success",
  path: ".github/workflows/ci.yml",
  repository: { full_name: repository },
}
const jobs = [
  { name: "Quality", status: "completed", conclusion: "success" },
  { name: "Harness", status: "completed", conclusion: "success" },
]
const response = (value: unknown) => new Response(JSON.stringify(value))

describe("Production immutable ref boundary (TST-RELEASE-001)", () => {
  it("executes real Git commit peeling and ancestry checks", async () => {
    const main = execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim()
    // A shallow PR checkout need not contain the remote main ref. Bind the trusted
    // anchor to this checkout for the subprocess test; the next test checks
    // the production command's fully qualified remote main argument.
    const git: typeof runReleaseProcess = (command, args) =>
      runReleaseProcess(
        command,
        args.map((arg) => (arg === "refs/remotes/origin/main" ? "HEAD" : arg))
      )
    expect(await resolveReleaseRef(main, git)).toEqual({
      requestedRef: main,
      commitSha: main,
      kind: "commit",
    })
  })

  it("peels a tag through the explicit tag namespace and verifies main ancestry", async () => {
    const git = vi
      .fn()
      .mockResolvedValueOnce(sha + "\n")
      .mockResolvedValueOnce("")
    expect(await resolveReleaseRef("v1.2.3", git)).toEqual({
      requestedRef: "v1.2.3",
      commitSha: sha,
      kind: "tag",
    })
    expect(git.mock.calls).toEqual([
      ["git", ["rev-parse", "--verify", "refs/tags/v1.2.3^{commit}"]],
      ["git", ["merge-base", "--is-ancestor", sha, "refs/remotes/origin/main"]],
    ])
  })

  it.each([
    "main",
    "HEAD",
    "latest",
    "refs/heads/topic",
    "--help",
    "v1;bad",
    "v1\nother",
    "a".repeat(7),
  ])(
    "refuses mutable, unsafe or abbreviated input %s before Git",
    async (ref) => {
      const git = vi.fn()
      await expect(resolveReleaseRef(ref, git)).rejects.toThrow()
      expect(git).not.toHaveBeenCalled()
    }
  )

  it("does not resolve a branch when no matching tag exists", async () => {
    const git = vi.fn().mockRejectedValue(new Error("unknown tag"))
    await expect(resolveReleaseRef("feature/topic", git)).rejects.toThrow(
      "Release ref"
    )
    expect(git).toHaveBeenCalledExactlyOnceWith("git", [
      "rev-parse",
      "--verify",
      "refs/tags/feature/topic^{commit}",
    ])
  })

  it("refuses a commit outside reviewed main history", async () => {
    const git = vi
      .fn()
      .mockResolvedValueOnce(sha)
      .mockRejectedValueOnce(new Error("not ancestor"))
    await expect(resolveReleaseRef(sha, git)).rejects.toThrow("Release ref")
  })

  it("does not trust a colliding origin/main tag as the remote main branch", async () => {
    // Git resolves refs/tags/origin/main before refs/remotes/origin/main.
    // Model an outside candidate contained only in that tag's history.
    const git = vi.fn<typeof runReleaseProcess>(async (_command, args) => {
      if (args[0] === "rev-parse") return sha
      if (args[3] === "origin/main") return ""
      throw new Error("candidate is outside refs/remotes/origin/main")
    })
    await expect(resolveReleaseRef(sha, git)).rejects.toThrow("Release ref")
  })

  it("requires the expected clean checkout before release", async () => {
    const clean = vi.fn().mockResolvedValueOnce(sha).mockResolvedValueOnce("")
    await expect(assertReleaseCheckout(sha, clean)).resolves.toBeUndefined()
    const different = vi.fn().mockResolvedValue("b".repeat(40))
    await expect(assertReleaseCheckout(sha, different)).rejects.toThrow(
      "checkout"
    )
    const dirty = vi
      .fn()
      .mockResolvedValueOnce(sha)
      .mockResolvedValueOnce(" M app/page.tsx")
    await expect(assertReleaseCheckout(sha, dirty)).rejects.toThrow("checkout")
  })
})

describe("Production exact-SHA CI gate (TST-RELEASE-001)", () => {
  it("requires the main-push CI and both jobs from that run attempt", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response({ workflow_runs: [runRecord] }))
      .mockResolvedValueOnce(response({ jobs }))
    await expect(
      requireReleaseCi(
        { repository, commitSha: sha, token: "test-token" },
        request
      )
    ).resolves.toEqual({ runId: 123, runAttempt: 1, commitSha: sha })
    expect(String(request.mock.calls[0][0])).toContain("workflows/ci.yml/runs?")
    expect(String(request.mock.calls[0][0])).toContain("head_sha=" + sha)
    expect(String(request.mock.calls[1][0])).toContain(
      "/runs/123/attempts/1/jobs"
    )
  })

  it.each([
    { head_sha: "b".repeat(40) },
    { event: "pull_request" },
    { head_branch: "topic" },
    { status: "in_progress" },
    { conclusion: "failure" },
    { path: ".github/workflows/other.yml" },
    { repository: { full_name: "other/repo" } },
  ])("rejects a mismatched or unsuccessful CI run %j", async (override) => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        response({ workflow_runs: [{ ...runRecord, ...override }] })
      )
    await expect(
      requireReleaseCi(
        { repository, commitSha: sha, token: "test-token" },
        request
      )
    ).rejects.toThrow("CI")
    expect(request).toHaveBeenCalledTimes(1)
  })

  it("does not hide a newer failed run behind older successful evidence", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      response({
        workflow_runs: [
          { ...runRecord, id: 124, conclusion: "failure" },
          runRecord,
        ],
      })
    )
    await expect(
      requireReleaseCi(
        { repository, commitSha: sha, token: "test-token" },
        request
      )
    ).rejects.toThrow("CI")
  })

  it.each([
    [jobs[0]],
    [jobs[0], { ...jobs[1], conclusion: "skipped" }],
    [jobs[0], { ...jobs[1], status: "in_progress" }],
  ])("requires both completed successful jobs", async (...candidateJobs) => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response({ workflow_runs: [runRecord] }))
      .mockResolvedValueOnce(response({ jobs: candidateJobs }))
    await expect(
      requireReleaseCi(
        { repository, commitSha: sha, token: "test-token" },
        request
      )
    ).rejects.toThrow("CI")
  })

  it("reports API failure without exposing the token or response body", async () => {
    const token = "sensitive-token"
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(token, { status: 403 }))
    await expect(
      requireReleaseCi({ repository, commitSha: sha, token }, request)
    ).rejects.toThrow(/^Release CI verification failed$/)
  })
})
