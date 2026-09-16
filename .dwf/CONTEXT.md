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
- `lib/auth.ts` contains the Better Auth email/password and magic-link configuration backed by the shared Drizzle client and explicit mail boundary. Local/test uses the mailbox, Preview suppresses sends, and Production can select the Resend adapter after configuration validation.
- `db/schema/auth.ts`, `db/schema/lists.ts`, and `db/schema/tasks.ts` contain the Better Auth and todo tables. Active schema exports are those three modules.
- `src/sanity/` and `src/modules/landing/infrastructure/` contain the Sanity client/configuration, validated read path, and invalidation boundary.
- `src/test/`, `scripts/playwright-local/`, and `e2e/` contain the local PostgreSQL 18 Testcontainers and dedicated Playwright lifecycle. The normal browser suite contains eight Chromium journeys, including fresh signup, pending-access refusal, email verification and subsequent password sign-in.

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
- `.github/workflows/ci.yml` runs Quality and Harness on main pushes/pull requests without deployment. `.github/workflows/deploy-preview.yml` is manual only. T-22 hosted proof is complete. PR #30 recorded command repairs and a cleaned-up attempt whose first Vercel deployment was classified Production. On 2026-09-14 the owner resolved that with a placeholder Production deployment, a separate Neon Production project was provisioned for T-23, and the adapter gained a project preflight plus team-scoped identity validation. The first owner-authorized hosted Preview run then succeeded on 2026-09-14 with independent HTTP and browser verification; its Neon branch was cleaned up through the identity guard and T-22 is complete. Each run still needs owner authorization. No Production release workflow exists.
- T-20 provisioned durable `development`, branch `br-super-leaf-axfwoi2e` in Neon project `curly-dust-60603928`, with no expiry. Guarded identity inspection, direct migration and ordinary seed are recorded in the testing ledger. The earlier expiring T-01 branch is historical. Do not infer Development or Production identity from `.env.local`.
- T-21.5 has a reviewed Resend implementation and, as of 2026-09-16, a verified owner-controlled sending subdomain and one real adapter delivery to the owner's Gmail. Namecheap DNS and Resend verification succeeded. The message initially arrived in Spam and was moved to Inbox after explicit owner approval. [Redacted evidence](../docs/agentforge/evidence/2026-09-16-resend-domain-delivery.md) records the provider setup and limits. GitHub Production mail variables, required owner approval and a main-only branch policy are now configured, with administrator bypass disabled. The existing scoped Resend key is unchanged. The [protected mail check](../docs/agentforge/evidence/2026-09-16-production-mail-protection.md) passed after required approval in run `35103297897`, completing T-21.5. No deployed Production app was configured or exercised. T-24 has its hosted Preview evidence, while protected-release evidence still depends on T-23.
- The [environment map](../docs/architecture/environments.md), [Preview runbook](../docs/runbooks/preview-delivery.md) and [Production readiness page](../docs/runbooks/production-readiness.md) distinguish current commands from unavailable delivery boundaries.
- The committed migration chain under `migrations/` is Better Auth plus lists/tasks. Hosted Neon catalogs are not claimed here.
- `pnpm sanity:smoke` is the read-only published landing check. Sanity project identity is provider configuration, not committed secret material.
- [`TD-026`](decisions/TECHNICAL.md#td-026) remains the accepted environment matrix. Missing hosted prerequisites are not inferred from local files.
