# Human Technical Guide — Next.js Todo List Example

This is a human-oriented projection of the [Agent SPEC](../agent/SPEC.md), including accepted planned work where labeled. It explains the implementation shape without becoming a second technical contract. Durable choices live in [`../../decisions/TECHNICAL.md`](../../decisions/TECHNICAL.md); individual testing obligations live in [`../../decisions/TESTING.md`](../../decisions/TESTING.md); product behavior remains owned by [`../agent/PRD.md`](../agent/PRD.md).

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

The repository is also a reusable starter. Cross-cutting foundations remain independent from todo-specific concepts, while domain and UI behavior stays replaceable through capability boundaries. Implementation follows current stable practices and chooses the simplest robust mechanism. Additional complexity needs a concrete reusable benefit; the starter does not add speculative provider-swapping or framework machinery.

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

The accepted, planned [T-27 recovery extension](../agent/SPEC.md#account-recovery-and-abuse)
keeps Better Auth responsible for password-reset tokens and sessions. A
successful reset revokes every existing session and requires sign-in; asking
for the email does not affect active sessions. Verification gains resend and
expired/invalid-link recovery while preserving its normal session behavior.
Per-IP limits and a shared recipient mail budget use the existing environment's
PostgreSQL database with atomic admission across instances. The budget covers
verification, reset and magic-link messages, including automatic sends. Limits
mean a temporary wait, preserve neutral account-existence responses and never
lock an account. No Redis, new service or logger configuration cache is involved.
[TD-032](../../decisions/TECHNICAL.md#td-032) records the technical decision;
implementation and its real database/browser evidence remain future work.

Local magic-link verification uses an explicitly enabled, temporary, gitignored, file-backed mailbox. Playwright clears it, requests a link, reads the captured URL, and visits it. The mailbox is unavailable outside local/test mode.

A missing private resource and one owned by another user produce the same application-level `not_found` outcome. JSON handlers map both to `404` with code `not_found`; Server Actions expose the equivalent generic result.

Uniqueness violations produce the application-level `conflict` outcome. JSON handlers map it to `409` with code `conflict`; Server Actions expose the equivalent conflict result.

PostgreSQL on Neon with Drizzle owns Better Auth records, lists, tasks, ownership, status, timestamps, uniqueness, and relational integrity. Lists belong directly to users; there is no `Workspace` persistence entity. Lists and tasks own their repository ports. Drizzle row types stay inside infrastructure. Database constraints enforce case-insensitive list-name uniqueness per user and task-title uniqueness per list. Composite B-tree indexes follow the user/list query scope and cursor ordering used by the main paginated reads. Paginated queries fetch only one row beyond the requested limit, project only required fields, and avoid per-row follow-up queries. The Next.js Node runtime uses one bounded, module-scoped node-postgres pool for Drizzle and Better Auth. Vercel registers that pool for Fluid Compute lifecycle management. Application traffic uses Neon pooling, migrations use a direct Neon connection, and Testcontainers supplies the local URL. Redis and application-level query caching are not required. Additional indexes are added only when measured query evidence justifies them. List deletion uses a database cascade, and default `Inbox` creation is atomic and idempotent whenever a private workspace loads with no lists. Schema-changing migrations are developed and verified on a non-default Neon branch before the same reviewed migration is applied to the default branch.

## Sanity boundary

Sanity is used only for landing content through a dedicated project and dataset containing one singleton landing document. Infrastructure validates unknown CMS payloads and maps them to a plain landing view model. GROQ, client setup, and raw Sanity documents must not cross into application or page code. Published landing reads have one stable cache identity. A signature-verified Sanity webhook and a separately authorized manual recovery mechanism call the same server-only, idempotent invalidation service. Webhook and recovery secrets remain server-side; the planned read-only preview-token exception is described below. After the real CMS path is wired, required-content failures are explicit integration failures rather than a permanent silent fallback. Routine Playwright may use deterministic test-only content through the same application-facing landing contract, but that source is unavailable in deployed runtime modes.

[TD-034](../../decisions/TECHNICAL.md#td-034) activates the next-cycle editorial
phase using Next.js Draft Mode, Sanity Presentation, Visual Editing and Sanity
Live. Implementation remains planned. Existing Studio editors create a private
preview secret; the supported helper validates it with a separate server-side
Viewer token. This is possession-based preview access, not an application role
or a fresh membership check on every request. The secret's validity and the
browser session have separate lifetimes. Removing Studio membership does not
itself revoke an existing draft session or Viewer token. The integration must
document its actual exit and revocation limits, with shared preview access
disabled and no previously active shared secret at hosted acceptance.

Only an allowed editorial Draft Mode response receives the read-only Viewer
browser token, live subscription and editing controls. Write-capable editor
credentials never reach the application frontend. Draft data stays outside
the published cache; the plain landing model remains intact and field-editing
metadata belongs to presentation. Preview credentials are unnecessary for
ordinary published reads, and invalid preview configuration fails closed.
The [Agent SPEC](../agent/SPEC.md#editorial-draft-preview) owns the integration
contract and [TST-LANDING-004](../../decisions/TESTING.md#tst-landing-004) owns
new browser/provider proof. Existing webhook and read-only smoke evidence
retains its original scope.

## Environment and delivery

The application uses an explicit `APP_ENV` value: `local`, `development`,
`preview`, or `production`. Next.js continues to own `NODE_ENV`; the local
test harness may pair `APP_ENV=local` with `NODE_ENV=test`. The full matrix and
guard contract are in [`TD-026`](../../decisions/TECHNICAL.md#td-026); the
Production mail prerequisite is in [`TD-027`](../../decisions/TECHNICAL.md#td-027);
and the implementation contract is in the [Agent SPEC](../agent/SPEC.md#11-environment-and-delivery-contract).

| Profile     | Database                                                                                          | Sanity and mail                                                                                                                           | Operations                                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Local       | Persistent Docker PostgreSQL 18; direct URL for runtime and migration                             | Dedicated published `production` dataset read-only; temporary file mailbox allowed only in local/test                                     | Migrate, synthetic seed, and reset only after loopback/harness ownership checks                                              |
| Development | Durable owner-authorized non-default Neon branch; pooled runtime URL and direct migration URL     | Dedicated published `production` dataset read-only; local mailbox may be used by the developer-owned process                              | Direct migration and scoped synthetic seed; no reset or Production deploy                                                    |
| Preview     | Temporary Neon branch derived from durable Development; pooled runtime and direct migration roles | Dedicated non-production `preview` dataset read-only; controlled pre-seeded verified account; no local mailbox or arbitrary outbound mail | Manual exact-ref workflow, branch-scoped migration/seed, smoke, cleanup, and expiry                                          |
| Production  | Separately provisioned protected Neon project/branch; pooled runtime URL and direct migration URL | Dedicated published `production` dataset read-only plus webhook/recovery; owner-approved provider; no local mailbox                       | Manual exact tag/SHA workflow after CI evidence and protected approval; forward migration, deploy, smoke, rollback reference |

The table describes ordinary published access. TD-034 adds a planned editorial
session exception for Local, Development and Production on their existing
`production` dataset, with read-only application runtime access. Deployment
Preview remains on `preview` with no editorial Draft Mode or live authoring.

The current linked Neon default `main` is not silently promoted to Development
or Production. The exact durable Development and protected Production
identities are provisioning prerequisites, not fallback values. Production
release also requires the minimum owner-approved remote mail transport; the
local mailbox is never a deployed fallback. Diagnostics may
show safe target names and metadata, but never connection strings, credentials,
tokens, mailbox URLs, or auth secrets. Preview and Production delivery are
manual; CI verifies the repository without deployment side effects.

## Shared backend logging

The accepted [shared logger design](../agent/SPEC.md#shared-backend-logging)
adds a small Pino-backed server logger for useful backend events, with request
correlation and safe metadata. Each environment keeps its settings in its own
existing application database. Instances refresh a cached policy during active
work; database failures preserve the last valid settings. Operators can disable
logging, change severity thresholds, override exact modules and suppress exact
events. Generic user-facing errors stay unchanged, and private content and raw
error messages stay out of logs.

The core and shared settings are implemented; application adoption remains
T-26.3 work. [Settings evidence](../../../docs/agentforge/evidence/2026-09-19-logger-settings.md)
records the current limits. [TD-031](../../decisions/TECHNICAL.md#td-031)
defines the protected repository-local TypeScript CLI to inspect policy and
revision, then publish a validated full policy atomically. It rejects stale
revisions and requires existing operator access plus explicit environment and
target checks. Credentials stay outside command arguments, policy files and
output. Production authorization remains required; this adds no application
admin role, public endpoint or browser UI. [T-26.1 through T-26.3](../../../TODO.md#t-261)
own implementation and verification. Browser-only errors, independent
framework/provider logs, health/readiness checks and external telemetry are
outside this logger slice.

## Optional diagnostics, planned follow-on

[TD-030](../../decisions/TECHNICAL.md#td-030) accepts central application logs
and grouped error reports after the logger foundation. A small Strategy
interface supports exactly Sentry and Better Stack. Each environment selects
one provider at startup, or none. Live settings control export through the same
database/cache as logging; credentials stay in environment configuration.

Shared global, module and event suppression controls apply everywhere. Console
and diagnostics thresholds remain independent. Remote export starts disabled,
and missing credentials never trigger a provider fallback. Only sanitized
events leave the server. Explicit error reports group repeated failures without
turning every error-level log into an issue or reporting one failure twice.

The [technical contract](../agent/SPEC.md#diagnostics-provider-adapters) bounds
queues and flush work so diagnostics failure cannot break application behavior.
Browser capture, replay, metrics, tracing and health expansion remain excluded.
[T-26.4 through T-26.7](../../../TODO.md#t-264) are future work. Neither adapter
is implemented or verified, and hosted readiness needs separate real-provider
proof. The protected CLI accepted in [TD-031](../../decisions/TECHNICAL.md#td-031)
will also edit the diagnostics policy; no editor choice remains open.

## Operational alerts, planned separately

[TD-033](../../decisions/TECHNICAL.md#td-033) selects Better Stack Uptime's free
tier for external outage monitoring and direct notifications, even when this
application and its database are down. No custom relay is required. Health
checks expose provider-neutral HTTP status contracts; provider setup belongs
in a thin operational integration/runbook so replacing the monitor does not
change business or health logic. Do not add an unused provider framework.

Separately scoped application/tool alerts retain a small outbound notification
port with formatting and credentials in adapters. Native downtime notifications
do not run through that port. One owner prevents duplicate incidents or
notifications, and the diagnostics Strategy stays independent. Initial native
uptime notifications use Email only; Slack, Telegram and Pushover are outside
the initial scope. The accepted native policy monitors Production only, with
distinct app/database/CMS status. Poll every three minutes, require another
three minutes of persistent failure after detection, then send one opening
Email. Send one recovery Email after three minutes of stable successful checks,
resetting recovery confirmation if a check fails. No periodic reminders are
included. Polling and delivery add to confirmation time; CMS-only degradation
must not be reported as total application downtime. The
[exact policy](../agent/SPEC.md#native-uptime-policy) stays in operational
configuration. [Separate accepted conditions](../agent/SPEC.md#application-tool-alert-policy)
cover failed Production releases (migration/deployment/final checks) and new
unexpected Production error groups or recurrence after resolution. Group repeats
without an Email for each occurrence; expected user errors and ordinary warnings
remain diagnostics and native uptime gets no duplicate application alert.
No custom incident queue/state machine or per-request direct mail is authorized.
The initial allocation is accepted: Sentry Free sends native group-transition
emails, while GitHub Actions uses a reusable NotificationPort with a Resend
Email adapter for failed Production releases. Native Sentry and uptime alerts
stay outside that port. Both diagnostics adapters remain available through
startup configuration. Release alerts need no running app/database, keep secrets
and the recipient in protected configuration, and cannot hide the original
release failure. Resend deduplication lasts 24 hours, not forever. OD-027 is
resolved; recipient/account access are setup prerequisites. The
[plan](../../../docs/agentforge/plans/2026-09-19-t-26-runtime-safety-and-alerts.md#accepted-external-monitoring-and-remaining-alert-policy)
records dated free-tier evidence without promising indefinite pricing or free
advanced features. No provider setup, paid subscription, notification adapter,
queue or runtime implementation is authorized yet.

## Runtime target safety and dependency health, planned

[TD-035](../../decisions/TECHNICAL.md#td-035) adds runtime-specific target
validation without giving the app migration/admin credentials. Separate bounded
app, database and fresh CMS health checks expose safe status; remote dependency
probes require an operator/monitor secret. Deployment smoke verifies the actual
running release and readiness alongside existing provider identity checks.
These extensions still need implementation and their own evidence.

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

The private JSON routes are same-origin application endpoints authenticated by the existing Better Auth browser session. The baseline does not enable cross-origin access or add bearer tokens, API keys, JWTs, or another machine-authentication flow. A future product may add external-agent access through a separate authentication and authorization decision.

List and task updates use patch semantics without version preconditions. Concurrent accepted writes to the same field use the last successfully committed value, while accepted patches to different fields may both persist. The application does not add stale-write errors or merge UI to this baseline; each request still enforces ownership, validation, privacy-preserving not-found behavior, and database uniqueness.

## Verification

Use layered proof:

- domain invariant tests;
- application tests with repository ports/fakes;
- Zod and auth/presentation boundary tests;
- PostgreSQL 18 Testcontainers integration tests using the real migrations for repository behavior, relational constraints, ownership, pagination, and default-Inbox concurrency;
- local Sanity fixture tests for validation, mapping, optional fields, and required-content failures;
- one separate read-only smoke that fetches, validates, and maps the real published Sanity singleton before starter-baseline completion;
- Sanity boundary tests for signature verification, event relevance, duplicate webhook delivery, manual authorization, and shared invalidation behavior;
- one real Sanity webhook delivery smoke when a deployment is presented as release evidence, while local acceptance may call the signed handler directly;
- the Playwright sign-in → list → task → status → sign-out journey in Chromium;
- a representative Neon development seed plus `EXPLAIN ANALYZE` evidence for the core cursor queries;
- correct maximum-size cursor pages and sub-50-ms warm database execution for a 20-record page;
- pnpm typecheck, lint, tests, and local commit hooks.
- environment-profile, target-classification, redaction, and refusal-before-mutation tests;
- controlled Preview lifecycle evidence and protected exact-ref Production evidence for their respective delivery contracts.

A full React component unit-test matrix and a per-commit performance benchmark are not required for the current starter baseline. The 50-ms target measures only warm database execution, not network, authentication, rendering, CMS access, or Neon compute startup.

Routine repository integration and Playwright tests use a harness-owned local PostgreSQL 18 Testcontainer. The harness applies the real migrations, loads a small deterministic behavior seed, starts a dedicated application server against that container, and cleans up afterward. Database-backed tests run serially while sharing a container. Each test owns a unique user and mutable records, remains independent of order, and does not rely on another test's data. Parallel workers require a separate database or schema per worker and are not required for the current starter baseline. Chromium is the required acceptance browser. Firefox and WebKit run separately on demand before a public release and after major UI changes; they do not multiply every routine database-backed run. Routine browser tests use deterministic test-only landing content and need neither Sanity nor Neon credentials. The separate live Sanity smoke uses the configured dedicated resource and is required before starter-baseline completion or release evidence. Neon keeps a separate role for migration smoke checks, cloud-driver compatibility, the heavy performance seed, query plans, and the warm-query target. Test cleanup refuses external database URLs.

## Current implementation prerequisites

The environment direction and target-safety choices are accepted in
[`TD-026`](../../decisions/TECHNICAL.md#td-026). Current resource and verification
facts live in [Project Context](../../CONTEXT.md), with remaining delivery work
in [TODO](../../../TODO.md). Verified Development, Preview or mail-provider
setup does not establish protected Production configuration or a completed
release. These facts do not authorize reset, promotion, deployment, or
Production access.
