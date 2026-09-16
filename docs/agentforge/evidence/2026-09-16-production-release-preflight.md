# T-23 Production release preflight — 2026-09-16

This is prerequisite evidence, not a release. T-23 executable implementation
has not started. The owner authorized autonomous work and reviewed PR merges;
Production approval and destructive-operation checkpoints remain.

## Completed mail prerequisite

PR [35](https://github.com/michi-guns/nextjs-todo-list-example/pull/35) added the
protected mail check. Run [35103297897](https://github.com/michi-guns/nextjs-todo-list-example/actions/runs/35103297897)
passed after required reviewer approval. PR [36](https://github.com/michi-guns/nextjs-todo-list-example/pull/36)
closed T-21.5 and persisted autonomous merge authorization after independent
review of `93e280b5a79f95b90b880422f1db26b1ba6dff9d` and successful
[Quality/Harness CI](https://github.com/michi-guns/nextjs-todo-list-example/actions/runs/35104876667).
Its merge commit is `ad16b60209863ad36dfcecbb3be6de1fc7569bb8`.

## Read-only observations

- Installed pnpm/dependencies, Docker server 29.7.2, GitHub administrator
  access, Neon CLI access and Vercel CLI access are available.
- Neon project `jolly-dew-32309276`
  (`nextjs-todo-list-example-production`), region `aws-us-east-2`,
  branch `br-purple-sea-a53v962l` named `main`, database `neondb`,
  owner role `neondb_owner` match the accepted target.
- A transaction explicitly opened with `BEGIN READ ONLY` returned
  PostgreSQL `18.6 (2078fcb)`, zero public base tables and no
  `drizzle.__drizzle_migrations` journal; it ended with `ROLLBACK`.
  No DDL, DML, seed, migration or reset was issued.
- Vercel project `prj_v45MdKyM0g9PVTXUQB1PznfgyMI6` under team
  `team_6D5hN9OejSRMxW95pXPiDFI2` matches the local project link.
  Production still points to placeholder
  `dpl_GRpcAgtr9BZ7QcsUNHX259WAvLin`. No Git repository link is active.
- The canonical origin is
  `https://nextjs-todo-list-example.vercel.app`. The project's environment
  variable inventory was empty.
- GitHub `production` contains only the existing `RESEND_API_KEY` and
  seven mail/profile variables at this initial checkpoint. No Preview credentials
  were copied.
- `pnpm sanity:smoke` passed through the real query/client/mapper, returning
  the four expected landing view-model fields. This does not prove a
  deployed webhook or browser path.

## Credential blocker and resolution

Creating a separate project-scoped Vercel token through the authenticated
CLI's documented `POST /v3/user/tokens` returned
`403: Cannot create tokens for this app.` The token inventory confirmed no
new token was created by those failed requests.
The CLI's existing OAuth login is usable for project reads but cannot mint
the release credential.

The owner explicitly approved creation through the browser and storage in
GitHub `production`. The token `nextjs-todo-production-github` was created
with the form's exact `nextjs-todo-list-example` project scope and 180-day
expiration (2027-03-15). Its value was transferred directly between the
visible Vercel result and GitHub's secret form without printing it.
GitHub confirms `VERCEL_TOKEN` stored at `2026-09-16T14:05:45Z`.

The remaining prerequisite configuration then completed:

- Neon key id `3341780`, named `nextjs-todo-production-github`, is restricted
  to `jolly-dew-32309276` and stored as the protected `NEON_API_KEY`. Neon
  project keys can mutate that project; they cannot access another project.
- The correlated direct and pooled URLs, distinct randomly generated
  `BETTER_AUTH_SECRET`, `SANITY_REVALIDATE_SECRET` and
  `SANITY_MANUAL_RECOVERY_SECRET` were stored only in GitHub `production`.
- Non-secret target, origin, Sanity and Vercel variables were added there.
  Existing mail variables matched and were preserved; `RESEND_API_KEY`
  retains its original 2026-09-05 timestamp. Preview credentials were not used.
- `parseEnvironmentProfile` accepted the complete configuration in the
  provisioning process and `inspectEnvironment` emitted a safe projection.
  Its mail key came from the already configured local provider setup; this
  does not yet prove the newly stored settings inside a protected runner.
- Sanity webhook `2rW5R84M7YqsOaw7`, name
  `nextjs-todo-production-landing`, was created for the published
  `production` dataset and canonical `/api/sanity/webhook` endpoint. It
  signs only matching `landingPage` document events, projects `{_id, _type}`,
  and excludes drafts/version documents. No content was changed and no
  delivery to the not-yet-deployed endpoint was triggered.

The prerequisite blocker is resolved. Protected-run profile validation,
real migration, deployment and real webhook delivery remain implementation
and hosted verification obligations. No Production schema or application
deployment was changed during this setup.

## Scope and sources

The [T-23 plan](../plans/2026-09-16-t-23-production-release.md) maps work and
checks. T-23 remains open; `TST-RELEASE-001` has no executable release
evidence and is now `in_progress` after prerequisite setup. The
environment/pipeline contracts retain their existing partial evidence.

- [Vercel token creation API](https://vercel.com/docs/rest-api/authentication/create-an-auth-token):
  the documented request supports a project id and expiration; actual CLI
  access was refused.
- [Neon organization keys](https://neon.com/docs/manage/orgs-api):
  project-scoped keys are available for the later provider observation step.
