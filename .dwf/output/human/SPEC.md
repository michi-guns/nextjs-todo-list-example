# Human Technical Guide — Next.js Todo List Example

This is a human-oriented projection of the validated [Agent SPEC](../agent/SPEC.md). It explains the implementation shape without becoming a second technical contract. Durable choices live in [`../../decisions/TECHNICAL.md`](../../decisions/TECHNICAL.md); product behavior remains owned by [`../agent/PRD.md`](../agent/PRD.md).

## System shape

The application is one Next.js deployable organized as a domain-centered modular monolith:

```text
app routes
  → module presentation
    → application use cases
      → domain rules and repository ports
        → Drizzle / Better Auth / Sanity adapters
```

The first-class capabilities are `auth`, `landing`, `lists`, and `tasks`. Root `db/`, `migrations/`, and `src/sanity/` are infrastructure seats. `src/shared/` stays small.

## Layer responsibilities

- **Domain:** plain entities, invariants, errors, and contracts; no framework/provider imports.
- **Application:** use cases, DTOs, and ports; no SQL, GROQ, JSX, or raw provider records.
- **Infrastructure:** Drizzle repositories, Better Auth integration, Sanity adapters, validation/mapping.
- **Presentation:** Server Actions, JSON Route Handler adapters, Zod input schemas, view models, error mapping, and capability-owned UI.
- **`app/`:** Next.js routing and composition only.

Server Actions and Route Handlers use the same boundary sequence:

```text
authenticate → authorize → validate with Zod → call use case → map result/error → revalidate/respond
```

## Identity and persistence

Better Auth remains behind a server-only application boundary exposing current-user helpers. Private reads and writes require the session user; client-provided owner IDs are never trusted.

Local magic-link verification uses an explicitly enabled, temporary, gitignored, file-backed mailbox. Playwright clears it, requests a link, reads the captured URL, and visits it. The mailbox is unavailable outside local/test mode.

A missing private resource and one owned by another user produce the same application-level `not_found` outcome. JSON handlers map both to `404` with code `not_found`; Server Actions expose the equivalent generic result.

Uniqueness violations produce the application-level `conflict` outcome. JSON handlers map it to `409` with code `conflict`; Server Actions expose the equivalent conflict result.

PostgreSQL on Neon with Drizzle owns Better Auth records, lists, tasks, ownership, status, timestamps, uniqueness, and relational integrity. Lists belong directly to users; there is no `Workspace` persistence entity. Lists and tasks own their repository ports. Drizzle row types stay inside infrastructure. Database constraints enforce case-insensitive list-name uniqueness per user and task-title uniqueness per list. Composite B-tree indexes follow the user/list query scope and cursor ordering used by the main paginated reads. Additional indexes are added only when measured query evidence justifies them. List deletion uses a database cascade, and default `Inbox` creation is atomic and idempotent whenever a private workspace loads with no lists. Schema-changing migrations are developed and verified on a non-default Neon branch before the same reviewed migration is applied to the default branch.

## Sanity boundary

Sanity is used only for landing content through a dedicated project and dataset containing one singleton landing document. Infrastructure validates unknown CMS payloads and maps them to a plain landing view model. GROQ, client setup, and raw Sanity documents must not cross into application or page code. After the real CMS path is wired, required-content failures are explicit integration failures rather than a permanent silent fallback.

## Required application behavior

The minimum application APIs cover:

- `ensureDefaultInbox`, list listing/creation/rename/deletion;
- task listing/creation/update/deletion;
- forward cursor pagination for list and task reads through `{ items, nextCursor }` pages, defaulting to 20 and capped at 100 records;
- task statuses `todo`, `in_progress`, and `done`;
- completed-task filtering;
- ownership checks at use-case and repository boundaries;
- consistent action and JSON error mapping.

Exact signatures and data contracts are in the [Agent SPEC](../agent/SPEC.md).

The stable JSON route families are `/api/lists`, `/api/lists/:listId`, `/api/lists/:listId/tasks`, and `/api/tasks/:taskId`. List and task GET routes accept opaque `cursor` and `limit` query parameters and return `{ items, nextCursor }`; cursors never provide ownership identity. Omitted limits mean 20, the maximum is 100, and responses do not include total counts or numbered-page metadata. Better Auth owns `/api/auth/*`.

## Verification

Use layered proof:

- domain invariant tests;
- application tests with repository ports/fakes;
- Zod and auth/presentation boundary tests;
- non-trivial adapter mapping tests;
- the Playwright sign-in → list → task → status → sign-out journey;
- pnpm typecheck, lint, tests, and local commit hooks.

A full React component unit-test matrix is not required for the spike.

## Current implementation prerequisites

No tracked design choice remains open. Current-state inspection found no configured Sanity resource and confirmed that the linked Neon database contains the applied scaffold migration but not the planned `lists` or `tasks` schema. A dedicated Sanity resource and a non-default Neon development branch still need to be provisioned during implementation. These prerequisites remain visible in the factual-question ledger and project context.
