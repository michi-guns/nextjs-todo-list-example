# Project Context

## Repository landscape

- One standalone Next.js repository is being migrated to DWF.
- Source areas currently present include `app/`, `components/`, `db/`, `lib/`, `src/`, `e2e/`, `migrations/`, and `docs/`.
- The source tree is a starter scaffold rather than a completed todo product.
- The current root page still renders the template "Project ready!" screen.
- `lib/auth.ts` contains a basic Better Auth email/password configuration backed by the Drizzle client.
- `db/schema/auth.ts` contains Better Auth-oriented tables; `db/schema/test.ts` is an example posts schema, not the planned lists/tasks schema.
- Capability implementations, list/task routes, and Sanity integration are not currently present in source.
- The current Playwright file is the default example targeting `playwright.dev`, not the todo journey.

## Technology facts

The package manifest currently includes Next.js, React, Better Auth, Neon serverless access, Drizzle, Zod, shadcn-related UI packages, Vitest, Playwright, pnpm scripts, Husky, and lint-staged. Sanity is described by the design contract but is not currently represented as a source integration/dependency.

## Documentation facts

- Existing `docs/` contains supporting handbook, architecture, domain, data, development, runbook, and protocol material.
- Product and technical documents and accepted ADRs are now located under `.dwf/` as canonical design artifacts.
- Supporting `docs/` files remain useful but are subordinate where they overlap `.dwf/` authority.

## Operational facts

- `.jz-trello/` and Trello-related skills exist as project workflow/projection infrastructure.
- No repository-resident `implementation/` Delivery tree currently exists.
- No Delivery System CLI or package script matching the supplied mental model was found in the repository.
- The supplied DWF and Delivery System framework documents are external inputs under `C:\Users\jimzord12\Downloads\dwf`; they are not project-owned files and must not be modified by this migration.
