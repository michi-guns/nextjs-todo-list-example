# Technical Specification — Next.js Todo List Example

**Status:** generated Agent technical projection
**Authority:** [`../../RULES.md`](../../RULES.md), [`../../CONTEXT.md`](../../CONTEXT.md), [`../../decisions/PRODUCT.md`](../../decisions/PRODUCT.md), [`../../decisions/TECHNICAL.md`](../../decisions/TECHNICAL.md), [`../../decisions/EDGE-CASES.md`](../../decisions/EDGE-CASES.md), and [`PRD.md`](./PRD.md)
**Companion:** [`PRD.md`](./PRD.md) (generated product projection)
**Testing companion:** [`../../decisions/TESTING.md`](../../decisions/TESTING.md) (test policy and durable test contracts)
**Stack orientation:** See the supporting [technology stack](../../../docs/architecture/stack.md).

This projection is generated from the durable DWF Workspace. It is subordinate to the Agent PRD and does not own technical-decision rationale.

This document is the implementation contract. If code disagrees with it, either update the code or deliberately amend the owning Workspace state and regenerate projections.

---

## 1. Repository layout (target bowl)

Follow a domain-centered modular monolith. Application modules live under
`src/`; the existing root `db/` and `migrations/` seats are the canonical
database locations.

```text
.
├── app/                          # Next.js routes (composition only)
│   ├── (marketing)/              # public landing
│   ├── (auth)/                   # sign-in, sign-up, magic link
│   ├── (app)/                    # authenticated dashboard shell
│   └── api/                      # JSON Route Handlers (+ Better Auth handler routes as required)
├── components/                   # shadcn/ui and generic UI chrome
├── e2e/                          # Playwright tests
├── .dwf/                         # canonical product/technical design authority
├── db/                           # Drizzle client and schema
├── migrations/                   # generated/applied Drizzle migrations
├── src/
│   ├── sanity/                   # Sanity config, schemas, server client (when added)
│   ├── modules/
│   │   ├── auth/                 # thin auth integration if needed beyond library defaults
│   │   ├── landing/              # Sanity read path for marketing
│   │   ├── lists/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   ├── infrastructure/
│   │   │   └── presentation/
│   │   └── tasks/
│   │       ├── domain/
│   │       ├── application/
│   │       ├── infrastructure/
│   │       └── presentation/
│   └── shared/                   # tiny cross-cutting utils only
├── drizzle.config.ts
├── playwright.config.ts
└── package.json
```

The tree above is a logical bowl. Current seats:

- Public landing is `app/page.tsx`. `app/(marketing)/` is unused; do not add a second home page there.
- Sanity Studio schemas and config live under `sanity/`. `src/sanity/` is the application published-content client.
- List and task repository ports live in module `application/`, not `domain/`.
- Dashboard UI lives in `components/dashboard`. `src/modules/dashboard/presentation` is page-state helpers.
- List/task composition is `app/_todo-dependencies.ts` plus thin `app/actions` and `app/api` wrappers.

### 1.1 Module layers

Inside a capability module (add a folder only when it contains real code):

| Layer             | Responsibility                                                                                            | Must not                                           |
| ----------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `domain/`         | Entities, invariants, domain errors, repository **ports**                                                 | Import Next, React, Drizzle, Sanity, HTTP types    |
| `application/`    | Use cases / commands / queries, DTOs                                                                      | SQL, GROQ, JSX, Drizzle row types, raw Sanity docs |
| `infrastructure/` | Drizzle repositories, Sanity adapters, mappers                                                            | Leak persistence types into domain APIs            |
| `presentation/`   | Server Actions, Route Handler adapters, view models, Zod **input** schemas, UI pieces owned by the module | Core business rules; direct table imports in UI    |

### 1.2 Dependency direction

```text
presentation → application → domain
infrastructure → application ports + domain contracts
app (routes) → module presentation / application APIs
```

- `shared/` must not import from `modules/` or `app/`.
- Modules must not import from `app/`.
- Prefer root `db/` and `src/sanity` as seats; call them from module `infrastructure/`.

### 1.3 Next.js boundaries

- Default **Server Components**.
- **Client Components** only for real browser interactivity.
- **Server Actions**: authenticate → authorize → validate (Zod) → application use case → map errors → revalidate/redirect.
- **Route Handlers**: JSON API for lists/tasks (and auth routes as Better Auth requires). Treat as untrusted entry points; same authz + zod + use case path as actions where they mutate or read private data.

### 1.4 Starter architecture principles

- Keep cross-cutting foundations reusable without importing todo-specific concepts into them.
- Keep domain and UI responsibilities replaceable through the existing capability boundaries.
- Follow the current documented APIs for the installed stack, including the repository's required local Next.js documentation check. Prefer those APIs over stale tutorial modes and over unaccepted experimental surfaces ([TD-028](../../decisions/TECHNICAL.md#td-028), [RULE-012](../../RULES.md#rule-012)).
- Keep Drizzle ORM and Drizzle Kit, Better Auth, and Zod 4. Do not replace them with more-familiar alternatives, and do not freeze an older major because tutorials still use it.
- Prefer the simplest implementation that meets the accepted safety, correctness, operability, maintainability, and verification contract.
- Add modest complexity when it prevents meaningful rework or supplies a reusable safeguard. Do not build provider-swapping abstractions, speculative extension systems, or low-leverage machinery.

---

## 2. Auth (Better Auth)

### 2.1 Methods

- Email + password: sign-up, sign-in, sign-out.
- Magic link: request + consume.
- No OAuth/social providers in the current todo reference baseline.

### 2.2 Session rules

- Session required for all list/task reads and writes (UI and JSON API).
- Signed-out users only access marketing + auth routes.
- Each user may only access rows where `userId` matches the session user.

### 2.3 Listless private workspace side effect

When a signed-in user has **zero** lists, create default list:

- `name`: `"Inbox"`
- `userId`: session user id

Run this check whenever the authenticated private workspace loads. Keep it atomic and idempotent under concurrent loads: never create more than one automatic Inbox, and never create one when any list exists. After creation, the Inbox is an ordinary list and may be renamed or deleted. Deleting the final list results in a new empty Inbox on the next private workspace load.

### 2.4 Placement

- Better Auth handler routes under `app/api/auth/...` (or library convention).
- Drizzle adapter tables live in the root `db/schema` seat as required by Better Auth.
- Optional thin `src/modules/auth` for app-facing helpers (`requireUser()`, session DTO). Avoid duplicating library internals.
- In explicitly enabled local/test mode, the magic-link `sendMagicLink` adapter writes the generated email and verification URL to a temporary, gitignored, file-backed mailbox. The mailbox is unavailable outside local/test mode; exact path, format, and configuration names are implementation choices.

<a id="account-recovery-and-abuse"></a>

### 2.5 Account recovery and abuse resistance

