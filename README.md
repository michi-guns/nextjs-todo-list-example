# Next.js Todo List Example

This repository is a standalone, opinionated Next.js starter with a complete
authenticated todo reference application. PostgreSQL and Drizzle own auth and
todo data. Sanity owns the public landing copy. A derived application should be
able to replace the domain and UI while keeping the cross-cutting foundations.

The canonical product and technical contracts live in [`.dwf/`](.dwf/). The
[documentation index](docs/index.md) links to the supporting architecture,
data, testing, and AgentForge material.

## Quick start

### Prerequisites

- Node.js and pnpm matching the repository toolchain.
- A reachable PostgreSQL 18 database for the application. Use a local database
  or a non-default Neon development branch. Do not use a production database
  for local work.
- Docker for `pnpm test:integration` and `pnpm test:e2e`.
- A configured Sanity project and published landing singleton for the normal
  landing page and the separate `pnpm sanity:smoke` check.

### Install and configure

```powershell
pnpm install
```

Create an ignored `.env.local` with values appropriate for your environment.
This is a shape, not a credential source. Replace every placeholder locally
and never commit the file. The complete profile matrix and hosted boundaries are
in the [environment profiles runbook](docs/runbooks/environment-profiles.md).

```dotenv
APP_ENV=local
NODE_ENV=development

# Application database. The app uses DATABASE_URL.
DATABASE_PROVIDER=local-postgres
DATABASE_URL=postgresql://user:password@localhost:5432/todo

# Direct connection for Drizzle migrations. For Neon, use the non-default
# development branch. It may be omitted when DATABASE_URL is direct local.
DATABASE_URL_UNPOOLED=postgresql://user:password@localhost:5432/todo

BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=replace-with-a-local-random-value

# Public Sanity project settings used by the landing page and Studio.
NEXT_PUBLIC_SANITY_PROJECT_ID=replace-with-your-project-id
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2026-08-27

# Server-only secrets for the Sanity webhook and manual recovery route.
SANITY_REVALIDATE_SECRET=replace-with-a-webhook-secret
SANITY_MANUAL_RECOVERY_SECRET=replace-with-an-operator-secret
SANITY_WRITE_POLICY=local-recovery

# Required for local/test auth-link flows. Captures verification and magic links.
APP_MAIL_TRANSPORT=local-mailbox
BETTER_AUTH_LOCAL_MAILBOX=true

DEPLOYMENT_OWNER=local
SECRET_NAMESPACE=local
# Optional location under the OS temp directory or ignored project directory.
BETTER_AUTH_MAILBOX_DIR=.local/better-auth-mailbox
```

The application reads `DATABASE_URL`, `BETTER_AUTH_URL`, and
`BETTER_AUTH_SECRET` at runtime. `DATABASE_URL_UNPOOLED` is required for Neon
migration commands and must point to the direct connection for the non-default
development branch. Keep the pooled Neon URL in `DATABASE_URL` for app traffic.
When `DATABASE_URL_UNPOOLED` is absent, Drizzle falls back to `DATABASE_URL`.
Rely on that fallback only for a direct local PostgreSQL URL. The database
client uses one bounded node-postgres pool for Better Auth and todo repositories.

The normal landing path requires the configured Sanity project and dataset.
The Playwright harness is different: it supplies deterministic landing content
only while `PLAYWRIGHT_E2E=true`, so routine browser acceptance does not need
Sanity credentials or network access.

Password sign-up sends an email-verification link. In development/test, the
local mailbox captures that link when `BETTER_AUTH_LOCAL_MAILBOX=true`, and the
account must be verified before password sign-in succeeds. The same gate is
required for local magic-link sign-in because the repository's send callbacks
write both link types to that mailbox. If an unverified account consumes a
magic link first, Better Auth deliberately revokes the unproven password
credential as a pre-hijacking safeguard. Password reset/recovery is outside
the current starter baseline.

### Apply the committed schema

Inspect and apply migrations before opening the app against a new database:

```powershell
pnpm exec drizzle-kit check --config drizzle.config.ts
pnpm exec drizzle-kit migrate --config drizzle.config.ts
```

The chain contains the Better Auth foundation migration followed by the
lists/tasks migration. Each migration directory includes generated
`snapshot.json` metadata. The snapshots are checked into Git because Drizzle
uses them to compare schema history. Do not edit them by hand.

Before changing a schema, read the repository's
[`migration-history-workflow`](.agents/skills/migration-history-workflow/SKILL.md)
skill and classify every target. Consolidate unreleased history only when all
targets are safely recreatable. Once shared development or production depends
on the history, keep applied migrations immutable and add a forward migration.
The [local verification runbook](docs/runbooks/local-development-and-verification.md)
has the full command and recovery sequence.

### Run the app

```powershell
pnpm dev
```

Open `http://localhost:3000`. `pnpm build` and `pnpm start` exercise the
production build locally.

## Commands

