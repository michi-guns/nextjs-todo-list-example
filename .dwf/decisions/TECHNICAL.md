# Technical Decisions

Canonical durable Technical Decisions (`TD-*`). These choices implement the accepted Product Decisions without overriding them. The generated Agent SPEC is the precise technical projection; this ledger preserves the durable mechanism and rationale.

<a id="td-001"></a>

## TD-001 — Domain-centered modular monolith

- **Status:** ACCEPTED
- **Related product decisions:** D-001, D-005, D-006
- **Source:** ADR-0001; legacy D-001

Use one deployable Next.js application organized by business capability. Keep domain, application, infrastructure, and presentation responsibilities separate where useful. Prefer the existing repository extension points over reshaping source merely to mirror conceptual nouns.

This preserves cohesive capabilities and simple deployment without microservice overhead; the tradeoff is that dependency discipline must prevent in-process coupling from growing.

<a id="td-002"></a>

## TD-002 — Four capability modules and explicit infrastructure seats

- **Status:** ACCEPTED
- **Related product decisions:** D-001, D-005
- **Source:** legacy D-002; ADR-0001

The first-class capabilities are `auth`, `landing`, `lists`, and `tasks`. Keep `src/shared/` small. Root `db/` and `migrations/` own database client/schema/migration concerns, while `src/sanity/` is a provider seat; these are infrastructure locations, not additional business modules.

<a id="td-003"></a>

## TD-003 — Layered dependency direction and composition-only routes

- **Status:** ACCEPTED
- **Related product decisions:** D-001, D-006
- **Source:** legacy D-007; current SPEC boundary clarifications

The dependency direction is `presentation → application → domain`, with infrastructure implementing application/domain ports. `app/` owns Next.js routing and composition. Module presentation owns Server Actions, Route Handler adapters, Zod input schemas, view models, error mapping, and capability-owned UI. Domain/application code must not import Next.js, React, Drizzle, Sanity, HTTP, or browser APIs.

<a id="td-004"></a>

## TD-004 — Server-only Better Auth application boundary

- **Status:** ACCEPTED
- **Related product decisions:** D-001, D-002
- **Related resolution:** [OD-003](OPEN-DECISIONS.md#od-003)
- **Source:** legacy D-004; current SPEC authentication boundary

Keep Better Auth instances, raw session records, and auth route wiring behind the auth infrastructure boundary. Expose server-only application helpers equivalent to `getCurrentUser(): Promise<CurrentUser | null>` and `requireUser(): Promise<CurrentUser>`. Private pages, Server Actions, and Route Handlers must authenticate at their operation boundary and must not trust a client-provided owner id. In explicitly enabled local/test mode, the magic-link send adapter captures generated links in a temporary, gitignored, file-backed mailbox; the mailbox is unavailable in other modes.

<a id="td-005"></a>

## TD-005 — PostgreSQL/Neon with Drizzle owns transactional truth

- **Status:** ACCEPTED
- **Related product decisions:** D-001, D-003, D-004
- **Source:** ADR-0003

Use PostgreSQL on Neon with Drizzle for Better Auth records, lists, tasks, ownership, timestamps, status, relational integrity, and migrations. Do not create a parallel user table outside the Better Auth adapter schema. Lists and tasks require owner checks and durable relational constraints; deleting a list cascades to its tasks at the database boundary.

This keeps relational constraints and TypeScript schema close together; local development consequently requires database configuration and migration discipline.

<a id="td-006"></a>

## TD-006 — Module-owned repository ports and ownership-aware adapters

- **Status:** ACCEPTED
- **Related product decisions:** D-001, D-003, D-004
- **Source:** legacy D-003; current SPEC persistence boundary

Lists and tasks own the repository ports required by their application use cases. Drizzle adapters implement those ports inside the owning capability's infrastructure boundary. Domain/application code consumes module types and outcomes, never Drizzle row types. Repository queries enforce ownership and task/list membership at the persistence boundary. `ensureDefaultInbox` is atomic under concurrent first use.

<a id="td-007"></a>

## TD-007 — Validated Sanity adapter for landing content

- **Status:** ACCEPTED
- **Related product decisions:** D-005
- **Source:** ADR-0002; legacy D-006

Keep the Sanity client, GROQ, external payload validation, and mapping in landing infrastructure. Map validated CMS payloads into a plain landing view model; raw CMS documents and provider types do not cross into application or presentation code. Once the real read path is wired, missing or invalid required content is an explicit integration failure rather than a permanent silent fallback. Webhooks and on-demand revalidation are out of scope.

This keeps editorial copy independently editable while making the second store's ownership and failure behavior explicit.

<a id="td-008"></a>

## TD-008 — Zod and shared mutation paths at untrusted boundaries

- **Status:** ACCEPTED
- **Related product decisions:** D-001, D-002, D-006
- **Related resolution:** [OD-002](OPEN-DECISIONS.md#od-002)
- **Source:** current SPEC presentation and validation boundaries

Server Actions and JSON Route Handlers follow `authenticate → authorize → validate with Zod → call application use case → map result/error → revalidate/respond`. Actions and handlers share schemas and application use cases. A nonexistent private list/task and one owned by another user both map to the same application-level `not_found` outcome. JSON handlers return `404` with `{ error: { code: "not_found", message } }`; Server Actions expose the equivalent generic result. Exact paths remain implementation freedom until selected in an open decision.

<a id="td-009"></a>

## TD-009 — Layered verification and local quality gates

- **Status:** ACCEPTED
- **Related product decisions:** D-006
- **Source:** legacy D-008; current SPEC testing boundary

Verify domain invariants, application use cases with ports/fakes, Zod/auth boundaries, non-trivial adapter mappings, and the core Playwright journey. A complete React component unit matrix is not required. The repository quality baseline is pnpm, Vitest, Playwright, typechecking, linting, Husky, and lint-staged; CI is not required for spike completion.
