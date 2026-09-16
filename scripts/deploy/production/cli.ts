import { appendFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { z } from "zod"
import { parseDeliveryArguments } from "../../environment/core"
import { runProductionRelease, type ReleaseInput } from "./core"
import { requireReleaseCi, resolveReleaseRef } from "./ref"
import { createProductionRuntime } from "./runtime"

const sha = z.string().regex(/^[0-9a-f]{40}$/i)
const integer = z.coerce.number().int().positive()

try {
  const [command, ...args] = process.argv.slice(2).filter((arg) => arg !== "--")
  if (command === "resolve") {
    const parsed = parseDeliveryArguments(["production", ...args])
    const ref = await resolveReleaseRef(parsed.ref)
    const ci = await requireReleaseCi({
      repository: process.env.GITHUB_REPOSITORY ?? "",
      commitSha: ref.commitSha,
      token: process.env.GITHUB_TOKEN ?? "",
    })
    const evidence = { ...ref, ciRunId: ci.runId, ciRunAttempt: ci.runAttempt }
    if (process.env.GITHUB_OUTPUT) {
      await appendFile(
        process.env.GITHUB_OUTPUT,
        Object.entries(evidence)
          .map(([key, value]) => `${key}=${value}\n`)
          .join("")
      )
    }
    console.log(JSON.stringify(evidence))
  } else if (command === "release" && args.length === 0) {
    if (
      process.env.GITHUB_ACTIONS !== "true" ||
      process.env.GITHUB_REF !== "refs/heads/main" ||
      !process.env.RUNNER_TEMP
    )
      throw new Error()
    const commitSha = sha.parse(process.env.RELEASE_COMMIT_SHA)
    const requested = parseDeliveryArguments([
      "production",
      "--ref",
      process.env.RELEASE_REQUESTED_REF ?? "",
    ])
    const input: ReleaseInput = {
      ref: {
        requestedRef: requested.ref,
        commitSha,
        kind: z.enum(["tag", "commit"]).parse(process.env.RELEASE_REF_KIND),
      },
      ci: {
        commitSha,
        runId: integer.parse(process.env.RELEASE_CI_RUN_ID),
        runAttempt: integer.parse(process.env.RELEASE_CI_RUN_ATTEMPT),
      },
      approvedSha: sha.parse(process.env.RELEASE_APPROVED_SHA),
      rollbackCompatible: process.env.RELEASE_ROLLBACK_COMPATIBLE === "true",
      actor: z
        .string()
        .regex(/^[A-Za-z0-9_-]+(?:\[bot\])?$/)
        .parse(process.env.GITHUB_ACTOR),
      workflowRunId: z.string().regex(/^\d+$/).parse(process.env.GITHUB_RUN_ID),
    }
    const recordPath = join(
      process.env.RUNNER_TEMP,
      "production-release-record.json"
    )
    let record
    try {
      record = await runProductionRelease(
        input,
        process.env,
        createProductionRuntime(process.env)
      )
    } catch {
      record = {
        ref: input.ref,
        ci: input.ci,
        actor: input.actor,
        workflowRunId: input.workflowRunId,
        result: "failed",
        stages: {
          preflight: "failed",
          migration: "not_started",
          deployment: "not_started",
          smoke: "not_started",
        },
        finishedAt: new Date().toISOString(),
      }
    }
    const serialized = JSON.stringify(record, null, 2)
    await writeFile(recordPath, serialized + "\n", { flag: "wx" })
    console.log(serialized)
    if (record.result !== "succeeded") throw new Error()
  } else throw new Error()
} catch {
  console.error(
    "Production release command refused or failed; inspect the safe release record when available"
  )
  process.exitCode = 1
}
