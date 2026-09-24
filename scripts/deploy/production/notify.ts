// Protected-runner entry: `pnpm exec tsx scripts/deploy/production/notify.ts`.
// The workflow runs it only when the release step itself failed.
import { readFile } from "node:fs/promises"
import { join } from "node:path"

import {
  createResendEmailNotifier,
  readResendAlertConfig,
} from "../../../src/shared/operational-alerts/resend-email"
import { notifyReleaseFailure } from "./notify-core"

const outcome = await notifyReleaseFailure({
  environment: process.env,
  readRecord: async () =>
    JSON.parse(
      await readFile(
        join(process.env.RUNNER_TEMP ?? "", "production-release-record.json"),
        "utf8"
      )
    ),
  notifier: () => createResendEmailNotifier(readResendAlertConfig(process.env)),
})

if (outcome.status === "accepted") {
  console.log(
    `Release-failure alert accepted by the provider (stage: ${outcome.stage}); acceptance is not receipt.`
  )
} else if (outcome.status === "not_needed") {
  console.log("No release-failure alert needed for this run.")
} else {
  // Secondary notice only: the release step already failed this job.
  console.log(`::error title=Release-failure alert not sent::${outcome.reason}`)
  process.exitCode = 1
}