[D-011](../../decisions/PRODUCT.md#d-011) and
[TD-032](../../decisions/TECHNICAL.md#td-032) accept this planned extension.
[T-27](../../../TODO.md#t-27-complete-authentication-product-flows-and-abuse-resistance)
owns subsequent planning and implementation; baseline auth evidence does not
verify the new behavior.

**Password recovery:** use Better Auth's request/reset APIs and
`emailAndPassword.sendResetPassword` through the existing `deliverAuthEmail`
boundary. Keep token generation, expiry, single consumption, password policy
and credential updates inside Better Auth. Return neutral request responses
for existing and absent accounts, including common failure/throttle paths;
avoid an account-existence timing signal from synchronous mail delivery. Any
background mail scheduling must use a supported server lifetime mechanism.
An expired, malformed or consumed link cannot change a password. Successful
reset uses `emailAndPassword.revokeSessionsOnPasswordReset: true`, revokes all
existing sessions and requires ordinary sign-in; existing session cookies must
fail subsequent authentication. Merely requesting mail, a rejected reset, or a
throttle must not revoke sessions, lock the account or change authentication
state.

**Verification recovery:** provide explicit resend from the pending state and
clear expired/invalid-link guidance with a fresh-link path. Preserve Better
Auth's normal verification and session behavior, including the existing
`autoSignInAfterVerification` policy. Bound resend frequency and automatic
verification sends. Do not replace verification with a second token system or
claim that its token semantics are identical to password-reset tokens.

**Shared abuse limits:** use supported Better Auth per-IP limits for relevant
sign-up, sign-in and auth-email HTTP paths, backed by the selected environment's
existing PostgreSQL database. Add a shared recipient budget for verification,
reset and magic-link mail through the auth-email boundary, including automatic
sign-up/sign-in sends and server-side calls. An IP change must not bypass that
recipient bound. Counter admission must atomically check and increment across
instances, including simultaneous first use and expiry; verify the real
Drizzle/PostgreSQL path. Do not use per-instance memory, logger configuration
caches, Redis, a new service or a generic limiter framework as counter storage.
Counter failure must not silently permit unbounded mail through a fallback.

Excess requests produce a temporary wait with clear, safe retry guidance;
there is no persistent account lockout. Any observable recipient cooldown
must be independent of account existence: throwing only from a real user's
send callback would create an enumeration signal. Preserve the framework's
neutral responses while enforcing the shared send budget. Keep passwords,
tokens, full auth URLs and recipient addresses out of logs and evidence.
The existing Local/Development/Preview/Production mail policies remain in
force; local mailbox evidence never establishes hosted delivery.

**Installed-version grounding:** Better Auth 1.7.5 supports database storage
and an atomic `customStorage.consume(key, rule)` integration. Its HTTP limiter
does not cover `auth.api` calls, defaults off in development, and derives keys
from trusted IP configuration; implementation must account for those boundaries
and prove intended limits without disrupting unrelated fixture setup. Use the
existing Drizzle migration workflow for any required schema, with TD-025's
branch-first hosted migration gate. Exact limits, windows, token lifetimes and
copy remain grounded implementation proposals, not unresolved broad product
choices. See [Better Auth recovery](https://better-auth.com/docs/authentication/email-password),
[rate limiting](https://better-auth.com/docs/concepts/rate-limit), and the
installed `better-auth/dist/api/routes/password.mjs` and
`better-auth/dist/api/rate-limiter/index.mjs`. OWASP permits either user-chosen
or automatic session invalidation; automatic invalidation here is the owner's
choice ([recovery guidance](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)).

Required future evidence is owned by [TST-AUTH-004](../../decisions/TESTING.md#tst-auth-004),
[TST-AUTH-005](../../decisions/TESTING.md#tst-auth-005) and
[TST-AUTH-006](../../decisions/TESTING.md#tst-auth-006).

---

## 3. Data model (Postgres)

Conceptual model (names may match Drizzle tables closely):

### 3.1 `lists`

| Column      | Type        | Notes                                                                  |
| ----------- | ----------- | ---------------------------------------------------------------------- |
| `id`        | uuid        | PK, database-generated with PostgreSQL 18 `uuidv7()`                   |
| `userId`    | text        | owner, indexed, FK to Better Auth user                                 |
| `name`      | text        | required, trimmed, 1–80 characters; unique per user case-insensitively |
| `createdAt` | timestamptz | required                                                               |
| `updatedAt` | timestamptz | required                                                               |

### 3.2 `tasks`

| Column      | Type        | Notes                                                                   |
| ----------- | ----------- | ----------------------------------------------------------------------- |
| `id`        | uuid        | PK, database-generated with PostgreSQL 18 `uuidv7()`                    |
| `listId`    | uuid        | FK → lists.id, cascade on list delete                                   |
| `userId`    | text        | denormalized owner for simple authz queries                             |
| `title`     | text        | required, trimmed, 1–200 characters; unique per list case-insensitively |
| `notes`     | text        | nullable, trimmed, maximum 5,000 characters                             |
| `status`    | enum/text   | `todo` \| `in_progress` \| `done`                                       |
| `createdAt` | timestamptz | required                                                                |
| `updatedAt` | timestamptz | required                                                                |

**Cascade:** deleting a list deletes all tasks in that list (DB-level ON DELETE CASCADE preferred).

**Auth tables:** per Better Auth + Drizzle adapter (users, sessions, accounts, verifications, etc.). Do not invent a parallel user table.

### 3.3 Migration workflow

- Treat versioned Drizzle migration files as the authoritative database transition path.
- Generate and review a versioned migration for each schema change.
- Before choosing migration history shape, classify the current targets as
  scaffolding-only, shared development, production, or unknown. While history
  exists only in safely recreatable pre-release targets, consolidate unreleased
  changes into one coherent migration and regenerate/commit the Drizzle
  snapshot metadata; once shared development or production adopts the history,
  keep applied migrations immutable and add a forward migration.
- Before schema-changing implementation, create a non-default Neon development branch from the current default branch.
- Apply the complete migration chain to an empty PostgreSQL 18 Testcontainer.
- Apply the new reviewed migrations to the Neon development branch and verify the hosted upgrade path.
- Apply the same reviewed migration to the default branch only after verification succeeds.
- `drizzle-kit push` may support local exploration but does not count as migration verification.
- Environment-aware migration commands must classify the target before mutation, use the direct `DATABASE_URL_UNPOOLED` role for Neon, and fail closed rather than falling back to a pooled remote `DATABASE_URL`. A `DATABASE_URL` fallback is permitted only after the target is proven to be direct local PostgreSQL.
- Exact Neon branch name, lifetime, and migration-promotion command remain implementation or delivery choices.

### 3.4 Required indexes and constraints

- Lists and tasks have primary keys.
- Tasks reference lists through a database foreign key with cascade deletion.
- A database-enforced case-insensitive unique key protects list names within one `userId`.
- A database-enforced case-insensitive unique key protects task titles within one `listId`.
- List and task identifiers use PostgreSQL's native `uuid` type with a `uuidv7()` default; owner foreign keys remain `text` to match Better Auth's `users.id`.
- List cursor reads use a composite B-tree index beginning with `userId`, followed by `createdAt` and the deterministic cursor tie-breaker, with direction matching oldest-first order.
- Task cursor reads use a composite B-tree index beginning with `userId` and `listId`, followed by `createdAt` and the deterministic cursor tie-breaker, with direction matching newest-first order.
- Do not add speculative status, notes, search, or partial indexes until measured query evidence requires them.
- Exact normalized-key representation, tie-breaker type, index names, and Drizzle syntax remain implementation choices.

### 3.5 Query and connection baseline

- Cursor queries keep their equality predicates and ordering aligned with the required composite indexes.
- Fetch at most `limit + 1` rows to determine whether another page exists; return at most `limit` items and derive `nextCursor` without a total-count query.
- Select only fields required by the application-facing result.
- Main list/task request paths use a small, bounded number of queries and do not issue one follow-up query per returned row.
- The application runtime reuses one module-level Drizzle/database client instead of creating one per request.
- Deployed application traffic uses a pooled Neon connection. Schema migrations use a direct Neon connection.
- Redis and application-level query caching are not part of the current starter baseline.
- Exact query composition, projections, instrumentation, client factory names, and environment-variable names remain implementation choices.
- Use `node-postgres` through `drizzle-orm/node-postgres` as the shared runtime driver in the Next.js Node runtime.
- Create one bounded, module-scoped `pg.Pool` and pass it to Drizzle; Better Auth and list/task repositories share that database boundary rather than creating independent pools.
- On Vercel, register the pool with `attachDatabasePool` from `@vercel/functions` for Fluid Compute lifecycle management.
- Use the pooled Neon URL for application traffic, the direct Neon URL for migrations, and the harness-generated local URL for Testcontainers. Do not create separate Neon and local repository implementations.

---

## 4. Domain rules

### 4.1 List

- Name length is 1–80 characters inclusive after trimming.
- Names are unique per `userId` under case-insensitive comparison. Preserve the accepted display value while enforcing normalized uniqueness at the database boundary.
- User can only mutate own lists.
- Delete list is always hard delete + cascade tasks (no soft delete in the current todo reference baseline).
- List reads order by `createdAt` ascending. Equal timestamps use a deterministic implementation-chosen tie-breaker.

### 4.2 Task

- Title length is 1–200 characters inclusive after trimming.
- Titles are unique per `listId` under case-insensitive comparison. The same title may appear in different lists; preserve the accepted display value while enforcing normalized uniqueness at the database boundary.
- Notes are trimmed and optional. On creation, omitted, `null`, empty, and whitespace-only notes normalize to `null`. On update, omitting `notes` leaves the value unchanged; explicitly providing `null`, empty, or whitespace-only notes clears the value to `null`.
- Notes have a maximum length of 5,000 characters after trimming.
- Status only one of: `todo`, `in_progress`, `done`.
- New tasks always begin with status `todo`.
- After creation, any valid status may transition directly to any other valid status. Reapplying the current status succeeds as an idempotent no-op.
- Task must belong to a list owned by the same user.
- Moving a task across lists is **out of scope** unless added later by amending this SPEC.
- Task reads order by `createdAt` descending. Equal timestamps use a deterministic implementation-chosen tie-breaker.
- Manual list and task reordering is out of scope.

### 4.3 Visibility filter

- Application/query supports `includeCompleted: boolean`, defaulting to `true`. An omitted value returns all stored tasks; the UI initially shows completed tasks and offers a toggle that hides `done` tasks.
- Completed-task filtering preserves the relative order of the remaining tasks.

### 4.4 Cursor pagination

- List and task reads use forward cursor pagination and return `{ items, nextCursor }`.
- `nextCursor` is opaque and is `null` when no later page exists.
- Cursor position follows the settled `createdAt` ordering plus the deterministic tie-breaker.
- Authentication, ownership, list membership, and completed-task filtering are applied independently of cursor data on every request.
- Malformed or context-incompatible cursors are invalid input. Exact encoding and signing remain implementation choices.
- Omitted `limit` defaults to 20; accepted limits are integers from 1 through 100.
- Page responses contain only `items` and `nextCursor`; total counts and numbered-page metadata are not part of the contract.

### 4.5 Concurrent writes

- List and task mutations do not require an entity version, `If-Match` precondition, or stale-write conflict.
- Update operations patch only fields supplied by the accepted request; omitted fields remain unchanged.
- When successfully committed mutations write the same field, later reads return the value from the last commit. Successfully committed disjoint patches may both remain visible.
- Authentication, ownership, Zod validation, not-found privacy, and database uniqueness enforcement apply independently to every concurrent request.

---

## 5. Application use cases (minimum)

### Lists

- `ensureDefaultInbox(userId)`
- `listLists(userId, { cursor?, limit? })`
- `createList(userId, { name })`
- `renameList(userId, listId, { name })`
- `deleteList(userId, listId)`

### Tasks

- `listTasks(userId, listId, { includeCompleted, cursor?, limit? })`
- `createTask(userId, listId, { title, notes? })`
- `updateTask(userId, taskId, { title?, notes?, status? })`
- `deleteTask(userId, taskId)`

All use cases enforce ownership. A nonexistent private resource and one owned by another user both return the same application-level `not_found` outcome so ownership is not disclosed.

---

## 6. Sanity (landing only)

### 6.1 Content

The repository uses a dedicated Sanity project and dataset containing one singleton landing document. Exact provider IDs and names remain setup choices. The singleton exposes:

- `headline` (string)
- `blurb` (text)
- `primaryCtaLabel` (string)
- `secondaryCtaLabel` (string, optional)

No list/task documents.

### 6.2 Runtime

- Server-side fetch on marketing page via `src/modules/landing` infrastructure adapter.
- Give published landing reads one stable cache identity behind the validated landing-content adapter.
- Expose one server-only, idempotent invalidation service for that cached content.
- Configure a Sanity webhook for relevant published singleton changes. Its Route Handler verifies the Sanity signature before trusting the event, rejects irrelevant or invalid requests, and calls the shared invalidation service.
- Provide a separately authorized manual recovery mechanism that calls the same invalidation service. Exact route or command shape and operator-authentication mechanism remain implementation choices; provider and operator secrets never enter client bundles.
- [TD-034](../../decisions/TECHNICAL.md#td-034) activates the planned [editorial preview integration](#editorial-draft-preview) for the next development cycle. It preserves the published-content baseline and its evidence.
- Until Sanity is wired, a temporary fallback is allowed only if clearly marked; remove fallback once CMS read works.

### 6.3 Seat

- Application published-content client and config: `src/sanity/`.
- Studio schemas and Sanity config: `sanity/`.
- Module adapter maps CMS payload → landing view model (no raw CMS types past infrastructure).

<a id="editorial-draft-preview"></a>

### 6.4 Editorial draft preview, planned

- Use existing Sanity Studio editor identity and the supported
  `defineEnableDraftMode` handshake. Studio creates a private bearer preview
  secret using the editor's existing permission; a server-only Viewer client
  reads it for validation. Application sign-in is not editorial authorization.
- Enable editorial Draft Mode only in explicitly configured Local, Development
  and Production profiles, against the existing `production` dataset. Deployment
  Preview remains on read-only `preview`, with preview activation refused and
  no draft token. These are session-specific read capabilities, not new runtime
  CMS write permissions or application roles.
- Preserve the helper's installed-version cookie and redirect behavior. The
  private preview secret's expiry is separate from the resulting Draft Mode
  browser session. The helper validates possession, not current user membership
  on every render. Removing Studio access does not itself revoke an existing
  draft session or Viewer token. Document actual exit/revocation behavior and
  limits; do not promise immediate per-editor revocation.
- Disable shared preview access. Hosted preflight must also confirm there is
  no previously active shared-access secret. Trust only the intended origins
  for Presentation communication and configure the required Sanity CORS access.
- Use `defineLive` with a read-only Viewer token for server and browser draft
  access. Only an allowed Draft Mode response may receive the browser token,
  live subscription or Visual Editing controls. Keep write-capable editor
  credentials out of the application frontend and all tokens out of public
  environment variables, logs and evidence. Missing/invalid configuration must
  fail closed for preview while ordinary published reads remain independent.
- Compose preview in the landing surface, excluding the embedded Studio route.
  Fetch draft content through landing infrastructure, validate unknown input
  and return the plain landing view model. Keep field-editing metadata in the
  presentation adapter. Provide click-to-edit for the singleton's fields and
  an explicit exit that returns to published content.
- Preserve the public reader, published cache identity, signed webhook and
  manual recovery service. Draft data must not enter the public cache or become
  an unauthenticated fallback. Sanity Live refreshes authorized preview only;
  it does not replace public webhook invalidation.

Implementation and verification remain planned. [TST-LANDING-004](../../decisions/TESTING.md#tst-landing-004)
owns the new local and real-provider/browser evidence; provisioning, content
mutation and deployment retain their existing authorization boundaries.

---

## 7. HTTP / Action API contract

The paths and parameter names below are stable API contracts.

### 7.1 JSON Route Handlers (session required unless noted)

| Method | Path                       | Body / query                        | Result                       |
| ------ | -------------------------- | ----------------------------------- | ---------------------------- |
| GET    | `/api/lists`               | `?cursor=&limit=`                   | `{ items, nextCursor }` page |
| POST   | `/api/lists`               | `{ name }`                          | created list                 |
| PATCH  | `/api/lists/:listId`       | `{ name }`                          | renamed                      |
| DELETE | `/api/lists/:listId`       | —                                   | deleted                      |
| GET    | `/api/lists/:listId/tasks` | `?includeCompleted=&cursor=&limit=` | `{ items, nextCursor }` page |
| POST   | `/api/lists/:listId/tasks` | `{ title, notes? }`                 | created task                 |
| PATCH  | `/api/tasks/:taskId`       | `{ title?, notes?, status? }`       | updated                      |
| DELETE | `/api/tasks/:taskId`       | —                                   | deleted                      |

Auth routes: Better Auth defaults under `/api/auth/*` (public where appropriate).

The private list and task JSON routes are same-origin application endpoints authenticated by the existing Better Auth browser session. Do not enable cross-origin access or accept bearer tokens, API keys, JWTs, or another machine credential for these routes. External agent or third-party access requires a later authentication and authorization decision.

For paginated GET routes, omitted `limit` means 20 and accepted values are integers from 1 through 100. Responses do not include total counts or numbered-page metadata.

Errors use consistent JSON `{ error: { code, message } }`: unauthenticated requests use `401`; missing and other-owned private resources both use `404` with code `not_found`; uniqueness conflicts use `409` with code `conflict`; invalid input, including malformed or context-incompatible cursors, uses `422`. Private list/task handlers do not expose a distinct `403` ownership response. Server Actions map the same application outcomes without revealing resource existence.

### 7.2 Server Actions

Parallel mutations for the dashboard UI (create/rename/delete list; create/update/delete task). Share zod schemas and application use cases with Route Handlers.

---

## 8. Validation (Zod)

- Define input schemas in module `presentation` (or shared validation only if truly identical and stable).
- Parse in Server Actions and Route Handlers before calling application.
- Do not trust client-only validation.

---

## 9. UI

- **Marketing:** landing consuming Sanity view model + links to auth.
- **Auth:** sign-up, sign-in, magic link request/consume UX sufficient for happy paths.
- **App:** dashboard-style shell (shadcn): sidebar lists, main task panel, status controls, show/hide completed, and visible `Load more` controls for lists and tasks while `nextCursor` is non-null.
- Loading another page appends records in the settled order. Changing the selected list or completed-task filter discards loaded task pages and starts again from the first page.
- Prefer composition patterns; avoid turning `components/` into a second domain layer.

---

## 10. Testing

The individual test obligations for this contract are owned by the [Testing Decisions and Test Contracts ledger](../../decisions/TESTING.md). Every implementation task must carry the relevant `TST-*` IDs and reconcile their evidence; the table below is a navigation map, not a duplicate test specification.

| SPEC area                               | Test contracts                                                                          |
| --------------------------------------- | --------------------------------------------------------------------------------------- |
| Auth and session rules                  | `TST-AUTH-001`–`TST-AUTH-006`                                                           |
| Data model, migrations, and connections | `TST-FOUNDATION-001`, `TST-MIGRATION-001`, `TST-HARNESS-001`, `TST-PERSISTENCE-001`     |
| Domain and application behavior         | `TST-LISTS-001`–`TST-LISTS-003`, `TST-TASKS-001`–`TST-TASKS-003`, `TST-CONCURRENCY-001` |
| Server boundaries and validation        | `TST-BOUNDARY-001`                                                                      |
| Sanity landing behavior                 | `TST-LANDING-001`–`TST-LANDING-004`                                                     |
| UI and browser acceptance               | `TST-UI-001`, `TST-E2E-001`–`TST-E2E-003`                                               |
| Neon performance                        | `TST-PERFORMANCE-001`                                                                   |
| Shared backend logging                  | `TST-LOGGING-001`, `TST-LOGGING-002`                                                    |
| Optional application diagnostics        | `TST-DIAGNOSTICS-001`, `TST-DIAGNOSTICS-002`                                            |

### 10.1 Vitest

- Location: colocated `*.test.ts` next to unit-tested modules.
- Scope for starter-baseline completion:
  - domain rules (status transitions/invariants as encoded)
  - application use cases (with mocked ports)
  - zod schema accept/reject cases
- These unit tests do not require PostgreSQL or Docker.
- Not required: full React component unit matrix.

#### Server entry contracts

- Keep domain and application tests as the main business-behavior suite.
- Give JSON Route Handlers request-level contract tests for successful requests, paginated response shape, unauthenticated `401`, privacy-preserving `404`, conflict `409`, and invalid-input `422` responses.
- Give Server Actions a smaller adapter suite covering authentication, input validation, successful result mapping, and expected error mapping.
- Do not repeat every business case across both server entry paths.

#### Coverage policy

- Do not impose a minimum code-coverage percentage.
- Give every behavior required by this SPEC suitable test evidence.
- Use coverage reports to identify possible gaps, not as a substitute for behavior-based acceptance.

### 10.2 PostgreSQL integration

- Use `@testcontainers/postgresql` with PostgreSQL 18.
- Start one ephemeral container for an integration suite run, apply the complete versioned Drizzle migration chain to its empty database, and stop it after the suite, including failure cleanup.
- Cover Drizzle repository mappings, case-insensitive uniqueness, list-to-task cascade deletion, ownership-aware reads and mutations, cursor pagination, concurrent default-Inbox creation, and last-successful-write behavior for same-field edits.
- Run repository integration tests serially by default while the suite shares one container.
- Every test creates and owns a unique user and its mutable records, remains independent of execution order, and does not rely on data left by another test.
- Parallel execution is allowed later only with an isolated database or schema per worker. Exact runner settings, rollback, truncation, identifier generation, and future worker-isolation mechanics remain implementation choices.
- Docker is a stated prerequisite for database-backed tests. If unavailable, those suites fail early and clearly rather than silently skipping; unit tests remain runnable.
- Local Testcontainers PostgreSQL is the default integration database. Routine integration tests do not require Neon credentials or network access.
- Destructive reset and cleanup helpers accept only the connection supplied by their harness-owned local container and refuse external database URLs.

### 10.3 Playwright

- Location: `e2e/`
- Chromium is the required browser for the normal local acceptance suite.
- Provide a separate, explicitly invoked cross-browser run for Firefox and WebKit before a public release and after major UI changes. Those engines are not part of every routine run and do not block ordinary starter-baseline completion.
- Happy paths minimum:
  1. Sign-up (password) or seed + sign-in
  2. Sign-in
  3. Create list
  4. Create task
  5. Change task status
  6. Load another task page from seeded data
  7. Sign-out
- The magic-link Playwright path clears the local/test mailbox, requests a link, reads the captured URL, and visits it to verify link consumption.
- One local test command starts PostgreSQL 18, applies the versioned migrations, loads a small deterministic behavior seed, starts a dedicated Next.js test server with the generated container URL, runs Playwright, and tears down both server and container.
- The behavior seed includes enough records for authentication, cross-user privacy, list/task behavior, completed filtering, and visible pagination.
- Run Playwright serially by default while its scenarios share one container. Each scenario owns its user and mutable records and does not rely on scenario order.
- Parallel Playwright workers require an isolated database or schema per worker and are not required for the current starter baseline.
- Playwright does not depend on Neon credentials or a developer's already-running application server.
- Routine Playwright uses deterministic test-only landing content through the application-facing landing contract and does not require Sanity credentials or network access. This source is unavailable in deployed runtime modes.
- Exact process wrapper, Playwright project and script names, browser-selection mechanism, ports, and seed-builder APIs remain implementation choices.
- CI is an accepted separate delivery workstream. When implemented, it runs
  repository verification without deployment, Preview-branch creation, Sanity
  mutation, or Production-secret access; it does not replace the local baseline
  or become an automatic Preview deployment.

### 10.4 Sanity verification

- Use local fixtures to test valid unknown-payload validation and mapping, optional landing fields, and missing or invalid required-content failures.
- Test the webhook boundary with valid and invalid signatures, relevant and irrelevant document events, and duplicate delivery. Invalid requests do not invalidate, and repeated valid requests are safe.
- Test that unauthorized manual requests cannot invalidate content and that an authorized request reaches the same invalidation service as the webhook.
- Local starter-baseline acceptance may exercise generated signed requests directly against the Route Handler. When a deployment is presented as release evidence, also verify one real Sanity webhook delivery through the deployed endpoint.
- Keep one separate read-only live smoke that uses the real Sanity client and query to fetch the published singleton from the dedicated project and dataset, validate it, and map it to the landing view model.
- The live smoke must pass before starter-baseline completion and before a deployment counts as release evidence. Missing configuration, missing or unpublished content, query failure, validation failure, or mapping failure is reported clearly rather than skipped.
- The live smoke never creates or edits Sanity content.
- Planned editorial-preview verification is owned by [TST-LANDING-004](../../decisions/TESTING.md#tst-landing-004): prove authorization refusal, environment/token boundaries, public/draft cache isolation, live changes, field navigation and exit. Fixture or ordinary Playwright evidence cannot replace its real Studio/provider/browser proof or the existing deployed webhook clause.
- Exact fixture representation, test-source wiring, command name, and evidence format remain implementation choices.

### 10.5 Performance evidence

- Maintain a repeatable Neon development-branch performance seed with approximately 100 lists for one user, 10,000 tasks in one large list, and records for another user.
- Run `EXPLAIN ANALYZE` for representative first-page and next-page list/task cursor queries, plus completed-task filtering when it produces a distinct query shape.
- At the representative volume, the intended composite indexes support the paginated access paths without a full sequential scan of the lists or tasks table.
- With Neon compute active and relevant data warm, a 20-record database query executes in under 50 ms.
- Verify correct item counts, ordering, continuation, and termination at the maximum 100-record page size.
- Keep the evidence repeatable and local/manual or integration-level. Do not make the timing threshold a per-commit CI benchmark or treat it as an end-to-end production SLA.
- Exclude network latency, authentication, rendering, CMS access, and Neon compute startup from the database execution measurement.
- Keep this performance seed separate from the small local behavior seed. Neon remains the verification environment for this section.

### 10.6 Local quality

- Husky + lint-staged on commit (eslint/prettier as configured in `package.json`).
- Scripts: `pnpm test`, `pnpm exec playwright test`, `pnpm typecheck`, `pnpm lint`.

### 10.7 Environment and delivery evidence

- Unit and static tests must cover the four `APP_ENV` profiles, required and conflicting configuration, origin validation, database target classification, pooled/runtime versus direct/migration role selection, safe redaction, local-mailbox restrictions, exact-ref resolution, and refusal before mutation.
- Local Testcontainers and unit evidence can prove profile and guard behavior only. It cannot prove a Neon branch, Vercel deployment, Sanity dataset, protected Environment approval, Production secret scope, or deployed browser path.
- CI may run automatically for repository verification, but it must not deploy, create Preview branches, mutate Sanity, or access Production secrets. Preview and Production workflows are manual and must emit the resolved commit and redacted target/deployment evidence.
- Preview evidence requires an isolated temporary Neon branch, direct migration, deterministic or sanitized seed, deployment-origin auth configuration, controlled verified-account authentication, application/browser smoke, and identity-checked cleanup/expiry. Production evidence additionally requires exact-ref CI gating, protected approval, the minimum configured Production mail transport, forward migration, deployment, post-deploy smoke, and a rollback reference.
- Missing hosted prerequisites leave the affected contract `specified` or `blocked` with a named follow-up; they must not be represented as verified by local tests or by a weaker mock.

---

## 11. Environment and delivery contract

The application uses an explicit `APP_ENV` with the values `local`,
`development`, `preview`, and `production`. Do not overload `NODE_ENV`: Next.js
continues to own `development`, `production`, and `test`. The local harness may
use `APP_ENV=local` with `NODE_ENV=test`.

Every profile must validate an application origin and matching
`BETTER_AUTH_URL`, a non-empty Better Auth secret appropriate to the profile,
the intended database provider/project/branch identity, the runtime and
migration URL roles, the Sanity project/dataset and mutation policy, the mail
policy, the secret namespace/owner, and the operations permitted for that
profile. A friendly branch label alone is not target identity.

| Profile     | Application and database target                                                                                                                                  | Sanity policy                                                                                                           | Mail policy                                                                                     | Permitted operations                                                                                                                                      |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local       | Explicit loopback origin; persistent Docker PostgreSQL 18; direct local `DATABASE_URL` and `DATABASE_URL_UNPOOLED`                                               | Dedicated project's published `production` dataset, read-only; local signed webhook/recovery checks may be exercised    | Temporary file-backed mailbox only in an explicitly enabled local/test process                  | Local migration, synthetic seed, and reset only after loopback/harness ownership is proven; no deployment                                                 |
| Development | Explicit local origin; owner-authorized durable non-default Neon branch; pooled runtime `DATABASE_URL`, direct migration `DATABASE_URL_UNPOOLED`                 | Dedicated project's published `production` dataset, read-only                                                           | Local mailbox may be used by the developer-owned process; no production delivery                | Direct migration and scoped synthetic seed; no reset or Production deployment                                                                             |
| Preview     | Deployment-assigned origin mirrored by `BETTER_AUTH_URL`; temporary Neon branch derived from durable Development, with pooled runtime and direct migration roles | Dedicated project's non-production `preview` dataset, read-only; no live authoring or CMS writes                        | Controlled pre-seeded verified account; local mailbox prohibited and no arbitrary outbound mail | Manual exact-ref preview, branch-scoped migration/seed, smoke, and identity-checked cleanup/expiry                                                        |
| Production  | Canonical HTTPS origin; separately provisioned protected Neon project and branch, with pooled runtime and direct migration roles                                 | Dedicated project's published `production` dataset, read-only runtime plus the trusted webhook/manual recovery boundary | Owner-approved production provider; local mailbox prohibited; release blocked until configured  | Manual exact tag/SHA release after CI evidence and protected approval; forward migration, deployment, smoke, and application rollback reference; no reset |

The matrix describes ordinary published runtime access. [TD-034](../../decisions/TECHNICAL.md#td-034)
adds the planned editorial-session exception in [§6.4](#editorial-draft-preview)
for Local, Development and Production using their existing `production`
dataset. Deployment Preview remains read-only on `preview`, with no editorial
Draft Mode or live authoring. This does not broaden runtime CMS write access.

For Local and Development, the origin is an explicitly configured local
process origin even though their database targets differ. `APP_ENV=development`
does not authorize destructive reset of the durable Neon branch. For Preview,
the controlled-account strategy covers the deployed authentication smoke;
arbitrary sign-up and magic-link delivery require a later remote-mail decision.

The current linked Neon project's default `main` is neither the durable
Development target nor the Production target by implication. Development must
name an owner-authorized durable non-default branch. Production must name a
separately provisioned protected project and branch; its concrete identity is
an owner-led prerequisite for the delivery tasks. The current temporary
agent-owned development branch is not a durable shared target.

`DATABASE_URL` is the application runtime role and `DATABASE_URL_UNPOOLED` is
the direct migration role. Neon migrations require the latter and must refuse
pooled-only configuration. Local direct PostgreSQL may use the same value for
both roles. The application and tooling may report safe labels such as
`appEnv=preview databaseTarget=neon-preview`, but never print a connection
string, token, password, mailbox URL, auth secret, or provider credential.

Preview delivery is manual and exact-ref based:

```text
workflow_dispatch(ref, preview-id)
  → resolve and record one immutable commit SHA
  → create and identify a temporary branch from durable Development
  → migrate through the direct URL and seed safe non-production data
  → deploy that SHA to Vercel Preview with its deployment-origin auth URL
  → run functional smoke and report URL, deployment id, branch id, expiry, SHA
  → clean up only the identity-matched branch, with an explicit expiry path
```

Production delivery is manual and protected:

```text
workflow_dispatch(ref = tag-or-sha)
  → resolve one immutable commit SHA and verify required CI evidence
  → verify the minimum configured Production mail transport
  → wait for protected Production approval
  → run the reviewed forward migration through the direct Production URL
  → deploy the same SHA to Vercel Production and run post-deploy smoke
  → record migration result, deployment id, rollback reference, and metadata
```

Migration remains separate from application boot. A failed application
deployment may use an application rollback reference, but the workflow must
not assume that a database down-migration is safe. CI has no deployment side
effect, and Preview/Production jobs receive only their scoped secrets.

<a id="shared-backend-logging"></a>

### 11.1 Shared backend logging

[TD-029](../../decisions/TECHNICAL.md#td-029) and its protected settings CLI in
[TD-031](../../decisions/TECHNICAL.md#td-031) define the accepted logging contract.
The database-independent core is implemented; shared settings and application
adoption remain planned. [Core evidence](../../../docs/agentforge/evidence/2026-09-19-logger-core.md)
records the current limits. Delivery is owned by [T-26.1](../../../TODO.md#t-261),
[T-26.2](../../../TODO.md#t-262) and [T-26.3](../../../TODO.md#t-263), with proof
defined by [TST-LOGGING-001](../../decisions/TESTING.md#tst-logging-001) and
[TST-LOGGING-002](../../decisions/TESTING.md#tst-logging-002).

These initial logger rules precede the separately accepted optional diagnostics
extension in [section 11.2](#diagnostics-provider-adapters).

- Provide a small server-only Node facade backed by Pino. Contextual logger
  objects carry module and request/job context without importing todo concepts
  into the shared core. Do not add a provider framework or import this Node
  logger into client components such as `error.tsx`.
- Instrument meaningful backend boundaries and integration outcomes. Report a
  propagated unexpected failure once at its owning boundary; routine auth,
  validation and domain refusals are not unexpected failures. Preserve existing
  generic client errors. Backend instrumentation does not capture browser-only
  failures or replace production/environment CLI result streams.
- Settings contain a global enabled flag, default severity threshold, exact
  module/category thresholds including `off`, and exact suppressed event names.
  Global off dominates. A matching module threshold replaces the default; a
  module set to `off` emits nothing. A named suppressed event never emits,
  regardless of threshold. Otherwise emit only at or above the effective
  threshold. No wildcard hierarchy is required.
- Persist settings through Drizzle in the existing application PostgreSQL
  database selected for that environment under TD-026. No environment reads or
  writes a shared Production control database. Future schema work uses an
  append-only migration and the existing TD-025 branch-first verification.
- Each instance caches one fully validated snapshot. At request/job boundaries,
  use elapsed time to trigger bounded, coalesced refresh; never query settings
  from a log write or require background timers to run in an idle serverless
  instance. Existing contextual logger objects consult current policy when
  emitting. Active instances converge after a successful eligible refresh;
  updates are not an instantaneous cross-instance switch. The implementation
  plan must justify its interval and read/retry bounds; 30 seconds is illustrative.
- Missing, invalid or unreadable settings retain the last valid snapshot.
  Before any valid snapshot, use enabled `info` with no module overrides or
  event suppressions. Bound retries after failure and do not recursively invoke
  the logger or its settings cache from refresh failure handling.
- Emit timestamp, severity, stable event name, module and `APP_ENV`, plus
  isolated server-generated request/job correlation where that context exists.
  Process-level events need not invent a request. Allow only defined outcome,
  duration and safe error metadata. Caller metadata cannot override trusted
  fields, and concurrent requests must not share context.
- Exclude credentials, tokens, URLs, email addresses, personal list/task text,
  raw payloads and email bodies. Key redaction alone cannot sanitize arbitrary
  message, cause or stack strings. Map failures to allowlisted diagnostic facts
  before Pino sees them; raw error objects and content must not reach its
  serializers. Apply filtering before constructing expensive debug metadata.
- Logger serialization/output failures must neither change application results
  nor replace the original error. Emit JSON in deployed runtime and readable
  local output. Verify Node/Next stdout/stderr, request completion, process exit
  and severity mapping against documented Vercel behavior; do not assume a
  buffered worker transport flushes safely. Actual deployed delivery proof
  remains separately authorized release evidence.
- Controls govern only future facade events. They cannot recover suppressed
  history or promise to suppress Next.js, provider or other independent logs.
- Provide the protected repository-local TypeScript CLI accepted in
  [TD-031](../../decisions/TECHNICAL.md#td-031). One future `pnpm logging` entry
  point supports `inspect` and `set --file policy.json --expected-revision n`.
  Require explicit environment and mutation-target selection with the existing
  profile/target-identity guards before writes; exact guard argument syntax is
  an implementation choice. Inspection returns policy and revision. Updates
  validate the full policy, publish one atomic snapshot in that environment's
  existing application database and reject stale expected revisions.
- Keep `scripts/logging/cli.ts` as the thin argument/output adapter and
  `scripts/logging/core.ts` as testable typed command logic, with focused
  `core.test.ts` tests. Follow existing `tsx` script commands, `pnpm test` and
  `pnpm typecheck`. During implementation, add `scripts/logging/**/*.test.ts`
  to the existing Vitest include list and confirm nonzero test discovery. The
  current strict TypeScript configuration already includes `**/*.ts`; no new
  test infrastructure is required.
- Use existing operator credentials from secure configuration, never command
  arguments, policy files or output. Access rights plus the existing target
  guards protect writes; the CLI alone grants no authorization. Add no
  application admin role, public writable endpoint, browser settings UI or new
  authentication system. Production writes retain their existing protected
  authorization requirements. Runtime target guards, health/readiness and
  external observability remain separate unfinished T-26 scope.

<a id="diagnostics-provider-adapters"></a>

### 11.2 Diagnostics provider adapters

[TD-030](../../decisions/TECHNICAL.md#td-030) accepts this later extension to the
planned logger. Neither stage is implemented. [T-26.4](../../../TODO.md#t-264),
[T-26.5](../../../TODO.md#t-265), [T-26.6](../../../TODO.md#t-266) and
[T-26.7](../../../TODO.md#t-267) own delivery; evidence belongs to
[TST-DIAGNOSTICS-001](../../decisions/TESTING.md#tst-diagnostics-001) and
[TST-DIAGNOSTICS-002](../../decisions/TESTING.md#tst-diagnostics-002).

- Provide optional central application logs and grouped error reports through
  a small Strategy interface with exactly Sentry and Better Stack adapters.
  Select one provider per environment at Node startup, or `none`. Credentials
  stay in environment configuration, never settings rows or payloads. No live
  provider switching, simultaneous providers or open-ended provider framework.
- Route each sanitized facade event independently to backend output and
  diagnostics. Shared global `enabled=false`, module `off` and exact named
  suppression veto both destinations, including explicit error reports. A
  destination's own off control or numeric log threshold affects only that
  destination. Resolve numeric default/module thresholds for each log destination
  before Pino; a console threshold must never prevent eligible remote export.
  Construct lazy metadata only when at least one destination accepts the event.
  Explicit `reportError` ignores log thresholds and requires shared veto checks,
  `diagnostics.enabled` and `diagnostics.errorReportsEnabled` to allow reporting.
- Extend TD-029's versioned environment-local snapshot and refresh cache, not
  another settings store. Preserve shared vetoes. On a legacy snapshot, retain
  numeric thresholds as console policy and default `diagnostics.enabled=false`,
  with a `warn` log minimum, `diagnostics.errorReportsEnabled=false` and
  separate per-module numeric overrides. An existing setting must never
  implicitly enable export. Validate the complete transition, preserve atomic/stale-write rules
  and use a forward migration if needed. The protected TypeScript CLI accepted
  in [TD-031](../../decisions/TECHNICAL.md#td-031) edits this extended policy.
- Existing contextual objects consult refreshed policy. Emission performs no
  database read. Last-valid fallback keeps its policy; cold fallback keeps
  remote export disabled until valid explicit enablement, a selected provider
  and valid configuration exist. Missing/invalid credentials disable export,
  contain failure locally and never select a different provider. A bounded,
  sanitized local notice must obey local policy.
- `SafeLogEvent` carries trusted timestamp, severity, stable event, module,
  `APP_ENV`, server-generated request/job correlation where present, bounded
  safe operation/outcome/duration and release when known. A separate typed
  error-report operation accepts `SafeErrorReport`, adding safe error
  class/code/static message, bounded sanitized source frame locations/cause
  facts and stable grouping fields. Error-level logs do not automatically
  create issues. An occurrence identifier differs from the issue fingerprint;
  grouping never includes request IDs or user text.
- Share the logger sanitizer. No raw `Error`, request, headers, cookies, query,
  secrets or personal content may reach providers. Re-allowlist the complete
  provider payload after SDK enrichment and before network transmission.
  Disable unselected user/request/environment capture, breadcrumbs, native
  Pino/console recapture, automatic exception reporting, tracing and profiling
  using supported installed-version integrations/hooks. Do not patch SDK
  internals. Use scoped context, never global per-user/request mutations.
- Use explicit facade adapters initially. Sentry log and error APIs are
  separate, with supported final-send filtering. Better Stack error ingestion
  may use its documented Sentry-compatible DSN, while application logs use its
  separate documented HTTP ingestion. Do not assume full Sentry Logs support
  from error-ingestion compatibility. Verify exact supported APIs against the
  versions selected during implementation before claiming adapter fidelity.
- The owning application boundary reports caught/mapped unexpected list/task
  action/route errors and swallowed integration failures. Next `onRequestError`
  owns unhandled render/route failures. Reported rethrows must not report again,
  including when Next supplies a transformed error/digest. One failure may
  produce one log and one issue report when independently enabled, never two
  reports from facade/framework/SDK capture. Skip expected auth, validation,
  domain and framework `redirect`/`notFound` control-flow failures.
- Initialize optional Node-only adapters once at startup. Bound payload size,
  queue size and network deadlines. Await bounded flush at request/job and
  framework-hook completion using the installed Next lifecycle contract; do
  not depend on background timers before serverless freeze or close a shared
  SDK every request. A policy change stops new exports, drops unsent queued
  records now disallowed and never replays suppressed history. It cannot
  recall data already in flight; cross-instance refresh is not instantaneous.
- Network errors, timeouts, quotas and queue overflow never affect application
  outcomes. Failure notices are bounded, sanitized, local-only and governed by
  local policy; they cannot recursively export diagnostics failures. No disk
  spool, retry framework or durable-delivery guarantee is accepted.
- Browser instrumentation, session replay, metrics, tracing, profiling, uptime,
  alerting and health/readiness expansion remain outside this diagnostics slice;
  [operational alerts](#operational-alerts) are separately accepted. Local
  adapter wire tests cannot prove hosted ingestion or issue grouping. Real
  provider evidence needs separate authorization and must cover each adapter
  before both are presented as ready for hosted use.

---

<a id="operational-alerts"></a>

### 11.3 Operational alert delivery boundary

[D-012](../../decisions/PRODUCT.md#d-012) and
[TD-033](../../decisions/TECHNICAL.md#td-033) accept automatic alerts as later
T-26 scope. Define a small provider/channel-neutral operational-alert value and
outbound notification port. Provider credentials, channel formatting and
transport calls belong in concrete adapters, never the shared contract or
application use cases. This is separate from the diagnostics Strategy for
storing logs and grouping errors; preserve its supported SDK behavior and
single-report ownership. Provider-native and application-originated incident
notifications must have one explicit owner, not parallel duplicate paths.

Total-outage detection and delivery must operate independently of the monitored
Next.js application and its database. Use the accepted Better Stack Uptime free
tier's native external monitoring and direct notification path, with no custom
relay. This native path does not execute the reusable notification port; that
port serves separately scoped application/tool events. Preserve one explicit
incident/notification owner across both paths.

Expose provider-neutral HTTP liveness/readiness/status contracts and stable
target URLs. No Better Stack SDK, types, credentials or provider branches belong
in application/domain health logic. Monitor targets, intervals, confirmation,
channel setup and any provider-specific provisioning belong in a thin
operational integration or runbook. A provisioning port/adapter is warranted
only for actual accepted provisioning code, not an unused runtime provider
class. Provider replacement changes operational integration/configuration,
not business or health logic; the diagnostics Strategy remains independent.

The [plan](../../../docs/agentforge/plans/2026-09-19-t-26-runtime-safety-and-alerts.md#accepted-external-monitoring-and-remaining-alert-policy)
records dated free-tier evidence, without promising indefinite pricing or free
advanced escalation/incident-ingress features. No account provisioning, paid
subscription, provider operation, queue or implementation is authorized.
Initial native uptime notifications use Email only. Slack, Telegram and
Pushover are outside the initial scope.

<a id="native-uptime-policy"></a>

#### Accepted native uptime policy

Owner-accepted on 2026-09-19; configure the native external monitors as follows:

| Concern               | Accepted behavior                                                                                                                                                                       |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Environment           | Production only; do not enable native monitoring for Local, Development or deployment Preview.                                                                                          |
| Components            | Distinguish application liveness, database readiness and CMS availability in status, monitor identity and notification context. CMS-only degradation is not total application downtime. |
| Polling               | Check each monitored target every three minutes.                                                                                                                                        |
| Incident confirmation | Open after failure persists for three minutes following first detection. This period is additional to polling/detection delay.                                                          |
| Recovery              | Resolve after three minutes of stable successful checks; a failed check during that period resets recovery confirmation.                                                                |
| Notifications         | One Email when the incident opens and one on recovery. No periodic reminder emails initially.                                                                                           |
| Ownership             | Native monitoring owns these incidents and their notifications; application/tool code must not send a second alert for the same condition.                                              |

Do not promise an alert within three minutes of actual failure onset: polling,
failure confirmation and provider/delivery latency contribute to elapsed time.
Keep timing/notification settings in the thin operational configuration, not
application health logic. Validate the configured opening/recovery notifications
and absence of repeated or duplicate delivery during separately authorized
provider evidence; documented settings alone do not prove actual delivery.

<a id="application-tool-alert-policy"></a>

#### Accepted application/tool alert conditions

Owner-accepted on 2026-09-19, alongside the initial Email-only channel:

- Failed Production release, including migration, deployment or final post-deploy verification.
- A new unexpected Production error group or recurrence of a previously resolved
  group. Auth-email delivery and data-persistence failures are examples, not a
  requirement to alert separately for every failed request or retry.

Group repeated occurrences without sending one Email per occurrence. Expected
user errors and ordinary warnings remain diagnostics. Native uptime incidents
must not trigger a second application notification. Keep one incident/notification
owner and the existing diagnostics grouping boundary; do not add a custom
incident state machine/queue, direct per-request Email or an unapproved paid
integration to satisfy these conditions.

#### Accepted initial notification ownership

| Condition                                          | Owner and delivery                                                                                                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production app/database/CMS availability           | Better Stack Uptime free-tier native detection and Email, under the native policy above; outside the TypeScript NotificationPort.                             |
| New or regressed unexpected Production error group | Sentry Free native group lifecycle and Email; outside the TypeScript NotificationPort. Configure Production filtering and a single native notification route. |
| Failed Production release                          | Protected GitHub Actions workflow calls the reusable NotificationPort through its initial Resend Email adapter; no app/database dependency.                   |

Sentry Free is the initial Production diagnostics selection. Keep both Sentry
and Better Stack adapters and startup configuration (`none`, `sentry`,
`better-stack`) under TD-030; no dual export or hot provider switch. Native
Sentry issue-alert and Issue Workflow notification settings can overlap, so
configure one owner for new/regressed-group Email and prove repeats do not
notify per occurrence. Quotas or disabled diagnostics can prevent ingestion;
record actual setup/evidence rather than claiming unconditional delivery.

The shared NotificationPort accepts a safe provider-neutral operational alert;
only its Resend adapter owns Email formatting and HTTP transport. The workflow
constructs a safe release-failure value from trusted run/ref/stage identity.
Keep this path independent of auth-mail callbacks, recipient rate-limit storage
and the failed application's database. Reuse the existing Resend service,
verified sender and bounded/sanitized HTTP conventions; no new service or SDK
is required merely to send a release alert. Secrets and recipient configuration
stay in the protected workflow, not arguments, published artifacts or logs.

Use stable release-attempt identity for idempotent retries with the same payload.
Resend retains idempotency keys for 24 hours; this is not permanent exactly-once
delivery. A new workflow attempt is a distinct release attempt. Report an alert
failure safely as a secondary outcome; preserve the original release failure,
exit status and evidence even if notification fails or times out. The provider
accepting a request is not proof of mailbox receipt.

OD-027 is resolved. No Better Stack incident-ingress adapter, custom relay,
queue or per-request direct Email is selected. Recipient setup is a prerequisite,
not an open product choice. Do not copy native uptime polling/recovery timings
onto error-group or release-failure events. Implementation and hosted operations
still require their stated prerequisites and execution authorization.
[TST-ALERTS-001](../../decisions/TESTING.md#tst-alerts-001) owns future evidence;
existing diagnostics tests cannot prove outage notification delivery.

<a id="runtime-health-safety"></a>

### 11.4 Runtime target safety and dependency health

[TD-035](../../decisions/TECHNICAL.md#td-035) extends the tooling environment
contract into runtime initialization. Share pure validation rules while keeping
runtime and operator inputs distinct: the app needs its pooled runtime URL,
not DATABASE_URL_UNPOOLED or provider administration credentials. Preserve
Preview's assigned origin and the build/runtime distinction. Compare configured
target identity with safe delivery-observed identity; labels alone are not proof.
Validation performs no provider/database I/O at import/build time.

Expose separate provider-neutral app liveness, database readiness and CMS
availability, with safe component/status and resolved release identity only.
Reuse the existing pool for a read-only database probe and fetch current
published CMS data without the indefinite content/CDN cache or Draft Mode.
Use bounded deadlines and actual resource acquisition/work, not an abandoned
operation behind a response-only timeout. Protect remote dependency probes with
a secret header and safe refusal; missing optional monitor setup does not break
ordinary app startup or count as monitored readiness. Never return target URLs,
credentials or raw errors. CMS-only failure must remain distinguishable.

Delivery smoke retains provider project/deployment/ref/alias checks and also
compares actual running release identity and relevant readiness. Preserve
protected release authorization. [TST-RUNTIME-001](../../decisions/TESTING.md#tst-runtime-001)
owns new evidence separately from the previously verified tooling contracts.

## 12. Implementation notes vs current scaffold

As of writing, the repo contains the runnable authenticated todo baseline: the
Next app router under `app/`, capability modules under `src/modules/`, the
shared node-postgres/Drizzle database boundary, the Sanity landing integration,
and the Vitest/Playwright/Husky quality tooling. This SPEC describes that
validated baseline and the accepted environment/delivery contract in section 11. Extend the existing `src/modules/*` and `src/sanity/` boundaries; do not
reintroduce the old scaffold or a parallel architecture in `lib/`. The
canonical design authority is `.dwf/`; Delivery artifacts, when created,
belong outside `.dwf/`.

The shared logger in section 11.1 and diagnostics extension in section 11.2
are accepted planned work. Their implementation and evidence remain outstanding;
the baseline checklist below does not cover them.

---

## 13. Definition of done (engineering checklist)

Checked items reflect the delivered baseline and the recorded evidence in the [testing ledger](../../decisions/TESTING.md). Neon migration evidence is recorded under [TST-MIGRATION-001](../../decisions/TESTING.md#tst-migration-001), and the original T-16 performance snapshot under [TST-PERFORMANCE-001](../../decisions/TESTING.md#tst-performance-001). These records do not claim a new hosted run. Current environment facts remain in [Project Context](../../CONTEXT.md).

- [x] Better Auth email/password + magic link working locally
- [x] Session guards on actions + JSON API
- [x] Drizzle schema: auth tables + lists + tasks + required constraints/indexes; migrations applied on Neon/dev DB
- [x] One module-scoped node-postgres pool backs Drizzle across Neon and Testcontainers and is registered for Vercel Fluid Compute lifecycle management
- [x] Exactly one default Inbox on every listless private workspace load, including after final-list deletion
- [x] List CRUD + cascade delete + case-insensitive per-user name uniqueness
- [x] Task CRUD + status + hide completed + case-insensitive per-list title uniqueness
- [x] Cursor-paginated list and task reads with opaque next cursors
- [x] Pagination defaults to 20, caps at 100, omits total counts, and is visible through dashboard `Load more`
- [x] Core list/task reads fetch at most `limit + 1`, avoid N+1 behavior, and use the required query-shaped indexes
- [x] Representative Neon seed and `EXPLAIN ANALYZE` evidence satisfy the agreed index-use, cursor-correctness, and warm-query baseline
- [x] Landing Sanity read path plus the read-only live fetch/validate/map smoke passes against the dedicated published singleton
- [x] Signed Sanity webhook invalidation and protected manual recovery share one idempotent cache-invalidation service
- [x] Zod at boundaries
- [x] Module layering respected for lists/tasks/landing
- [x] Vitest suite green for agreed scope
- [x] PostgreSQL 18 Testcontainers integration suite applies the real migrations and passes the agreed persistence cases
- [x] Playwright happy paths pass in Chromium against a harness-owned migrated and seeded local PostgreSQL container; Firefox and WebKit remain available as a separate on-demand check
- [x] Routine Playwright uses deterministic test-only landing content and requires no Sanity credentials or network access
- [x] Database-backed tests run serially against shared containers, own unique users/data, and do not depend on test order
- [x] Routine database-backed tests require no Neon credentials; destructive test cleanup refuses external database URLs
- [x] Husky + lint-staged active
- [x] README explains setup without referencing unrelated products

---

## 14. Boundary clarifications

These clarifications preserve the accepted architecture decisions without prescribing unnecessary physical source shape.

### 14.1 Capability ownership

The first-class capabilities are `auth`, `landing`, `lists`, and `tasks`. `src/shared/` remains small. Root `db/` and `src/sanity/` are infrastructure seats, not additional business modules.

### 14.2 Persistence boundary

Lists and tasks own the repository ports required by their application use cases. Drizzle adapters implement those ports inside the owning capability's infrastructure boundary. Domain/application code consumes module types and outcomes, never Drizzle row types. Lists belong directly to users; there is no `Workspace` persistence entity. Database constraints enforce case-insensitive list-name uniqueness per user and task-title uniqueness per list. Composite B-tree indexes follow the authenticated equality scope and deterministic cursor order for list and task reads; additional indexes require measured evidence. `ensureDefaultInbox` must be atomic and idempotent under concurrent listless workspace loads; list deletion relies on the database cascade contract.

### 14.3 Authentication boundary

The auth module exposes server-only application helpers equivalent to:

```ts
type CurrentUser = {
  id: string
  email: string
  name: string | null
}

getCurrentUser(): Promise<CurrentUser | null>
requireUser(): Promise<CurrentUser>
```

Pages, Server Actions, and Route Handlers do not expose Better Auth records or trust a client-provided owner id. Middleware redirects may improve UX but do not replace authorization at private operation boundaries.

### 14.4 Lists and tasks application boundary

Use cases receive the authenticated user id from the server boundary and enforce ownership:

```ts
ensureDefaultInbox(userId): Promise<List>
listLists(userId, page): Promise<Page<List>>
createList(userId, input): Promise<List>
renameList(userId, listId, input): Promise<List>
deleteList(userId, listId): Promise<void>

listTasks(userId, listId, options): Promise<Page<Task>>
createTask(userId, listId, input): Promise<Task>
updateTask(userId, taskId, input): Promise<Task>
deleteTask(userId, taskId): Promise<void>
```

The exact implementation may group or split these functions while preserving their ownership and observable behavior. List and task reads return forward cursor pages. List reads are oldest-first and task reads are newest-first, with deterministic tie-breaking. Tasks remain in one list; new tasks default to `todo`; completed tasks remain stored and may be filtered from reads without changing the relative order of remaining tasks. Cursor data does not carry ownership authority.

### 14.5 Landing/Sanity boundary

The landing module exposes a plain landing view model and repository/application read path. Sanity client setup, GROQ, external payload validation, mapping, and published-content cache identity remain infrastructure details. Raw CMS documents do not cross into application or presentation code. A signed webhook and a separately authorized manual recovery mechanism call one server-only, idempotent invalidation service. Once the real CMS read path works, missing/invalid required content is an explicit integration failure rather than an invisible permanent hardcoded fallback. Routine Playwright may substitute deterministic test-only landing content at the application-facing contract, but that source is unavailable in deployed runtime modes. The activated, planned [editorial preview integration](#editorial-draft-preview) adds isolated authorized draft reads and presentation metadata while preserving this published boundary.

### 14.6 Presentation boundary

`app/` is composition-only. Module presentation owns Server Actions, JSON handler adapters, Zod input schemas, view models, error mapping, and capability-owned UI. Actions and handlers follow:

```text
authenticate → validate → application use case → map result/error → revalidate/respond
```

### 14.7 Verification boundary

The implementation must prove domain invariants, application use cases with ports/fakes, Zod/auth boundary behavior, real PostgreSQL repository and constraint behavior through Testcontainers, local Sanity validation/mapping behavior, the live Sanity fetch/validate/map smoke, and the core Playwright journey in Chromium. Firefox and WebKit are separate on-demand compatibility checks. A complete React component unit matrix is not required.

### 14.8 Delivery boundary

The Delivery System consumes this SPEC and the PRD. It owns Roadmap,
Milestones, Phases, dependencies, readiness, lifecycle, acceptance,
verification, evidence, and implementation handoff. Its CI, Preview, and
Production workflows must implement the environment and target boundaries in
[section 11](#11-environment-and-delivery-contract); they must not add
task-level decomposition or rewrite this technical contract.

### 14.9 Boundary type sketches

These sketches are normative at the semantic boundary; implementation may choose equivalent file grouping and concrete error plumbing.

```ts
type UserId = string
type ListId = string
type TaskId = string
type TaskStatus = "todo" | "in_progress" | "done"

interface PageRequest {
  cursor?: string
  /** Defaults to 20; accepted range is 1–100. */
  limit?: number
}

interface Page<T> {
  items: readonly T[]
  nextCursor: string | null
}

interface List {
  id: ListId
  userId: UserId
  name: string
  createdAt: Date
  updatedAt: Date
}

interface Task {
  id: TaskId
  listId: ListId
  userId: UserId
  title: string
  notes: string | null
  status: TaskStatus
  createdAt: Date
  updatedAt: Date
}

interface ListRepository {
  listByUser(userId: UserId, page: PageRequest): Promise<Page<List>>
  findByIdForUser(userId: UserId, listId: ListId): Promise<List | null>
  ensureDefaultInbox(userId: UserId, now: Date): Promise<List>
  insert(input: {
    id: ListId
    userId: UserId
    name: string
    now: Date
  }): Promise<List>
  rename(
    userId: UserId,
    listId: ListId,
    name: string,
    now: Date
  ): Promise<List | null>
  delete(userId: UserId, listId: ListId): Promise<boolean>
}

interface TaskRepository {
  listByOwnedList(
    userId: UserId,
    listId: ListId,
    options: PageRequest & { includeCompleted: boolean }
  ): Promise<Page<Task>>
  insert(input: {
    id: TaskId
    userId: UserId
    listId: ListId
    title: string
    notes: string | null
    status: TaskStatus
    now: Date
  }): Promise<Task | "list_not_found">
  findByIdForUser(userId: UserId, taskId: TaskId): Promise<Task | null>
  updateForUser(
    userId: UserId,
    taskId: TaskId,
    patch: {
      title?: string
      notes?: string | null
      status?: TaskStatus
    },
    now: Date
  ): Promise<Task | null>
  deleteForUser(userId: UserId, taskId: TaskId): Promise<boolean>
}
```

Adapters keep Drizzle row types private. Repository methods enforce ownership through their query boundary; presentation does not coordinate raw table reads.

### 14.10 Current factual implementation prerequisites

The environment direction and target-safety choices are accepted in
[`TD-026`](../../decisions/TECHNICAL.md#td-026) and [`TD-027`](../../decisions/TECHNICAL.md#td-027).
The planned shared logger's protected TypeScript settings CLI is accepted in
[`TD-031`](../../decisions/TECHNICAL.md#td-031); implementation and authorized
execution remain future work. Current provisioning and verification facts
are recorded in [`../../CONTEXT.md`](../../CONTEXT.md), with delivery follow-ups
in [`../../../TODO.md`](../../../TODO.md). Use those records for current
Development, Preview, owner-domain and Production readiness instead of a
duplicated prerequisite snapshot. Verified provider setup does not establish
protected Production configuration or release evidence. These facts do not
authorize reset, promotion, deployment, or Production access.
