import { describe, expect, it } from "vitest"

import { parseEnvironmentProfile } from "../../environment/core"
import { parseRuntimeEnvironment } from "../../../src/shared/environment/runtime"
import { previewSeedEnvironment } from "./seed"

/** The Preview workflow's fixed job env: no per-preview branch or URLs. */
const WORKFLOW_ENV = {
  APP_ENV: "preview",
  NODE_ENV: "production",
  BETTER_AUTH_URL: "https://preview.example.test",
  BETTER_AUTH_SECRET: "preview-seed-secret",
  DATABASE_PROVIDER: "neon",
  DATABASE_PROJECT_ID: "curly-dust-60603928",
  NEXT_PUBLIC_SANITY_PROJECT_ID: "project-id",
  NEXT_PUBLIC_SANITY_DATASET: "preview",
  NEXT_PUBLIC_SANITY_API_VERSION: "2026-08-27",
  SANITY_WRITE_POLICY: "read-only",
  APP_MAIL_TRANSPORT: "controlled-account",
  DEPLOYMENT_OWNER: "github",
  SECRET_NAMESPACE: "preview",
}

describe("TST-RUNTIME-001 Preview seed runtime environment", () => {
  it("lets the seed's auth/database imports pass the runtime gate", () => {
    // What the delivery adapter observes for one preview branch.
    const profile = parseEnvironmentProfile({
      ...WORKFLOW_ENV,
      DATABASE_BRANCH: "preview-pr-42",
      DATABASE_URL:
        "postgresql://app:pw@ep-quiet-sun-123456-pooler.eu-central-1.aws.neon.tech/todo",
      DATABASE_URL_UNPOOLED:
        "postgresql://app:pw@ep-quiet-sun-123456.eu-central-1.aws.neon.tech/todo",
    })
    const seeded: Record<string, string | undefined> = { ...WORKFLOW_ENV }
    for (const [key, value] of Object.entries(previewSeedEnvironment(profile)))
      if (value === undefined) delete seeded[key]
      else seeded[key] = value

    expect(parseRuntimeEnvironment(seeded)).toMatchObject({
      profile: "preview",
      target: { projectId: "curly-dust-60603928", branch: "preview-pr-42" },
    })
    // The previous seed applied only the URL and auth values.
    expect(() =>
      parseRuntimeEnvironment({
        ...WORKFLOW_ENV,
        DATABASE_URL: profile.database.runtimeUrl,
      })
    ).toThrow("DATABASE_BRANCH is required")
  })
})
