# Runbook: Local development and verification

Use this runbook to set up the application, inspect the committed database
chain, and run the local acceptance checks. It describes this repository's
current starter workflow. It does not provision a production environment or
authorize changes to a shared database.

## Prerequisites

- Node.js and pnpm matching the repository toolchain.
- Docker for Local PostgreSQL, the Testcontainers-owned integration suite, and
  Playwright.
- PostgreSQL 18 for a manually run app comes from `pnpm local:postgres -- start`
  unless you already have a matching loopback database.
- Sanity project and published landing singleton values for the read-only live
  smoke.

Keep `.env.local` ignored. Use placeholders in shell history and do not paste
connection strings, auth secrets, webhook secrets, passwords, or captured
magic-link URLs into issues, logs, or commits.

## First-time setup

Install dependencies and create the local environment file described in the
[README](../../README.md#install-and-configure):

```powershell
pnpm install
```

For a manually run app, set `DATABASE_URL` and `DATABASE_URL_UNPOOLED` to
`postgresql://todo:todo-local@127.0.0.1:5432/todo`, the Local Docker target, and set
`BETTER_AUTH_URL` to the app origin. Set `BETTER_AUTH_SECRET` to a local
random value. Normal landing requests also need
`NEXT_PUBLIC_SANITY_PROJECT_ID` and `NEXT_PUBLIC_SANITY_DATASET`.

Set `BETTER_AUTH_LOCAL_MAILBOX=true` for local auth-link flows. The current
Better Auth send callbacks write both verification and magic-link URLs to the
mailbox, so those flows fail when the gate is disabled. The switch works only
in development/test. `BETTER_AUTH_MAILBOX_DIR` is optional and may point below
the OS temporary directory or the ignored `.local/better-auth-mailbox` path.
The Playwright harness sets its own temporary mailbox and does not reuse this
directory.

## Local Docker PostgreSQL

Start the persistent loopback PostgreSQL 18 container, apply the committed
migrations, and load the synthetic local user:

```powershell
pnpm local:postgres -- start
pnpm local:postgres -- migrate
pnpm local:postgres -- seed
pnpm dev:local
```

`pnpm dev:local` is start, readiness, migrate, then `pnpm dev`. It does not
seed. The container keeps running after you stop the Next.js process.
`pnpm local:postgres -- stop` keeps the volume.
`pnpm local:postgres -- reset` deletes only this Compose volume after the
command proves the configured URL is `127.0.0.1:5432/todo`. A Neon URL, a
different local port, or a missing Local profile fails before Docker volumes
are removed.

If start, migrate, or seed fails, the container is left in place so you can
fix the cause and retry the failed command. Do not point these commands at
Neon or Vercel.

After seeding, sign in as `local-dev@example.test` with
`Local-dev-password-123!`. Landing content still comes from hosted Sanity.

Integration and Playwright suites keep their own disposable Testcontainers
databases. They do not use this Compose volume.

## Application commands

Start the development server after applying the schema:

```powershell
pnpm dev
```

Use these commands to inspect the application build without changing the
database:

```powershell
pnpm typecheck
pnpm lint
pnpm build
pnpm start
```

## Migration workflow

`migrations/` is the versioned Drizzle source of truth. The current fresh
database chain is ordered by directory name:

1. Better Auth tables and the original scaffold foundation.
2. Lists, tasks, native UUIDv7 keys, constraints, indexes, and removal of the
   example posts table.

Each directory contains generated `snapshot.json` metadata. Commit the
metadata with its migration. Drizzle uses it to compare schema state; do not
edit it manually.

The Drizzle config loads `.env.local` and prefers `DATABASE_URL_UNPOOLED`, then
falls back to `DATABASE_URL`. The fallback is safe for a direct local
PostgreSQL URL. For Neon, set `DATABASE_URL_UNPOOLED` to the direct connection
for the non-default development branch. Keep the pooled application URL in
`DATABASE_URL`; never run Neon migrations through that pooled URL. Check the
chain before applying it:

```powershell
pnpm exec drizzle-kit check --config drizzle.config.ts
pnpm exec drizzle-kit generate --config drizzle.config.ts --explain --output text
```

Apply the committed chain to the configured migration target only after
checking the target and the SQL:

```powershell
pnpm exec drizzle-kit migrate --config drizzle.config.ts
```

To create a migration after an intentional schema change, read the repository
[`migration-history-workflow`](../../.agents/skills/migration-history-workflow/SKILL.md)
skill first. Classify every target as scaffolding-only, shared development,
production, or unknown. In a safely recreatable pre-release project, combine
unreleased changes into one coherent migration and regenerate its snapshots.
Once shared development, production, non-disposable data, or real users depend
on the history, keep applied files immutable and add the smallest forward
migration. An unknown or contradictory target is a stop condition, not a
reason to guess.

Generate a reviewed migration with an explicit name:

```powershell
$migrationName = "describe-the-intent"
pnpm exec drizzle-kit generate --config drizzle.config.ts --name $migrationName
```

Inspect the generated SQL and snapshot before committing. `drizzle-kit push`
may help with local exploration, but it is not migration verification. Schema
changes still follow the non-default Neon development-branch check before any
promotion to a default or production target. Do not use routine integration
or Playwright test commands against a Neon URL.

If a migration fails, stop and use the [failed migration runbook](./failed-database-migration.md).
Do not delete or rewrite applied history to make a failure disappear. For a
fresh Testcontainers database, rerun the harness after correcting the reviewed
chain. For a shared target, preserve the evidence and choose a corrective
forward migration through the branch-first workflow.

## Test commands

The regular Vitest suite is Docker-free:

```powershell
pnpm test
```

The integration suite starts one disposable `postgres:18-alpine` container,
applies every committed migration, injects its local URL as `TEST_DATABASE_URL`,
runs the integration files serially, and stops the container on success or
failure:

```powershell
pnpm test:integration
```

Do not set `TEST_DATABASE_URL` to Neon or a developer database. The harness
rejects non-local URLs before destructive schema cleanup. If Docker is not
running, this suite must fail clearly; do not replace it with a weaker mock.

The normal browser suite owns its own database, deterministic behavior seed,
temporary auth-link mailbox, and dedicated Next.js server on
`http://127.0.0.1:3100`:

```powershell
pnpm test:e2e
```

It runs the seven required journeys serially in Chromium. The server receives
`PLAYWRIGHT_E2E=true`, so the landing reader uses deterministic local content
for this run only. The normal Sanity path and deployed runtime do not use that
fixture. Setup refuses an occupied port instead of reusing an unknown server.

Pushes and pull requests to `main` run these same local commands in
[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml). Quality is
Docker-free. Harness needs Docker and Chromium. The workflow does not deploy,
create Preview branches, mutate Sanity, or read Production secrets. Do not
point CI at Neon. `pnpm sanity:smoke` and `pnpm neon:performance` stay outside
that automatic job.

Firefox and WebKit are opt-in. Run them only when those browser binaries are
installed or before a release/major UI change:

```powershell
pnpm test:e2e:cross-browser
```

To inspect the selected project list without running the suite:

```powershell
$env:PLAYWRIGHT_CROSS_BROWSER = "true"
pnpm exec playwright test --list
Remove-Item Env:PLAYWRIGHT_CROSS_BROWSER
```

The optional project-selection check is not a substitute for the required
Chromium run. Browser traces and reports stay in ignored paths.

## Sanity smoke and recovery

Run the separate read-only Sanity smoke against the configured published
singleton:

```powershell
pnpm sanity:smoke
```

It uses the real Sanity client, validates the unknown payload, maps the landing
view model, and never creates or edits content. Missing configuration, missing
content, query failures, validation failures, and mapping failures are errors.
Use the [Sanity integration failure runbook](./sanity-integration-failure.md)
for provider checks and cache recovery.

The webhook route is `POST /api/sanity/webhook`. It verifies the
`SANITY_REVALIDATE_SECRET` and Sanity signature, then accepts only relevant
published landing events. The protected manual route is
`POST /api/sanity/recover` and uses
`Authorization: Bearer <SANITY_MANUAL_RECOVERY_SECRET>`. Never put either
secret in a client bundle or log the header.

For a stale cache in an authorized local operator session, keep the secret in
the process environment and call the route without printing it:

```powershell
$recoveryHeaders = @{
  Authorization = "Bearer $env:SANITY_MANUAL_RECOVERY_SECRET"
}
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/sanity/recover" -Headers $recoveryHeaders
```

If the landing still fails, stop and follow the Sanity runbook. Do not turn the
Playwright fixture into a permanent fallback.

## Completion evidence

For a task that changes this repository, record the exact commands and results
in the delivery task and reconcile the affected `TST-*` contracts in
[`TESTING.md`](../../.dwf/decisions/TESTING.md). At minimum, the final local
gate is:

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm exec drizzle-kit check --config drizzle.config.ts
pnpm build
git diff --check
```

Run `pnpm exec prettier --check` for the changed files. Record the existing
`app/layout.tsx:1:10` unused `Geist` warning separately if it remains the only
lint warning. Run `pnpm sanity:smoke` separately before claiming the starter
baseline complete. If the configured Sanity project or published singleton is
unavailable, record that smoke as blocked or unexecuted. Keep optional
cross-browser execution, deployed webhook delivery, Neon development-branch
migration smoke, and any unobserved Docker outage evidence clearly marked
instead of claiming they passed.
