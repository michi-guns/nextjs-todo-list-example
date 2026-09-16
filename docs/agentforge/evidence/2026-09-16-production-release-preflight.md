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
  eight mail/profile variables at this checkpoint. No Preview credentials
  were copied.
- `pnpm sanity:smoke` passed through the real query/client/mapper, returning
  the four expected landing view-model fields. This does not prove a
  deployed webhook or browser path.

## Credential blocker

Creating a separate project-scoped Vercel token through the authenticated
CLI's documented `POST /v3/user/tokens` returned
`403: Cannot create tokens for this app.` The token inventory confirmed no
new token was created; GitHub still has no Production `VERCEL_TOKEN`.
The CLI's existing OAuth login is usable for project reads but cannot mint
the release credential.

The logged-in browser's normal token form supports the exact project scope.
The form is prepared with name `nextjs-todo-production-github`, project
`nextjs-todo-list-example`, expiration 180 days. It has **not** been submitted.
The browser tool requires confirmation at the action that creates persistent
security-sensitive access; the owner has been asked to approve creation and
storage as GitHub Environment `production` secret `VERCEL_TOKEN`.
No token value has been printed or committed.

After that action, finish the remaining scoped Production configuration and
recheck the complete profile before executable implementation. Real migration,
deployment and deployed webhook evidence retain their own concrete approval
and verification requirements.

## Scope and sources

The [T-23 plan](../plans/2026-09-16-t-23-production-release.md) maps work and
checks. T-23 remains open; `TST-RELEASE-001` has no executable release
evidence and is blocked at the named credential prerequisite. The
environment/pipeline contracts retain their existing partial evidence.

- [Vercel token creation API](https://vercel.com/docs/rest-api/authentication/create-an-auth-token):
  the documented request supports a project id and expiration; actual CLI
  access was refused.
- [Neon organization keys](https://neon.com/docs/manage/orgs-api):
  project-scoped keys are available for the later provider observation step.
