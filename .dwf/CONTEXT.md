# Project Context

## Repository landscape

- One standalone Next.js repository uses the installed DWF candidate distribution `0.1.0-proposal.1` under `.dwf/.framework/`.
- The framework machinery is supplied and read-only during ordinary project work. Project Workspace state lives outside `.dwf/.framework/`.
- Source areas currently present include `app/`, `components/`, `db/`, `lib/`, `src/`, `e2e/`, `migrations/`, and `docs/`.
- The source tree is a starter scaffold rather than a completed todo product.
- The current root page still renders the template `Project ready!` screen.
- `lib/auth.ts` contains a basic Better Auth email/password configuration backed by the Drizzle client.
- `db/schema/auth.ts` contains Better Auth-oriented tables; `db/schema/test.ts` is an example posts schema, not the planned lists/tasks schema.
- Capability implementations, list/task routes, and Sanity integration are not currently present in source.
- The current Playwright file is the default example targeting `playwright.dev`, not the todo journey.

## Technology facts

The package manifest currently includes Next.js, React, Better Auth, Neon serverless access, Drizzle, Zod, shadcn-related UI packages, Vitest, Playwright, pnpm scripts, Husky, and lint-staged. Sanity is described by the design contract but is not currently represented as a source integration/dependency.

## Documentation facts

- Existing `docs/` contains supporting handbook, architecture, domain, data, development, runbook, and protocol material.
- Durable project decisions and open state live under `.dwf/decisions/`.
- Generated Agent/Human PRD and SPEC projections live under `.dwf/output/`.
- `.dwf/concepts/` contains derived explanations only; it does not own requirements.
- The installed `.dwf/.framework/**` is supplied DWF machinery and is not rewritten by ordinary project work; `.dwf/README.md` is project-specific Workspace orientation.

## Operational facts

- `.jz-trello/` and Trello-related skills exist as project workflow/projection infrastructure.
- No repository-resident Delivery tree currently exists.
- No Delivery System CLI or package script matching the supplied mental model was found in the repository.
- No external database or Sanity project was contacted during this migration.
