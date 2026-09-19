# Technical Decisions

Canonical durable Technical Decisions (`TD-*`). These choices implement the accepted Product Decisions without overriding them. The generated Agent SPEC is the precise technical projection; this ledger preserves the durable mechanism and rationale. See the [Testing Decisions and Test Contracts ledger](TESTING.md) for the `TST-*` obligations that verify these mechanisms and boundaries.

<a id="td-001"></a>

## TD-001 — Domain-centered modular monolith

- **Status:** ACCEPTED
- **Related product decisions:** D-001, D-005, D-009
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
- **Related product decisions:** D-001, D-009
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

- **Status:** SUPERSEDED
- **Superseded by:** TD-023
- **Related product decisions:** D-005
- **Related resolutions:** [OD-005](OPEN-DECISIONS.md#od-005), [OD-025](OPEN-DECISIONS.md#od-025)
- **Source:** ADR-0002; legacy D-006

Use a dedicated Sanity project and dataset for this repository, containing one singleton landing document. Keep the Sanity client, GROQ, external payload validation, and mapping in landing infrastructure. Map validated CMS payloads into a plain landing view model; raw CMS documents and provider types do not cross into application or presentation code. Once the real read path is wired, missing or invalid required content is an explicit integration failure rather than a permanent silent fallback. Webhooks and on-demand revalidation are out of scope.

This keeps editorial copy independently editable while making the second store's ownership and failure behavior explicit.

<a id="td-008"></a>

## TD-008 — Zod and shared mutation paths at untrusted boundaries

- **Status:** ACCEPTED
- **Related product decisions:** D-001, D-002, D-009
- **Related resolutions:** [OD-002](OPEN-DECISIONS.md#od-002), [OD-004](OPEN-DECISIONS.md#od-004), [OD-014](OPEN-DECISIONS.md#od-014), [OD-015](OPEN-DECISIONS.md#od-015), [OD-016](OPEN-DECISIONS.md#od-016)
- **Source:** current SPEC presentation and validation boundaries

Server Actions and JSON Route Handlers follow `authenticate → authorize → validate with Zod → call application use case → map result/error → revalidate/respond`. Actions and handlers share schemas and application use cases. A nonexistent private list/task and one owned by another user both map to the same application-level `not_found` outcome. JSON handlers return `404` with `{ error: { code: "not_found", message } }`; Server Actions expose the equivalent generic result. Database uniqueness violations map to the application-level `conflict` outcome; JSON handlers return `409` with code `conflict`, and Server Actions expose the equivalent conflict result. Pagination cursors and limits are untrusted inputs validated at the presentation boundary; malformed or incompatible cursors and limits outside the accepted integer range map to invalid input. The stable JSON routes are `/api/lists`, `/api/lists/:listId`, `/api/lists/:listId/tasks`, and `/api/tasks/:taskId`; Better Auth owns `/api/auth/*`.

<a id="td-009"></a>

## TD-009 — Layered verification and local quality gates

- **Status:** ACCEPTED
- **Related product decisions:** D-009
- **Source:** legacy D-008; current SPEC testing boundary

Verify domain invariants, application use cases with ports/fakes, Zod/auth boundaries, non-trivial adapter mappings, and the core Playwright journey. A complete React component unit matrix is not required. The repository quality baseline is pnpm, Vitest, Playwright, typechecking, linting, Husky, and lint-staged; CI is not required for current starter-baseline completion.

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

Reuse one module-level Drizzle/database client in the application runtime. Deployed application traffic uses a pooled Neon connection; schema migrations use a direct Neon connection. Redis and application-level query caching are not required for the current starter baseline. Exact query composition, result projection, instrumentation, client factory naming, and environment-variable names remain implementation choices.

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
- **Related product decisions:** D-003, D-004, D-009
- **Related resolution:** [OD-020](OPEN-DECISIONS.md#od-020)
- **Source:** current testing architecture review

Use `@testcontainers/postgresql` with a PostgreSQL 18 image for real persistence integration tests. One ephemeral container serves an integration suite run and receives the same versioned Drizzle migrations used against Neon. Database-backed tests cover repository mappings, uniqueness constraints, cascade deletion, ownership-aware queries, cursor pagination, and concurrent default-Inbox creation. Database state is isolated between tests.

Domain, application-with-fakes, and Zod unit tests remain independent of PostgreSQL and Docker. Database-backed suites require Docker and fail clearly when it is unavailable rather than silently skipping. Exact image patch tag, test-file layout, serial state-reset strategy, and helper names remain implementation choices.

<a id="td-014"></a>

## TD-014 — Local-first test database with Neon verification lane

- **Status:** ACCEPTED
- **Related product decisions:** D-009
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
- **Related product decisions:** D-009
- **Related resolution:** [OD-023](OPEN-DECISIONS.md#od-023)
- **Source:** current testing architecture review

Use Chromium for the required local Playwright acceptance journey. Provide a separate on-demand run for the same relevant journeys in Firefox and WebKit before a public release and after major UI changes. The routine suite does not multiply every database-backed scenario across all three engines. Exact Playwright project names, script names, and selection mechanics remain implementation choices.

<a id="td-017"></a>

## TD-017 — Serial shared-database test execution

- **Status:** ACCEPTED
- **Related product decisions:** D-009
- **Related resolution:** [OD-024](OPEN-DECISIONS.md#od-024)
- **Source:** current testing architecture review

Run database repository integration tests and Playwright serially by default while they share one Testcontainers PostgreSQL instance. Each test owns a unique authenticated user and its mutable records and remains independent of test order. Parallel execution requires database- or schema-level isolation per worker and is a later optimization, not a current starter-baseline requirement. Exact runner configuration, unique-data helpers, cleanup strategy, and worker-isolation mechanism remain implementation choices.

<a id="td-018"></a>

## TD-018 — Local Sanity contracts with a live read smoke

- **Status:** ACCEPTED
- **Related product decisions:** D-005, D-009
- **Related resolution:** [OD-025](OPEN-DECISIONS.md#od-025)
- **Source:** current testing architecture review

Test Sanity payload validation, mapping, optional fields, and required-content failures with local fixtures. Routine Playwright receives deterministic test-only landing content through the application-facing landing contract and does not call Sanity. The test source cannot run as a deployed fallback.

Keep one separate read-only smoke against the configured dedicated Sanity project and dataset. It fetches the published singleton through the real query and client path, validates the payload, and maps the landing view model. This smoke is required before starter-baseline completion and before a deployment counts as release evidence; missing configuration, content, or a valid mapping fails clearly. Exact fixtures, dependency substitution, command name, and output format remain implementation choices.

<a id="td-019"></a>

## TD-019 — Versioned migration chain and upgrade verification

- **Status:** ACCEPTED
- **Related product decisions:** D-003, D-004, D-009
- **Source:** current migration verification review

Versioned Drizzle migration files are the authoritative database transition path. Testcontainers applies the complete migration chain to an empty PostgreSQL database. A non-default Neon development branch created from the current default branch applies the new reviewed migrations and verifies the hosted upgrade path before the same files may be applied to the default branch. `drizzle-kit push` may support local exploration but does not count as migration verification.

<a id="td-020"></a>

## TD-020 — Separate contract coverage for server entry paths

- **Status:** ACCEPTED
- **Related product decisions:** D-001, D-003, D-004, D-009
- **Source:** current server-boundary testing review

Domain and application tests remain the main business-behavior suite. JSON Route Handlers receive request-level contract tests for success, pagination shape, unauthenticated `401`, privacy-preserving `404`, conflict `409`, and invalid-input `422` responses. Server Actions receive a smaller adapter suite for authentication, validation, and successful-result or expected-error mapping. Do not repeat every business case across both entry paths.

<a id="td-021"></a>

## TD-021 — Behavior-based test acceptance without a percentage gate

- **Status:** ACCEPTED
- **Related product decision:** D-009
- **Source:** current test-coverage review

Do not require a minimum code-coverage percentage. Every behavior required by the Agent SPEC must have suitable test evidence. Coverage reports may reveal untested code and guide review, but a percentage does not replace behavior-based acceptance.

<a id="td-022"></a>

## TD-022 — Same-origin session-authenticated JSON API baseline

- **Status:** ACCEPTED
- **Related product decisions:** D-001, D-002, D-009
- **Source:** current JSON API audience review

Treat the list and task JSON Route Handlers as same-origin application endpoints authenticated by the existing Better Auth browser session. Do not enable cross-origin access or add bearer-token, API-key, JWT, or separate machine-authentication support for the baseline. Supporting external agents or third-party clients requires a later authentication and authorization decision.

<a id="td-023"></a>

## TD-023 — Shared Sanity invalidation first, live preview second

- **Status:** ACCEPTED
- **Related product decisions:** D-005, D-008
- **Source:** current Sanity architecture and delivery-sequencing review
- **Supersedes:** TD-007
- **Later decision:** [TD-034](#td-034) activates the editorial phase without replacing published-content invalidation.

Keep the dedicated Sanity project, singleton landing document, server-side query, unknown-payload validation, and mapping into a plain landing view model. Raw CMS documents and provider types remain inside landing infrastructure. Published landing reads use a stable cache identity, and one server-only invalidation service expires that cached content.

Deliver signed webhook invalidation and protected manual recovery first. The webhook boundary verifies Sanity's signature before trusting the event and accepts only relevant published landing changes. The manual operator mechanism requires explicit authorization. Both call the same idempotent invalidation service, and neither exposes provider or operator secrets to the client. Exact route names, tag names, and operator-authentication mechanism remain implementation choices.

Defer live draft preview to a later delivery phase without removing it from the intended starter. That phase uses authenticated Next.js Draft Mode, Sanity Presentation and Visual Editing, and Sanity Live so editors can read drafts, click through to their source fields, and see changes while editing. Live draft subscriptions run only for authorized preview sessions and do not replace webhook invalidation for published traffic.

<a id="td-024"></a>

## TD-024 — Native UUIDv7 identifiers for lists and tasks

- **Status:** ACCEPTED
- **Related product decisions:** D-001, D-003, D-004
- **Related resolutions:** [OD-006](OPEN-DECISIONS.md#od-006), [OD-014](OPEN-DECISIONS.md#od-014), [OD-017](OPEN-DECISIONS.md#od-017)
- **Source:** resumed T-04 schema design review; PostgreSQL 18 UUID and identity guidance

Use PostgreSQL's native `uuid` type for `lists.id`, `tasks.id`, and `tasks.list_id`. Let PostgreSQL 18 generate list and task primary keys with the `uuidv7()` default. Keep `lists.user_id` and `tasks.user_id` as `text` because Better Auth's existing `users.id` is text. Native UUIDs give the list/task boundary a strongly typed identifier without making public route IDs predictable numeric sequences; UUIDv7's time-ordered layout also gives the primary-key indexes a locality-friendly default.

This is a deliberate choice rather than a requirement of Better Auth: Better Auth constrains the owner foreign-key type, not the list/task primary-key type. The pre-release T-04 migration creates the native UUID list/task keys and UUIDv7 defaults directly. The earlier text-key/conversion sequence was not released to a shared or production environment and is consolidated in place under TD-025; no production migration history is rewritten. PostgreSQL 18 is now the required database floor for the shared migration/test path.

Alternatives considered: application-generated arbitrary `text` IDs were rejected because the database could not validate their shape; `bigint GENERATED ALWAYS AS IDENTITY` was rejected for these route-facing resources because sequential values are predictable and would require a numeric public-ID contract. UUIDv4 remains a possible later choice if timestamp visibility becomes a privacy concern.

<a id="td-025"></a>

## TD-025 — Environment-gated migration history policy

- **Status:** ACCEPTED
- **Related product decisions:** D-001, D-003, D-004
- **Related resolutions:** [OD-006](OPEN-DECISIONS.md#od-006), [OD-021](OPEN-DECISIONS.md#od-021)
- **Source:** resumed T-04 migration review; pre-release workflow decision

Before creating or changing a database migration, inspect the repository and
relevant database targets to classify the project as scaffolding-only, shared
development, production, or unknown. While migration history exists only in
fresh, agent-owned, ephemeral, or otherwise safely recreatable targets, prefer
one coherent initial migration and consolidate unreleased changes in place.
Regenerate and commit the Drizzle snapshot/chain metadata with that migration.

Once a shared development or production target, non-disposable data, or real
users/stakeholders depend on the history, treat applied migrations as
immutable, add the smallest forward migration, and verify it through the
branch-first Neon workflow before promotion. If the state is unknown or
contradictory, stop and resolve it with the owner rather than guessing. This
policy does not authorize destructive file or database operations; explicit
confirmation remains required before rewriting files or realigning targets.

<a id="td-026"></a>

## TD-026 — Explicit environment profiles and delivery target guardrails

- **Status:** ACCEPTED
- **Related product decisions:** D-009, D-010
- **Related resolutions:** [OD-003](OPEN-DECISIONS.md#od-003), [OD-005](OPEN-DECISIONS.md#od-005), [OD-006](OPEN-DECISIONS.md#od-006), [OD-021](OPEN-DECISIONS.md#od-021), [OD-025](OPEN-DECISIONS.md#od-025)
- **Source:** T-18.1 environment and delivery contract reconciliation
- **Later exception:** [TD-034](#td-034) permits authenticated editorial draft sessions on the existing `production` dataset in Local, Development and Production. The matrix remains the ordinary published-runtime policy; deployment Preview is unchanged.

The application owns an explicit `APP_ENV` with the values `local`,
`development`, `preview`, and `production`. `NODE_ENV` remains reserved for
Next.js and may be `test` alongside `APP_ENV=local` for the local harness. A
profile is valid only when its application origin, Better Auth URL and secret,
database target identity, Sanity policy, mail policy, and permitted operations
agree with the profile below. The current linked Neon `main` target is not
silently promoted to either Development or Production.

| Profile     | Application and database target                                                                                                                                  | Sanity policy                                                                                                                    | Mail policy                                                                                       | Permitted operations                                                                                                                                      |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local       | Explicit loopback origin; persistent Docker PostgreSQL 18; direct local `DATABASE_URL` and `DATABASE_URL_UNPOOLED`                                               | Dedicated project's published `production` dataset, read-only; local signed webhook/recovery checks may be exercised             | Temporary file-backed mailbox only in an explicitly enabled local/test process                    | Local migration, synthetic seed, and reset only after loopback/harness ownership is proven; no deployment                                                 |
| Development | Explicit local origin; owner-authorized durable non-default Neon branch; pooled runtime `DATABASE_URL`, direct migration `DATABASE_URL_UNPOOLED`                 | Dedicated project's published `production` dataset, read-only                                                                    | Local mailbox may be used by the developer-owned process; no production delivery                  | Direct migration and scoped synthetic seed; no reset or Production deployment                                                                             |
| Preview     | Deployment-assigned origin mirrored by `BETTER_AUTH_URL`; temporary Neon branch derived from durable Development, with pooled runtime and direct migration roles | Dedicated project's non-production `preview` dataset, read-only; no live authoring or CMS writes                                 | Controlled pre-seeded verified account; local mailbox prohibited and no arbitrary outbound mail   | Manual exact-ref preview, branch-scoped migration/seed, smoke, and identity-checked cleanup/expiry                                                        |
| Production  | Canonical HTTPS origin; separately provisioned protected Neon project and branch, with pooled runtime and direct migration roles                                 | Dedicated project's published `production` dataset, read-only runtime plus the existing trusted webhook/manual recovery boundary | Owner-approved production provider; local mailbox prohibited; release is blocked until configured | Manual exact tag/SHA release after CI evidence and protected approval; forward migration, deployment, smoke, and application rollback reference; no reset |

The Preview choice is intentionally the non-production Sanity dataset and a
controlled-account authentication path. It keeps Preview isolated from
published editorial content and avoids sending uncontrolled mail while the
remote Preview provider decision remains outside this task. The
repository/Sanity owner provisions the Preview dataset for T-22; the
authentication/release operator owns the controlled verified account, while
TD-027 assigns the minimum Production mail transport to T-21.5 and the broader
auth/mail work to T-27. The Production choice is a separate protected Neon
project/branch rather than the current project's default `main`; the
database/release owner provisions and approves its concrete identity through
T-20/T-23. Until those owners complete provisioning, the affected delivery
tasks remain unready and must not invent a target or transport.

Neon migration tooling must use the direct `DATABASE_URL_UNPOOLED` role and
must fail closed when only a pooled remote URL is available. A fallback to
`DATABASE_URL` is permitted only after the target is proven to be direct local
PostgreSQL. Profile and delivery diagnostics may print redacted names and
safe metadata such as `appEnv=preview databaseTarget=neon-preview`, but never
connection strings, credentials, mailbox URLs, auth secrets, or tokens.

Preview delivery is manual `workflow_dispatch(ref, preview-id)`: resolve and
record one immutable commit, create and identify its temporary branch, migrate
and seed it, deploy the selected commit to Vercel Preview, run functional
smoke coverage, and report cleanup/expiry metadata. Production delivery is
manual `workflow_dispatch(ref=tag-or-sha)`: resolve the immutable commit,
verify CI evidence, require the protected Production approval, run a reviewed
forward migration separately from application boot, deploy the same commit,
run smoke checks, and record migration/deployment/rollback evidence. CI has
no deployment side effect, and no non-production workflow may access
Production secrets or mutate a Production target.

<a id="td-027"></a>

## TD-027 — Minimum Production mail readiness before release

- **Status:** ACCEPTED
- **Related technical decisions:** [TD-026](#td-026)
- **Related product decisions:** [D-009](PRODUCT.md#d-009), [D-010](PRODUCT.md#d-010)
- **Related test contracts:** [TST-ENV-001](TESTING.md#tst-env-001), [TST-AUTH-001](TESTING.md#tst-auth-001), [TST-AUTH-002](TESTING.md#tst-auth-002), [TST-RELEASE-001](TESTING.md#tst-release-001)
- **Source:** T-18 delivery-scope acceptance following T-18.1 review

The Production release path must not ship the current local file-backed mail
implementation. Before T-23 can release Production, T-21.5 must establish the
minimum owner-approved remote mail transport and wire it to the existing Better
Auth verification and magic-link callbacks. The Production profile must fail
closed when that transport or its protected configuration is missing, and
local/test mailbox settings must remain rejected in deployed profiles.

T-21.5 owns only the minimum provider selection, adapter/configuration wiring,
profile checks, and redacted delivery/health evidence needed for a safe
Production release. T-27 remains responsible for the broader authentication
completion work, including password-reset product flows, abuse controls, and
any later decision to support arbitrary Preview mail delivery. T-23 depends on
T-21.5; a controlled verified Preview account does not satisfy the Production
mail prerequisite.

<a id="td-028"></a>

## TD-028 — Agent-first current stack, with named exceptions

- **Status:** ACCEPTED
- **Related product decisions:** [D-009](PRODUCT.md#d-009)
- **Related technical decisions:** [TD-004](#td-004), [TD-005](#td-005), [TD-008](#td-008)
- **Related rules:** [RULE-010](../RULES.md#rule-010), [RULE-011](../RULES.md#rule-011), [RULE-012](../RULES.md#rule-012)
- **Source:** owner stack-selection guidance for coding-agent authors

Coding agents write this starter under the owner's direction. Non-trivial tasks
receive fresh independent agent review under
[the repository workflow](../../AGENTS.md#review-and-task-follow-through).
Pick the current, well-documented default of each accepted technology: the APIs
the installed versions in this repository actually teach.

Do not revive older framework modes because they dominate training data. Do not
require preview flags, experimental compiler options, or last-week surfaces as
baseline unless a Technical Decision already accepted them.

The in-repo illustration is Next.js. Use the App Router as this installed Next.js
version documents it: Server Components for reads, Server Actions for UI
mutations, and Route Handlers for JSON, auth, and webhooks. Do not fall back to
the Pages Router. Do not make Cache Components, `'use cache'`, or other opt-in
Next.js experiments a baseline requirement until this repository's installed
Next.js documentation treats them as the default.

These packages are accepted exceptions. Keep them. Do not replace them with
more-familiar alternatives, and do not freeze an older major because tutorials
still use it:

- Drizzle ORM and Drizzle Kit, including the installed 1.x line
- Better Auth
- Zod 4

When those APIs differ from older tutorials, follow this repository's code and
the installed package documentation. Do not turn the starter into a configurable
multi-stack framework.

<a id="td-029"></a>

## TD-029 - Shared backend logging with environment-local policy

- **Status:** ACCEPTED, planned implementation
- **Related product decisions:** [D-009](PRODUCT.md#d-009)
- **Related technical decisions:** [TD-015](#td-015), [TD-025](#td-025), [TD-026](#td-026)
- **Related test contracts:** [TST-LOGGING-001](TESTING.md#tst-logging-001), [TST-LOGGING-002](TESTING.md#tst-logging-002)
- **Later decision:** [TD-031](#td-031) selects the protected settings editing interface
- **Source:** owner-approved shared logger direction, 2026-09-18

Use a small reusable server-only Node logger facade backed by Pino, with
contextual logger objects and no interchangeable-provider framework. Record
meaningful backend boundaries and integration outcomes with stable events,
isolated request/job correlation and allowlisted metadata. Preserve generic
client errors, avoid duplicate reports of propagated failures, and exclude
secrets, personal content and raw error strings before serialization.

Store shared logging settings through Drizzle in the selected environment's
existing application PostgreSQL database. Each instance uses its last fully
validated policy, refreshed at bounded request/job boundaries. Log writes do
not query the database; outages retain the last valid snapshot, with enabled
`info` defaults at cold start. Global off, severity thresholds, exact module
overrides and exact event suppression govern facade events only.

The [Agent SPEC](../output/agent/SPEC.md#shared-backend-logging) owns policy
precedence, privacy, refresh and failure semantics. JSON deployed output and
readable local output must respect Node/Next request and process lifecycles.
This decision adds no browser logging, external telemetry service, health
endpoint or authority over independent framework/provider logs. This decision
left the settings writer's operator interface open; [TD-031](#td-031)
subsequently accepts it without changing this logger design.

[TD-030](#td-030) accepts a separately planned diagnostics extension. Its
authorization does not change this initial logger slice or its evidence.

<a id="td-030"></a>

## TD-030 - Optional application logs and grouped error diagnostics

- **Status:** ACCEPTED, planned implementation
- **Related product decisions:** [D-009](PRODUCT.md#d-009)
- **Related technical decisions:** [TD-029](#td-029), [TD-026](#td-026)
- **Related test contracts:** [TST-DIAGNOSTICS-001](TESTING.md#tst-diagnostics-001), [TST-DIAGNOSTICS-002](TESTING.md#tst-diagnostics-002)
- **Source:** owner-approved diagnostics extension, 2026-09-18

Extend the planned Node/Pino logger with optional central application logs and
grouped error reports through a small Strategy interface and exactly two
concrete adapters, Sentry and Better Stack. Select one provider per environment
at startup, including `none`; no live provider switching, dual export or generic
provider framework. TD-029's initial no-external-service scope remains intact.

Shared global/module/event vetoes apply to backend output and diagnostics,
including explicit exception reports. Each destination has independent numeric
log thresholds and off controls; explicit reports have their own enablement,
independent of log thresholds. Use the same environment-local versioned settings
snapshot/cache for live policy; provider selection and credentials remain
startup environment configuration. Remote export starts disabled and fails
closed on missing/invalid configuration, with no provider fallback.

The [Agent SPEC](../output/agent/SPEC.md#diagnostics-provider-adapters) owns
payload privacy, settings compatibility, error ownership, provider fidelity and
bounded lifecycle behavior. Application outcomes must survive diagnostics
failure. Browser instrumentation, replay, metrics, tracing, profiling, uptime,
alerts, health expansion and durable delivery are outside this extension.
Operational alerts are separately accepted in [TD-033](#td-033).
[TD-031](#td-031) subsequently accepts the protected settings editor; two fixed
adapters require no additional product choice. Implementation and hosted proof
remain future work.

<a id="td-031"></a>

## TD-031 - Protected TypeScript CLI for logging settings

- **Status:** ACCEPTED, planned implementation
- **Related technical decisions:** [TD-026](#td-026), [TD-029](#td-029), [TD-030](#td-030)
- **Related test contracts:** [TST-LOGGING-002](TESTING.md#tst-logging-002)
- **Resolves:** OD-026, protected shared logging settings editor
- **Source:** owner-approved protected CLI and TypeScript selection, 2026-09-18

Provide a repository-local terminal CLI in TypeScript to inspect logging policy
and its revision, then publish a fully validated replacement policy atomically
in the selected environment's existing application database. Require an expected
revision and reject stale edits. The CLI is a thin argument/output adapter over
testable typed core logic, using the existing `tsx`, pnpm, Vitest and typecheck
conventions. The [Agent SPEC](../output/agent/SPEC.md#shared-backend-logging)
defines the command and module boundaries.

Use existing operator credentials, kept outside arguments, policy files and
output, and explicit environment selection with existing target-identity guards
before writes. Credential access rights and those guards protect the operation;
the existence of a CLI does not grant authorization. Add no application admin
role, public endpoint, browser UI or new authentication system. Production
operations retain their existing protected authorization boundaries.

This resolves only the editor choice. Logger storage, cache, filtering and
diagnostics provider decisions remain unchanged. Implementation, verification
and separately authorized hosted work remain future work.

<a id="td-032"></a>

## TD-032 — Better Auth recovery and shared PostgreSQL abuse limits

- **Status:** ACCEPTED, planned implementation
- **Related product decisions:** [D-002](PRODUCT.md#d-002), [D-011](PRODUCT.md#d-011)
- **Related technical decisions:** [TD-004](#td-004), [TD-026](#td-026), [TD-027](#td-027)
- **Related test contracts:** [TST-AUTH-004](TESTING.md#tst-auth-004), [TST-AUTH-005](TESTING.md#tst-auth-005), [TST-AUTH-006](TESTING.md#tst-auth-006)
- **Source:** owner-approved T-27 account decisions, 2026-09-19

Implement D-011 through the installed Better Auth recovery APIs and existing
auth-mail boundary. Better Auth owns reset token expiry and single use; select
its supported automatic session revocation on successful password reset.
Preserve the ordinary verification/session lifecycle and environment-specific
mail policy.

Use Better Auth's supported per-IP limiting for relevant authentication paths
and a recipient-level bound at the auth-email boundary that also covers
automatic verification, reset and magic-link sends. Store shared counters in
the selected environment's existing application PostgreSQL database through
the supported integration. Verify atomic concurrent check/increment behavior
across instances; database-backed storage alone is insufficient evidence of
that guarantee. These counters are distinct from the logger's cached
configuration. Add no Redis, new service or generic rate-limiting framework.

The [Agent SPEC](../output/agent/SPEC.md#account-recovery-and-abuse) owns
installed-version integration caveats and the verification boundary. Exact
limits, windows, token lifetimes and copy remain grounded implementation
proposals within the accepted behavior. This extends TD-004 without replacing
the auth architecture or mail provider; implementation and verification remain
future work under [T-27](../../TODO.md#t-27-complete-authentication-product-flows-and-abuse-resistance).

<a id="td-033"></a>

## TD-033 — Operational alerts through Ports and Adapters

- **Status:** ACCEPTED, planned implementation
- **Source:** owner-approved notification architecture, 2026-09-19
- **Related:** [D-012](PRODUCT.md#d-012), [TD-030](#td-030), [TST-ALERTS-001](TESTING.md#tst-alerts-001)
- **Resolves:** OD-027, initial notification ownership, policy and transports

Use a small provider- and channel-neutral operational-alert contract and an
outbound notification port. Concrete adapters own transport credentials and
message formatting. Keep this boundary distinct from TD-030's diagnostics
Strategy, preserving supported native SDK behavior and existing privacy and
reporting ownership rules. Total-outage detection and delivery must operate
independently of the monitored application and its database; an in-app dispatcher alone cannot
satisfy that requirement. Coordinate provider-native and application-originated
notifications under one incident/notification owner.

Owner follow-up, 2026-09-19: use Better Stack Uptime's free tier for native
external outage monitoring and direct notifications, with no custom relay.
The reusable NotificationPort's initial implementation is the release-failure
Email adapter; native uptime and Sentry group notifications do not execute it.
Keep HTTP health/status
contracts and stable target URLs provider-neutral. Better Stack setup, monitor
intervals/confirmation/channel configuration and any provisioning code belong
in a thin operational integration or runbook, not application/domain health
logic. Add a provisioning port only for actual accepted provisioning code;
do not invent an unused runtime provider class or monitoring framework.
Provider replacement must not require business or health-logic changes.
This uptime choice is independent of TD-030's diagnostics Strategy.

The [runtime/alerts plan](../../docs/agentforge/plans/2026-09-19-t-26-runtime-safety-and-alerts.md#accepted-external-monitoring-and-remaining-alert-policy)
records dated primary-source free-tier and delivery-limit evidence. No Better
Stack incident-ingress adapter, custom relay or advanced paid escalation is
part of the accepted initial arrangement.

The later owner channel decision, 2026-09-19, selects Email only for initial
native uptime notifications. Slack, Telegram and Pushover are outside the
initial scope. The owner also accepted the Production-only app/database/CMS
native monitoring policy in [SPEC](../output/agent/SPEC.md#native-uptime-policy):
three-minute polling, a further three-minute failure confirmation, three-minute
stable recovery, one opening and one recovery Email, and no periodic reminders.
Apply these through the external monitor's operational configuration, preserving
component identity and one notification owner. The separately accepted
[application/tool conditions](../output/agent/SPEC.md#application-tool-alert-policy)
cover failed Production releases and new or regressed unexpected Production
error groups, with no Email per repeated occurrence or duplicate native uptime
notification.

Final owner selection, 2026-09-19: use Sentry Free as the initial Production
diagnostics provider and Sentry-native Email for new or regressed unexpected
Production error groups. Retain both Sentry and Better Stack adapters and
startup selection of `none`, `sentry` or `better-stack`; no dual export or
runtime provider switch. Native grouping, alert rules and notification settings
own group lifecycle and deduplication; suppress overlapping workflow/regression
emails so one group transition has one notification owner. Changing the selected
provider later requires compatible operational alert configuration/evidence,
not changes to application business logic.

Use a reusable provider-neutral `NotificationPort` with an initial Resend Email
adapter for failed Production releases, including migration/deployment/final
verification. Invoke it from the protected GitHub Actions release workflow,
without application or database availability, auth-mail admission or a custom
incident state machine/queue. Keep credentials, sender and configured recipient
in protected workflow configuration, never arguments or records. Recipient
selection is a setup prerequisite, not a new product decision. Stable release
attempt identity plus Resend idempotency provides duplicate protection within
the provider's 24-hour window, not permanent exactly-once delivery. Notification
failure is separately reported safely and must not hide or alter the original
failed release result. Preserve the existing protected release gates.

This resolves OD-027. Planning and consolidated task breakdown are authorized;
no account provisioning, provider operation, email send, paid
subscription, queue or implementation is authorized.
[Agent SPEC](../output/agent/SPEC.md#operational-alerts) owns the
boundary; the existing logger/diagnostics slices remain unchanged.

<a id="td-034"></a>

## TD-034 — Editorial Draft Mode within existing Sanity environments

- **Status:** ACCEPTED, planned implementation
- **Source:** owner-approved T-28 activation and environment clarification, 2026-09-19
- **Related product decisions:** [D-008](PRODUCT.md#d-008), [D-013](PRODUCT.md#d-013)
- **Related technical decisions:** [TD-018](#td-018), [TD-023](#td-023), [TD-026](#td-026)
- **Related test contract:** [TST-LANDING-004](TESTING.md#tst-landing-004)
- **Supersedes:** continued editorial-phase deferral in TD-023 and TD-026's published-only restriction solely for the editorial sessions described here

Use the installed Next.js Draft Mode and `next-sanity` integration with Sanity
Presentation, Visual Editing and Sanity Live. Permit the capability only in
explicitly configured Local, Development and Production editorial sessions,
using the existing dedicated project's `production` dataset. Application
runtime access remains read-only. Studio authoring and preview-secret creation
use the existing signed-in editor's Sanity permissions. Deployment Preview
continues to use the non-production `preview` dataset read-only, with no
editorial Draft Mode, draft token or live-authoring activation.

Use the supported `defineEnableDraftMode` helper to validate a private bearer
preview secret created by Studio. A separate server-side Viewer token suffices
to read the secret for validation and fetch drafts; it grants no CMS writes.
This handshake is not an application session or a fresh editor-membership
check on every request. The preview secret's validity and the resulting
Draft Mode session have separate lifetimes. Removing Studio membership does
not by itself revoke an already issued browser session or Viewer token;
document the supported exit, credential revocation and access-removal limits.
Disable shared preview access and verify that no previously enabled shared
secret remains active before hosted acceptance.

Supply only a read-only Viewer token to `defineLive`'s server/browser token
options. Deliver the browser token and mount live subscriptions and editing
controls only after the server confirms an allowed editorial session. Never
expose write-capable Studio/editor credentials to the application frontend,
put tokens in public environment variables, or record preview secrets in
logs/evidence. Restrict Presentation communication to trusted origins and
preserve the library's supported cookie and redirect handling. Missing or
invalid preview configuration fails closed for preview without requiring
preview credentials for ordinary published reads.

Keep draft reads and editing metadata separate from the published cache and
plain landing-content boundary. Ordinary visitors retain TD-023's published
reader, stable cache identity, signed webhook and protected manual recovery.
Draft subscriptions do not replace or broaden that invalidation service.
The [Agent SPEC](../output/agent/SPEC.md#editorial-draft-preview) owns integration
boundaries; implementation and provider/browser proof remain future work.

<a id="td-035"></a>

## TD-035 — Runtime target safety and dependency health

- **Status:** ACCEPTED, planned implementation
- **Source:** owner-approved remaining T-26 runtime baseline, 2026-09-19
- **Related:** [TD-026](#td-026), [D-012](PRODUCT.md#d-012), [TD-033](#td-033), [TST-RUNTIME-001](TESTING.md#tst-runtime-001)

Share pure environment/target rules between tooling and a runtime-specific
configuration boundary. Refuse unsafe client initialization without requiring
migration or provider-administration credentials in the application. Bind safe
runtime target/release identity to the observed deployment input; retain existing
provider project/ref/alias checks and avoid network work during import/build.

Provide bounded, provider-neutral app/database/CMS health with distinguishable
safe status, fresh CMS evidence and protected remote dependency probes. Probe
failure must not leak secrets or mislabel CMS degradation as whole-app downtime.
Deployment smoke checks actual runtime release identity and relevant readiness,
not just provider metadata or cached content. Reuse the existing database pool,
published-content validation and safe logging; add no metrics/tracing framework.
[SPEC](../output/agent/SPEC.md#runtime-health-safety) owns the detailed boundary;
the runtime plan and T-26.8–T-26.10 own implementation/evidence. Existing verified
environment/pipeline evidence stays historical, not proof of this extension.
