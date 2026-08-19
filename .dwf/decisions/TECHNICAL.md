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
- **Related resolutions:** [OD-006](OPEN-DECISIONS.md#od-006), [OD-014](OPEN-DECISIONS.md#od-014)
- **Source:** ADR-0003

Use PostgreSQL on Neon with Drizzle for Better Auth records, lists, tasks, ownership, timestamps, status, relational integrity, and migrations. Do not create a parallel user table or a `Workspace` table outside the Better Auth adapter schema. Lists reference users directly, and tasks reference lists. Lists and tasks require owner checks and durable relational constraints; deleting a list cascades to its tasks at the database boundary. Database-enforced case-insensitive uniqueness prevents duplicate list names per user and duplicate task titles per list under concurrent writes. Develop and verify schema-changing migrations on a non-default Neon branch before applying the same reviewed migration to the default branch.

This keeps relational constraints and TypeScript schema close together; local development consequently requires database configuration and migration discipline.

<a id="td-006"></a>

## TD-006 — Module-owned repository ports and ownership-aware adapters

- **Status:** ACCEPTED
- **Related product decisions:** D-001, D-003, D-004
- **Related resolution:** [OD-015](OPEN-DECISIONS.md#od-015)
- **Source:** legacy D-003; current SPEC persistence boundary

Lists and tasks own the repository ports required by their application use cases. Drizzle adapters implement those ports inside the owning capability's infrastructure boundary. Domain/application code consumes module types and outcomes, never Drizzle row types. Repository queries enforce ownership and task/list membership at the persistence boundary. List and task reads return forward cursor pages using the settled `createdAt` ordering and a deterministic tie-breaker. Cursor data never supplies ownership identity or bypasses filters. `ensureDefaultInbox` is atomic and idempotent under concurrent listless workspace loads.

<a id="td-007"></a>

## TD-007 — Validated Sanity adapter for landing content

- **Status:** ACCEPTED
- **Related product decisions:** D-005
- **Related resolution:** [OD-005](OPEN-DECISIONS.md#od-005)
- **Source:** ADR-0002; legacy D-006

Use a dedicated Sanity project and dataset for this repository, containing one singleton landing document. Keep the Sanity client, GROQ, external payload validation, and mapping in landing infrastructure. Map validated CMS payloads into a plain landing view model; raw CMS documents and provider types do not cross into application or presentation code. Once the real read path is wired, missing or invalid required content is an explicit integration failure rather than a permanent silent fallback. Webhooks and on-demand revalidation are out of scope.

This keeps editorial copy independently editable while making the second store's ownership and failure behavior explicit.

<a id="td-008"></a>

## TD-008 — Zod and shared mutation paths at untrusted boundaries

- **Status:** ACCEPTED
- **Related product decisions:** D-001, D-002, D-006
- **Related resolutions:** [OD-002](OPEN-DECISIONS.md#od-002), [OD-004](OPEN-DECISIONS.md#od-004), [OD-014](OPEN-DECISIONS.md#od-014), [OD-015](OPEN-DECISIONS.md#od-015), [OD-016](OPEN-DECISIONS.md#od-016)
- **Source:** current SPEC presentation and validation boundaries

Server Actions and JSON Route Handlers follow `authenticate → authorize → validate with Zod → call application use case → map result/error → revalidate/respond`. Actions and handlers share schemas and application use cases. A nonexistent private list/task and one owned by another user both map to the same application-level `not_found` outcome. JSON handlers return `404` with `{ error: { code: "not_found", message } }`; Server Actions expose the equivalent generic result. Database uniqueness violations map to the application-level `conflict` outcome; JSON handlers return `409` with code `conflict`, and Server Actions expose the equivalent conflict result. Pagination cursors and limits are untrusted inputs validated at the presentation boundary; malformed or incompatible cursors and limits outside the accepted integer range map to invalid input. The stable JSON routes are `/api/lists`, `/api/lists/:listId`, `/api/lists/:listId/tasks`, and `/api/tasks/:taskId`; Better Auth owns `/api/auth/*`.

<a id="td-009"></a>

## TD-009 — Layered verification and local quality gates

- **Status:** ACCEPTED
- **Related product decisions:** D-006
- **Source:** legacy D-008; current SPEC testing boundary

Verify domain invariants, application use cases with ports/fakes, Zod/auth boundaries, non-trivial adapter mappings, and the core Playwright journey. A complete React component unit matrix is not required. The repository quality baseline is pnpm, Vitest, Playwright, typechecking, linting, Husky, and lint-staged; CI is not required for spike completion.

<a id="td-010"></a>

## TD-010 — Query-shaped PostgreSQL index baseline

- **Status:** ACCEPTED
- **Related product decisions:** D-001, D-003, D-004
- **Related resolutions:** [OD-014](OPEN-DECISIONS.md#od-014), [OD-015](OPEN-DECISIONS.md#od-015), [OD-017](OPEN-DECISIONS.md#od-017)
- **Source:** current performance architecture review

Use database primary keys, the task-to-list cascading foreign key, and database-enforced case-insensitive unique keys for list names per user and task titles per list. Support list pagination with a composite B-tree index whose leading equality scope is `userId` and whose remaining keys match `createdAt` plus the deterministic cursor tie-breaker. Support task pagination with a composite B-tree index whose leading equality scope is `userId` and `listId` and whose remaining keys match `createdAt` plus the deterministic cursor tie-breaker. Index direction follows the settled list and task ordering.

Do not add status, notes, search, partial, or other speculative indexes without measured query evidence. Exact normalized-key representation, tie-breaker, index names, and Drizzle declaration syntax remain implementation choices.

<a id="td-011"></a>

## TD-011 — Bounded queries and environment-appropriate connections

- **Status:** ACCEPTED
- **Related product decisions:** D-003, D-004
- **Related resolutions:** [OD-015](OPEN-DECISIONS.md#od-015), [OD-016](OPEN-DECISIONS.md#od-016), [OD-018](OPEN-DECISIONS.md#od-018)
- **Source:** current performance architecture review

Cursor repositories fetch at most `limit + 1` rows, return at most `limit`, and select only fields required by their application result. Core list/task request paths use bounded query counts and avoid N+1 behavior. Queries keep their equality predicates and ordering aligned with the indexes in TD-010.

Reuse one module-level Drizzle/database client in the application runtime. Deployed application traffic uses a pooled Neon connection; schema migrations use a direct Neon connection. Redis and application-level query caching are not required for this spike. Exact query composition, result projection, instrumentation, client factory naming, and environment-variable names remain implementation choices.

<a id="td-012"></a>

## TD-012 — Representative query-plan and warm-query evidence

- **Status:** ACCEPTED
- **Related product decisions:** D-003, D-004
- **Related resolutions:** [OD-017](OPEN-DECISIONS.md#od-017), [OD-018](OPEN-DECISIONS.md#od-018), [OD-019](OPEN-DECISIONS.md#od-019)
- **Source:** current performance architecture review

Keep a repeatable performance seed for the non-default Neon development branch containing approximately 100 lists for one user, 10,000 tasks in one large list, and another user's records. Use `EXPLAIN ANALYZE` on representative first-page and next-page cursor queries to confirm the intended indexes support list and task access without a full table scan. Include the completed-task-filtered task shape when its SQL differs.

With compute active and relevant data warm, a 20-record database query must execute in under 50 ms. Verify cursor correctness at the maximum 100-record page size. This is repeatable manual or integration evidence, not a per-commit CI benchmark or production end-to-end SLA; network time, authentication, rendering, CMS access, and Neon compute startup are outside the measurement.

<a id="td-013"></a>

## TD-013 — PostgreSQL integration suite through Testcontainers

- **Status:** ACCEPTED
- **Related product decisions:** D-003, D-004, D-006
- **Related resolution:** [OD-020](OPEN-DECISIONS.md#od-020)
- **Source:** current testing architecture review

Use `@testcontainers/postgresql` with a PostgreSQL 18 image for real persistence integration tests. One ephemeral container serves an integration suite run and receives the same versioned Drizzle migrations used against Neon. Database-backed tests cover repository mappings, uniqueness constraints, cascade deletion, ownership-aware queries, cursor pagination, and concurrent default-Inbox creation. Database state is isolated between tests.

Domain, application-with-fakes, and Zod unit tests remain independent of PostgreSQL and Docker. Database-backed suites require Docker and fail clearly when it is unavailable rather than silently skipping. Exact image patch tag, test-file layout, state-reset strategy, and helper names remain implementation choices.

<a id="td-014"></a>

## TD-014 — Local-first test database with Neon verification lane

- **Status:** ACCEPTED
- **Related product decisions:** D-006
- **Related resolutions:** [OD-006](OPEN-DECISIONS.md#od-006), [OD-019](OPEN-DECISIONS.md#od-019), [OD-020](OPEN-DECISIONS.md#od-020), [OD-021](OPEN-DECISIONS.md#od-021)
- **Source:** current testing architecture review

Use local Testcontainers PostgreSQL as the default database for repository integration tests and Playwright. The end-to-end harness owns an ephemeral PostgreSQL 18 container, applies the versioned migrations, loads a small deterministic behavior seed, starts a dedicated Next.js test server against the generated container URL, runs the browser journey, and tears down its processes. A local development mode may keep a migrated and seeded container alive for a manual session.

Keep the behavior seed small and separate from the heavy performance seed. Use the non-default Neon development branch for Neon migration smoke verification, deployed-driver compatibility, representative-volume performance data, query plans, and the warm-query target. Routine test suites require neither Neon credentials nor network access. Destructive reset and cleanup code accepts only a harness-owned local container connection. Exact process orchestration, script names, ports, seed APIs, and local-container persistence mechanism remain implementation choices.

<a id="td-015"></a>

## TD-015 — Shared node-postgres runtime with Vercel pool lifecycle

- **Status:** ACCEPTED
- **Related product decisions:** D-001, D-002, D-003, D-004
- **Related resolution:** [OD-022](OPEN-DECISIONS.md#od-022)
- **Source:** current database-driver and Vercel hosting review

Use `node-postgres` through `drizzle-orm/node-postgres` for Better Auth and the list/task Drizzle repositories in the Next.js Node runtime. Reuse one bounded, module-scoped `pg.Pool`. On Vercel, register the pool with `attachDatabasePool` from `@vercel/functions` so Fluid Compute can reuse connections and close idle clients before function suspension.

Use Neon's pooled URL for application traffic and its direct URL for migrations. Use the Testcontainers-generated local URL for integration tests and Playwright. Keep one repository implementation across Neon and local PostgreSQL. Exact pool sizing, idle timeout, helper names, environment-variable names, and conditional Vercel registration remain implementation choices.

<a id="td-016"></a>

## TD-016 — Chromium-first Playwright acceptance

- **Status:** ACCEPTED
- **Related product decisions:** D-006
- **Related resolution:** [OD-023](OPEN-DECISIONS.md#od-023)
- **Source:** current testing architecture review

Use Chromium for the required local Playwright acceptance journey. Provide a separate on-demand run for the same relevant journeys in Firefox and WebKit before a public release and after major UI changes. The routine suite does not multiply every database-backed scenario across all three engines. Exact Playwright project names, script names, and selection mechanics remain implementation choices.
