# Project Context

## Product intent

- The repository is an opinionated, production-minded Next.js starter implemented through a complete personal-todo reference application; it is not a toy project or temporary experiment.
- A derived application is expected to replace mostly the domain and UI while retaining or adapting cross-cutting foundations such as authentication, persistence, CMS integration, validation, testing, documentation, and local quality tooling.
- The starter deliberately presents one preferred stack and architecture rather than becoming a configurable multi-stack framework.
- Design and implementation optimize for high reusable quality without excessive build time: use the simplest robust modern approach and add complexity only when it has a clear safety, correctness, operability, maintainability, or avoided-rework payoff.
- Stack selection follows [TD-028](decisions/TECHNICAL.md#td-028) and [RULE-012](RULES.md#rule-012): current documented defaults for coding-agent authors, with Drizzle, Better Auth, and Zod 4 kept as named exceptions.

## Repository landscape

- One standalone Next.js repository uses the installed DWF candidate distribution `0.1.0-proposal.1` under `.dwf/.framework/`.
- The framework machinery is supplied and read-only during ordinary project work. Project Workspace state lives outside `.dwf/.framework/`.
- Source areas currently present include `app/`, `components/`, `db/`, `lib/`, `src/`, `e2e/`, `migrations/`, `scripts/`, and `docs/`.
- The repository now contains the runnable authenticated todo reference: `app/` composes public landing, auth, dashboard, API, and Studio routes; `src/modules/` contains auth, landing, lists, and tasks; and `components/` contains the Focus Rail UI.
- `app/page.tsx` reads the published Sanity landing singleton through the landing infrastructure boundary; `app/(app)/dashboard/page.tsx` composes the authenticated list/task application path.
- `lib/auth.ts` contains the Better Auth email/password and magic-link configuration backed by the shared Drizzle client and local/test mailbox boundary.
- `db/schema/auth.ts`, `db/schema/lists.ts`, and `db/schema/tasks.ts` contain the Better Auth and todo tables. Active schema exports are those three modules.
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

- Local application database is Docker PostgreSQL 18 through `pnpm local:postgres` / `pnpm dev:local` (`scripts/local-postgres/`). Integration and Playwright use disposable Testcontainers, not the Compose volume.
- Environment profile parsing and pre-mutation guards live in `scripts/environment/` (`pnpm environment:inspect`). They are not a Next.js runtime gate; `db/db.ts` still uses the supplied `DATABASE_URL`.
- No repository-resident CI, Preview, or Production workflow exists. Those remain T-21 through T-23.
- Durable Neon Development is T-20. The T-01 agent-owned `development` branch expired on 2026-09-02 and is not a current target. Do not infer Development or Production identity from `.env.local`.
- The committed migration chain under `migrations/` is Better Auth plus lists/tasks. Hosted Neon catalogs are not claimed here.
- `pnpm sanity:smoke` is the read-only published landing check. Sanity project identity is provider configuration, not committed secret material.
- [`TD-026`](decisions/TECHNICAL.md#td-026) remains the accepted environment matrix. Missing hosted prerequisites are not inferred from local files.
