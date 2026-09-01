# Project Context

## Product intent

- The repository is an opinionated, production-minded Next.js starter implemented through a complete personal-todo reference application; it is not a toy project or temporary experiment.
- A derived application is expected to replace mostly the domain and UI while retaining or adapting cross-cutting foundations such as authentication, persistence, CMS integration, validation, testing, documentation, and local quality tooling.
- The starter deliberately presents one preferred stack and architecture rather than becoming a configurable multi-stack framework.
- Design and implementation optimize for high reusable quality without excessive build time: use the simplest robust modern approach and add complexity only when it has a clear safety, correctness, operability, maintainability, or avoided-rework payoff.

## Repository landscape

- One standalone Next.js repository uses the installed DWF candidate distribution `0.1.0-proposal.1` under `.dwf/.framework/`.
- The framework machinery is supplied and read-only during ordinary project work. Project Workspace state lives outside `.dwf/.framework/`.
- Source areas currently present include `app/`, `components/`, `db/`, `lib/`, `src/`, `e2e/`, `migrations/`, `scripts/`, and `docs/`.
- The repository now contains the runnable authenticated todo reference: `app/` composes public landing, auth, dashboard, API, and Studio routes; `src/modules/` contains auth, landing, lists, and tasks; and `components/` contains the Focus Rail UI.
- `app/page.tsx` reads the published Sanity landing singleton through the landing infrastructure boundary; `app/(app)/dashboard/page.tsx` composes the authenticated list/task application path.
- `lib/auth.ts` contains the Better Auth email/password and magic-link configuration backed by the shared Drizzle client and local/test mailbox boundary.
- `db/schema/auth.ts`, `db/schema/lists.ts`, and `db/schema/tasks.ts` contain the Better Auth and todo tables. The old `db/schema/test.ts` posts example is not part of the active application schema.
- `src/sanity/` and `src/modules/landing/infrastructure/` contain the Sanity client/configuration, validated read path, and invalidation boundary.
- `src/test/`, `scripts/playwright-local/`, and `e2e/` contain the local PostgreSQL 18 Testcontainers and dedicated Playwright lifecycle. The normal browser suite is the seven-journey Chromium todo acceptance path, not the original `playwright.dev` example.

## Technology facts

The package manifest includes Next.js, React, Better Auth, Drizzle, node-postgres, Zod, Sanity, shadcn-related UI packages, Vitest, Playwright, pnpm scripts, Husky, and lint-staged. `db/db.ts` uses the shared node-postgres Drizzle adapter and registers its bounded pool for Vercel Fluid Compute lifecycle management. Sanity is represented by the source client/configuration and landing read path. The ignored `.env.local` currently contains local application, Neon, and Sanity configuration; its `NEON_BRANCH=main` value is an observed target fact, not an approved Development or Production identity.

## Documentation facts

- Existing `docs/` contains supporting handbook, architecture, domain, data, development, runbook, and protocol material.
- Durable project decisions and open state live under `.dwf/decisions/`.
- Generated Agent/Human PRD and SPEC projections live under `.dwf/output/`.
- `.dwf/concepts/` contains derived explanations only; it does not own requirements.
- The installed `.dwf/.framework/**` is supplied DWF machinery and is not rewritten by ordinary project work; `.dwf/README.md` is project-specific Workspace orientation.

## Operational facts

- No repository-resident Delivery tree, CI workflow, Preview workflow, Production workflow, or deployment orchestration command currently exists.
- No Delivery System CLI or package script matching the supplied mental model was found in the repository; T-18.1 records the contract before T-18.2/T-18.3 introduce environment and guard commands.
- A read-only inspection verified that the workspace is linked to the `nextjs-todo-list-example` Neon project and its default `main` branch. T-01 also created the non-default Neon `development` branch for agent-owned migration smoke testing; it expires on 2026-09-02.
- The live Drizzle migration ledger contains one applied migration whose SHA-256 hash exactly matches `migrations/20260807190126_silly_vivisector/migration.sql`.
- The default Neon `main` branch remains on the scaffold schema (`account`, `session`, `users`, `verification`, and `posts_table`). The agent-owned `development` branch was used to verify the pre-consolidation T-04 lists/tasks chain and has no real list/task consumers; its migration ledger is not automatically rewritten when pre-release files are consolidated locally.
- The repository's current T-04 migration creates native UUID list/task keys and UUIDv7 defaults directly. A fresh disposable local PostgreSQL database verified the consolidated chain; the existing agent-owned Neon branch was not destructively realigned.
- The current read-only `pnpm sanity:smoke` passes against the configured dedicated published landing singleton and reports the four mapped landing fields. The Sanity resource and its exact project identity remain provider configuration, not committed secret material.
- T-18.1 accepts [`TD-026`](decisions/TECHNICAL.md#td-026): Local uses Docker PostgreSQL with hosted Sanity; Development uses an owner-authorized durable non-default Neon branch; Preview uses an isolated temporary Neon branch plus the dedicated non-production Sanity dataset and controlled verified account; Production requires a separately provisioned protected Neon project/branch and owner-approved mail provider. None of the missing hosted target/protection prerequisites is silently inferred from `.env.local`.
