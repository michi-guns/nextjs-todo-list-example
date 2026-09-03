import type { EnvironmentProfile } from "../../environment/core"
import { PreviewDeliveryError, runPreviewProcess } from "./core"

export async function deployPreview(input: {
  readonly profile: EnvironmentProfile
  readonly commitSha: string
  readonly previewId: string
}): Promise<{ readonly url: string; readonly deploymentId: string }> {
  const token = process.env.VERCEL_TOKEN?.trim()
  if (!token) {
    throw new PreviewDeliveryError(
      "cli_unavailable",
      "VERCEL_TOKEN is required to deploy a Preview"
    )
  }

  const envArgs = runtimeEnvArgs(
    input.profile,
    input.commitSha,
    input.previewId
  )
  const output = await runPreviewProcess("vercel", [
    "deploy",
    "--yes",
    "--token",
    token,
    "--meta",
    `previewId=${input.previewId}`,
    "--meta",
    `commitSha=${input.commitSha}`,
    ...envArgs,
  ])
  const url = readDeploymentUrl(output)
  const deploymentId = await readDeploymentId(token, url)
  return { url, deploymentId }
}

function runtimeEnvArgs(
  profile: EnvironmentProfile,
  commitSha: string,
  previewId: string
): string[] {
  const values: Record<string, string> = {
    APP_ENV: "preview",
    NODE_ENV: "production",
    BETTER_AUTH_URL: profile.betterAuth.url,
    BETTER_AUTH_SECRET: profile.betterAuth.secret,
    DATABASE_PROVIDER: "neon",
    DATABASE_PROJECT_ID: profile.database.projectId ?? "",
    DATABASE_BRANCH: profile.database.branch ?? "",
    DATABASE_URL: profile.database.runtimeUrl,
    DATABASE_URL_UNPOOLED: profile.database.migrationUrl,
    NEXT_PUBLIC_SANITY_PROJECT_ID: profile.sanity.projectId,
    NEXT_PUBLIC_SANITY_DATASET: "preview",
    NEXT_PUBLIC_SANITY_API_VERSION: profile.sanity.apiVersion,
    SANITY_WRITE_POLICY: "read-only",
    APP_MAIL_TRANSPORT: "controlled-account",
    DEPLOYMENT_OWNER: "vercel",
    SECRET_NAMESPACE: "preview",
    PREVIEW_ID: previewId,
    PREVIEW_COMMIT_SHA: commitSha,
  }

  const args: string[] = []
  for (const [key, value] of Object.entries(values)) {
    if (!value) continue
    args.push("--env", `${key}=${value}`, "--build-env", `${key}=${value}`)
  }
  return args
}

function readDeploymentUrl(output: string): string {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const url = [...lines].reverse().find((line) => /^https:\/\//.test(line))
  if (!url) {
    throw new PreviewDeliveryError(
      "command_failed",
      "Vercel deploy did not print a Preview URL"
    )
  }
  return url
}

async function readDeploymentId(token: string, url: string): Promise<string> {
  const output = await runPreviewProcess("vercel", [
    "inspect",
    url,
    "--token",
    token,
  ])
  const match = output.match(/\bdpl_[A-Za-z0-9]+\b/)
  if (!match) {
    throw new PreviewDeliveryError(
      "command_failed",
      "Vercel inspect did not include a deployment id"
    )
  }
  return match[0]
}
