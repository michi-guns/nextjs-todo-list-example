import { z } from "zod"
import type { ResolvedDeliveryRef } from "../../environment/guards"
import { runReleaseProcess } from "./process"

const shaPattern = /^[0-9a-f]{40}$/i
const tagPattern = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/
type Run = typeof runReleaseProcess

export async function resolveReleaseRef(
  requestedRef: string,
  run: Run = runReleaseProcess
): Promise<ResolvedDeliveryRef> {
  try {
    const kind = shaPattern.test(requestedRef) ? "commit" : "tag"
    const tag = requestedRef.replace(/^refs\/tags\//, "")
    if (
      kind === "tag" &&
      (!tagPattern.test(tag) ||
        requestedRef.startsWith("refs/heads/") ||
        /^(main|master|head|latest)$/i.test(tag) ||
        /^[0-9a-f]+$/i.test(tag) ||
        tag.includes("..") ||
        tag.endsWith("/") ||
        tag.includes("//"))
    )
      throw new Error()
    const ref = kind === "commit" ? requestedRef : `refs/tags/${tag}`
    const commitSha = (
      await run("git", ["rev-parse", "--verify", `${ref}^{commit}`])
    ).trim()
    if (!shaPattern.test(commitSha)) throw new Error()
    await run("git", ["merge-base", "--is-ancestor", commitSha, "origin/main"])
    return { requestedRef, commitSha, kind }
  } catch {
    throw new Error(
      "Release ref must resolve to a tag or full SHA in reviewed main history"
    )
  }
}

export async function assertReleaseCheckout(
  commitSha: string,
  run: Run = runReleaseProcess
): Promise<void> {
  try {
    if (!shaPattern.test(commitSha)) throw new Error()
    const head = (await run("git", ["rev-parse", "HEAD"])).trim()
    const status = (
      await run("git", ["status", "--porcelain", "--untracked-files=normal"])
    ).trim()
    if (head !== commitSha || status) throw new Error()
  } catch {
    throw new Error("Release checkout must be clean and match the selected SHA")
  }
}

const ciRunSchema = z.object({
  id: z.number().int().positive(),
  run_attempt: z.number().int().positive(),
  head_sha: z.string(),
  head_branch: z.string(),
  event: z.string(),
  status: z.string(),
  conclusion: z.string().nullable(),
  path: z.string(),
  repository: z.object({ full_name: z.string() }),
})
const jobsSchema = z.object({
  jobs: z.array(
    z.object({
      name: z.string(),
      status: z.string(),
      conclusion: z.string().nullable(),
    })
  ),
})

export interface ReleaseCiEvidence {
  readonly runId: number
  readonly runAttempt: number
  readonly commitSha: string
}

export async function requireReleaseCi(
  input: { repository: string; commitSha: string; token: string },
  request: typeof fetch = fetch
): Promise<ReleaseCiEvidence> {
  try {
    if (
      !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(input.repository) ||
      !shaPattern.test(input.commitSha) ||
      !input.token
    )
      throw new Error()
    const base = `https://api.github.com/repos/${input.repository}/actions`
    const get = async (path: string): Promise<unknown> => {
      const result = await request(base + path, {
        headers: {
          authorization: `Bearer ${input.token}`,
          accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        redirect: "error",
        signal: AbortSignal.timeout(30_000),
      })
      if (!result.ok) throw new Error()
      return result.json()
    }
    const payload = z
      .object({ workflow_runs: z.array(ciRunSchema) })
      .parse(
        await get(
          `/workflows/ci.yml/runs?head_sha=${input.commitSha}&event=push&per_page=100`
        )
      )
    // GitHub lists newest first. Never fall back to an older successful attempt.
    const run = payload.workflow_runs[0]
    if (
      !run ||
      run.head_sha !== input.commitSha ||
      run.head_branch !== "main" ||
      run.repository.full_name !== input.repository ||
      run.event !== "push" ||
      run.path !== ".github/workflows/ci.yml" ||
      run.status !== "completed" ||
      run.conclusion !== "success"
    )
      throw new Error()
    const { jobs } = jobsSchema.parse(
      await get(`/runs/${run.id}/attempts/${run.run_attempt}/jobs?per_page=100`)
    )
    for (const name of ["Quality", "Harness"]) {
      const matches = jobs.filter((job) => job.name === name)
      if (
        matches.length !== 1 ||
        matches[0].status !== "completed" ||
        matches[0].conclusion !== "success"
      )
        throw new Error()
    }
    return {
      runId: run.id,
      runAttempt: run.run_attempt,
      commitSha: input.commitSha,
    }
  } catch {
    throw new Error("Release CI verification failed")
  }
}