| Command                                                                           | Purpose                                                                                                         |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                                                                        | Start the Next.js development server.                                                                           |
| `pnpm build`                                                                      | Create a production build.                                                                                      |
| `pnpm start`                                                                      | Serve the production build.                                                                                     |
| `pnpm typecheck`                                                                  | Run the TypeScript compiler without emitting files.                                                             |
| `pnpm lint`                                                                       | Run ESLint.                                                                                                     |
| `pnpm test`                                                                       | Run Docker-free Vitest unit and boundary tests.                                                                 |
| `pnpm test:integration`                                                           | Start one disposable PostgreSQL 18 Testcontainer, apply migrations, run serial integration tests, and clean up. |
| `pnpm test:e2e`                                                                   | Start the local database/server/mailbox lifecycle and run the seven Chromium journeys.                          |
| `pnpm test:e2e:cross-browser`                                                     | Opt in to the same journeys in Chromium, Firefox, and WebKit.                                                   |
| `pnpm environment:inspect`                                                        | Validate the selected profile and print redacted target diagnostics.                                            |
| `pnpm sanity:smoke`                                                               | Read, validate, and map the published Sanity landing singleton without mutating it.                             |
| `pnpm neon:performance`                                                           | Run the guarded, opt-in Neon development-branch performance evidence lane.                                      |
| `pnpm exec drizzle-kit check --config drizzle.config.ts`                          | Validate migration metadata and history.                                                                        |
| `pnpm exec drizzle-kit generate --config drizzle.config.ts --name $migrationName` | Generate a reviewed migration after an intentional schema change.                                               |
| `git diff --check`                                                                | Check changed files for whitespace errors.                                                                      |

The integration and Playwright harnesses own their `TEST_DATABASE_URL` and
never use a developer or Neon database. Unit tests remain runnable without
Docker. See [local development and verification](docs/runbooks/local-development-and-verification.md)
for copyable PowerShell examples, browser selection, and recovery guidance.

## Environment boundaries

| Variable                         | Used by                            | Notes                                                                                                                   |
| -------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                   | App runtime and migration fallback | PostgreSQL URL for the running app.                                                                                     |
| `DATABASE_URL_UNPOOLED`          | Drizzle Kit                        | Required for Neon migrations. Use a direct development-branch URL; fallback to `DATABASE_URL` is for direct local URLs. |
| `APP_ENV`                        | Environment profile parser         | Explicit application profile: `local`, `development`, `preview`, or `production`.                                       |
| `NODE_ENV`                       | Next.js and profile parser         | Runtime mode only: `development`, `test`, or `production`; it does not select a database target.                        |
| `DATABASE_PROVIDER`              | Environment profile parser         | `local-postgres` for Local; `neon` for Development, Preview, and Production.                                            |
| `DATABASE_PROJECT_ID`            | Environment profile parser         | Expected Neon project identity for remote profiles.                                                                     |
| `DATABASE_BRANCH`                | Environment profile parser         | Expected Neon branch identity for remote profiles.                                                                      |
| `BETTER_AUTH_URL`                | Better Auth                        | Canonical local/deployed auth origin.                                                                                   |
| `BETTER_AUTH_SECRET`             | Better Auth                        | Keep private. Required for every explicit environment profile.                                                          |
| `BETTER_AUTH_LOCAL_MAILBOX`      | Local/test auth links              | Required for local auth-link flows; must be `true` and only works in development/test.                                  |
| `BETTER_AUTH_MAILBOX_DIR`        | Local/test auth links              | Optional path under the OS temp directory or ignored `.local/better-auth-mailbox`.                                      |
| `NEXT_PUBLIC_SANITY_PROJECT_ID`  | Sanity client and Studio           | Public project identifier.                                                                                              |
| `NEXT_PUBLIC_SANITY_DATASET`     | Sanity client and Studio           | Published dataset name.                                                                                                 |
| `NEXT_PUBLIC_SANITY_API_VERSION` | Sanity client and Studio           | Optional API version; the code has a current default.                                                                   |
| `SANITY_WRITE_POLICY`            | Environment profile parser         | `read-only`, `local-recovery`, or `production-recovery`, matching the selected profile.                                 |
| `SANITY_REVALIDATE_SECRET`       | Sanity webhook route               | Server-only webhook secret.                                                                                             |
| `SANITY_MANUAL_RECOVERY_SECRET`  | Sanity recovery route              | Server-only operator secret.                                                                                            |
| `APP_MAIL_TRANSPORT`             | Environment profile parser         | Local mailbox, controlled account, or remote provider policy.                                                           |
| `APP_MAIL_PROVIDER`              | Environment profile parser         | Safe provider-name metadata for the remote transport.                                                                   |
| `DEPLOYMENT_OWNER`               | Environment profile parser         | `local`, `github`, or `vercel`, constrained by profile.                                                                 |
| `SECRET_NAMESPACE`               | Environment profile parser         | Profile-scoped secret namespace; never a secret value.                                                                  |

Do not commit `.env*`, credentials, tokens, captured URLs, mailbox files, or
generated test reports. The normal Playwright command sets its own temporary
database, mailbox, auth secret, and `PLAYWRIGHT_E2E` flag. It does not reuse an
unknown server on port `3100`.

## Architecture and recovery

The application is a domain-centered modular monolith. `src/modules/auth`,
`landing`, `lists`, and `tasks` own their capabilities. Root `db/` and
`migrations/` own PostgreSQL/Drizzle infrastructure. `app/` composes Next.js
routes and pages. Sanity content stays inside the landing infrastructure and
never owns todo data.

- [System in five minutes](docs/handbook/system-in-five-minutes.md)
- [Architecture overview](docs/architecture/overview.md)
- [PostgreSQL and Drizzle](docs/data/postgresql.md)
- [Testing strategy](docs/architecture/testing-strategy.md)
- [Failed database migration runbook](docs/runbooks/failed-database-migration.md)
- [Sanity integration failure runbook](docs/runbooks/sanity-integration-failure.md)
- [Local development and verification runbook](docs/runbooks/local-development-and-verification.md)

## Adding components

To add a shadcn component:

```powershell
pnpm dlx shadcn@latest add button
```

This places the component in `components/ui`. Import it with the repository
alias:

```tsx
import { Button } from "@/components/ui/button"
```
