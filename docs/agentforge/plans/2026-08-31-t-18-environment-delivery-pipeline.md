# Environment and delivery pipeline implementation plan

> AgentForge plan. The environment direction is accepted; use the task breakdown
> in `TODO.md` for ordered implementation. Do not implement a later work package
> before its prerequisites and unresolved decisions are complete.

**Status:** Accepted

**Goal:** Give the starter four explicit run contexts—local, development,
ephemeral preview, and production—with fail-closed environment targeting,
manual full-stack preview deployment from an exact ref, manual production
release from an exact tag/SHA, and durable evidence that the pipeline itself is
correctly configured.

**Scope boundary:** This workstream improves the starter's environment,
delivery, verification, and operational foundations. It does not turn the todo
reference into a multi-tenant product, add automatic deployment for every pull
request, or silently promote the current Neon default branch to production.

## Accepted direction and open choices

The operator accepted these direction-level decisions during the design
conversation:

- Local development runs the application against PostgreSQL in Docker and
  continues to use the real hosted Sanity read path.
- Development means a developer runs the app locally while the application
  connects to a durable Neon development branch.
- A client preview is a fully functional deployed application, not a static
  visual capture. It receives an isolated, temporary Neon branch that can be
  migrated and seeded safely.
- Preview deployment is manual. It must be triggered through an explicit
  workflow input and must not run automatically for every pull request.
- Production deployment is manual and accepts a tag or commit SHA. The
  workflow resolves and records the exact commit that was deployed.
- Runtime traffic uses the pooled database URL; migration tooling uses the
  direct database URL. Local PostgreSQL may use the same direct URL for both
  roles.

T-18.1 resolves the remaining choices as the explicit contract in
[`TD-026`](../../../.dwf/decisions/TECHNICAL.md#td-026):

1. **Preview Sanity source:** use the dedicated project's non-production
   `preview` dataset read-only. Preview does not receive CMS write or live
   authoring credentials; the later T-28 decision owns live draft behavior.
2. **Preview email delivery:** use a controlled pre-seeded, verified account
   for the Preview smoke. The local file mailbox is prohibited in deployed
   profiles, and arbitrary Preview sign-up/magic-link delivery remains outside
   the contract until T-27 selects and verifies a remote-safe provider.
3. **Production database target:** use a separately provisioned, protected
   Neon project and branch. The current linked project's default `main` is not
   Production. The concrete project/branch identity remains an owner-led
   provisioning prerequisite for T-20/T-23 and cannot be hidden in code or an
   environment-variable fallback.

The matrix and guard semantics are canonical in TD-026 and the generated
[Agent SPEC environment contract](../../../.dwf/output/agent/SPEC.md#11-environment-and-delivery-contract).
No later task should guess these choices in code.

Ownership and follow-up are explicit: the repository/Sanity owner provisions
the dedicated Preview dataset for T-22; the authentication/release operator
owns the controlled Preview account and any later remote-mail decision in
T-27; and the database/release owner provisions and approves the protected
Production Neon project/branch through T-20/T-23. Until those external
resources exist, the affected tasks remain unready; this plan does not
authorize mutation, promotion, or deployment.

## Capability map

| Capability id             | Responsibility                                                                                 | Depends on                                                                    |
| ------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `environment-contract`    | Names, profiles, secrets, target classification, and fail-closed safety rules                  | Current DWF and baseline evidence                                             |
| `local-runtime`           | Persistent Docker PostgreSQL development mode while retaining hosted Sanity                    | `environment-contract`                                                        |
| `neon-development`        | Durable Neon development target, direct/pooled URLs, migration and seed workflow               | `environment-contract`, owner-authorized Neon target                          |
| `continuous-verification` | Automatic CI quality gates with no deployment side effects                                     | `environment-contract`, existing test harness                                 |
| `preview-delivery`        | Manually triggered, fully functional Vercel preview with isolated seeded Neon branch           | `neon-development`, `continuous-verification`, preview email/Sanity decisions |
| `production-release`      | Manually approved exact-ref release, migration, deployment, smoke, and rollback evidence       | `environment-contract`, `continuous-verification`, production target          |
| `pipeline-verification`   | Tests and controlled evidence for the complete environment and delivery lifecycle              | All delivery capabilities                                                     |
| `documentation`           | One coherent contributor/operator guide and reconciled current-state documentation             | All accepted environment decisions; implementation evidence                   |
| `post-baseline-hardening` | Runtime safety, observability, auth completion, Sanity live authoring, and derivation guidance | Pipeline baseline, with each item separately scoped                           |

**Build order:** `environment-contract` → `local-runtime` and
`neon-development` → `continuous-verification` → `preview-delivery` →
`production-release` → `pipeline-verification` → `documentation`.
`post-baseline-hardening` follows the verified delivery baseline and is kept
separate so it cannot expand the deployment task into a second product.

## Specification and decision authority

The current baseline remains governed by:

- [Agent PRD](../../../.dwf/output/agent/PRD.md), especially the starter reuse
  contract, baseline acceptance, and current non-goals;
- [Agent SPEC](../../../.dwf/output/agent/SPEC.md), especially the database
  connection, migration, Sanity, testing, and delivery boundaries;
- [Product Decisions](../../../.dwf/decisions/PRODUCT.md), especially D-001,
  D-002, D-005, and D-009;
- [Technical Decisions](../../../.dwf/decisions/TECHNICAL.md), especially
  TD-005, TD-009, TD-011, TD-014, TD-015, TD-018, TD-019, TD-023, and TD-025;
- [Testing Decisions and Test Contracts](../../../.dwf/decisions/TESTING.md),
  especially `TST-FOUNDATION-001`, `TST-MIGRATION-001`,
  `TST-HARNESS-001`, `TST-LANDING-002`, `TST-LANDING-003`, and
  `TST-E2E-001`–`TST-E2E-003`;
- [Documentation Protocol](../../../docs/documentation-protocol.md),
  [architecture overview](../../../docs/architecture/overview.md),
  [quality gates](../../../docs/development/quality-gates.md), and the
  [local verification runbook](../../../docs/runbooks/local-development-and-verification.md).

T-18.1 adds or amends the canonical technical and testing decisions before
implementation introduces new environment and delivery behavior. The
canonical contracts recorded by this task are:

- `TST-ENV-001` — environment profiles select the intended application,
  database, Sanity, and mail targets and reject unsafe combinations;
- `TST-PIPELINE-001` — the preview/release pipeline uses the selected ref,
  correct target, migration path, seed, cleanup, and failure handling without
  touching production during non-production work;
- `TST-PREVIEW-001` — a manually requested preview is isolated, seeded, fully
  functional, and traceable to its deployment SHA and temporary Neon branch;
- `TST-RELEASE-001` — a manually approved exact-ref production release applies
  the reviewed migration/deployment sequence and records post-deployment smoke
  evidence.

Their statuses remain `specified` until the implementation and evidence tasks
produce the required proof. They are not permission to create a second test
authority in `TODO.md`.

## Architecture

### Environment identity

Use an application-owned `APP_ENV` with the values `local`, `development`,
`preview`, and `production`. Do not overload `NODE_ENV`: Next.js reserves that
variable for `development`, `production`, and `test`, and its `.env*` loading
order is independent of the application's database-target identity.

Each environment profile must declare or derive:

- application origin and Better Auth URL;
- runtime `DATABASE_URL` and migration `DATABASE_URL_UNPOOLED`;
- expected database target/branch identity;
- Sanity project/dataset and whether CMS writes/webhooks are allowed;
- email transport and whether the local mailbox is permitted;
- secret namespace and deployment owner;
- whether destructive reset, seed replacement, migration, or deployment is
  allowed.

The application and tooling must produce only a redacted target summary, such
as `appEnv=preview databaseTarget=neon-preview`, never a connection string,
token, password, mailbox URL, or auth secret.

### Local context

Local development uses a persistent PostgreSQL 18 container managed by a
repository command or compose definition. The local app uses the direct local
connection for runtime and migrations, the existing local/test mailbox for
verification and magic-link flows, and the real Sanity client/configuration.
The local database reset command accepts only a loopback/harness-owned target.

Local should be explicit and safe even when a developer's `.env.local` happens
to contain a stale Neon value. A local command must fail before application
startup or mutation rather than silently using a remote branch.

### Development context

Development is a local Next.js process pointed at one durable, owner-authorized
Neon development branch. The app uses the pooled endpoint, while Drizzle uses
the direct endpoint for migration work. Development seed data is separate from
the small Playwright behavior seed and the heavy performance seed.

The currently existing Neon development branch is temporary and expires on
2026-09-02. T-20 must establish or obtain an explicitly durable target before
any workflow treats it as shared development. The existing Neon default branch
must not be reset as a shortcut.

### Preview context

The preview workflow is manual and exact-ref based:

```text
workflow_dispatch(ref, preview-id)
  → resolve and record commit SHA
  → create temporary Neon branch from durable development target
  → apply reviewed migrations through direct URL
  → seed safe non-production data
  → deploy the selected SHA to Vercel Preview
  → run functional smoke coverage
  → report URL, SHA, branch id, expiry, and evidence
```

The branch must be isolated from both development and production writes. It
must use sanitized or deterministic seed data rather than copying personal
developer records. The workflow must have an explicit cleanup/destroy path and
an expiry guard so abandoned previews do not become an unbounded resource
collection.

The preview must use a deployment-origin `BETTER_AUTH_URL`, a non-production
auth secret, and a remote-safe email strategy. It must not enable the local
filesystem mailbox. The Vercel deployment must receive Preview-scoped secrets
only.

### Production context

The production workflow is manual and protected:

```text
workflow_dispatch(ref = tag-or-sha)
  → resolve immutable commit SHA
  → verify required CI evidence for that SHA
  → wait for protected production approval
  → run reviewed forward migration through direct production URL
  → deploy the exact SHA to Vercel production
  → run production smoke checks
  → record SHA, migration result, deployment id, and rollback reference
```

Production migrations must remain separate from application boot and must
follow TD-025's forward-only policy once the target has shared data or real
users. A failed application deployment may be rolled back at the application
layer, but the workflow must not assume that a database down-migration is safe.

### CI and deployment separation

CI may run automatically for pushes and pull requests because it only verifies
the repository. Deployment workflows are separate and manual. Preview and
production jobs use scoped GitHub Environments; production requires an
approval gate and production secrets are unavailable to non-production jobs.

If Vercel Git integration remains connected, its automatic preview/production
triggers must be disabled or explicitly ignored so the manual workflows remain
the source of deployment truth.

## Current state and file map

Existing responsibilities that must be preserved:

- `db/db.ts` reads `DATABASE_URL`, creates the shared node-postgres pool, and
  registers the Vercel pool lifecycle hook.
- `db/pool.ts` owns bounded pool construction.
- `drizzle.config.ts` reads `.env.local` and prefers
  `DATABASE_URL_UNPOOLED` for migrations.
- `src/test/` and `scripts/playwright-local/` own the existing local
  Testcontainers/Playwright lifecycle and deterministic behavior seed.
- `scripts/verify-neon-performance/` owns the guarded Neon performance target
  check and must remain separate from ordinary local/preview seed behavior.
- `README.md` and `docs/runbooks/local-development-and-verification.md` own
  current contributor setup and migration/test guidance.
- `package.json` owns the command surface; new commands should be few,
  explicit, cross-platform where practical, and named by outcome.

New responsibilities are expected in these areas, subject to task-level review:

- `scripts/environment/` or an equivalent thin configuration seat for profile
  loading, target classification, and redacted diagnostics;
- `scripts/local-postgres/` or an equivalent local lifecycle seat for a
  persistent Docker developer database;
- `.github/workflows/` for CI, manual Preview, manual Production, and explicit
  cleanup/recovery workflows;
- `scripts/deploy/` or equivalent thin orchestration helpers for ref
  resolution, Neon branch lifecycle, migration/seed sequencing, and safe
  evidence output;
- `docs/architecture/` and `docs/runbooks/` for the environment matrix,
  preview operation, production release, rollback, and recovery guidance.

Do not create a generic provider-swapping framework. Keep Vercel, Neon,
GitHub Actions, Better Auth, and Sanity adapters behind small explicit
boundaries that are easy for a derived application to replace.

## Dependencies and work order

1. **T-18** establishes the contract, resolves the DWF/testing additions,
   defines the target classifier, and proves the guardrails in isolation.
2. **T-19** establishes the local Docker developer path. It may proceed in
   parallel with T-20 after the shared target contract is accepted.
3. **T-20** establishes the durable Neon development target and closes the
   currently blocked hosted migration prerequisite. It requires owner
   authorization or a newly provisioned non-default branch.
4. **T-21** adds automatic CI without deployment side effects. It consumes the
   existing local harness and the T-18 configuration/test contracts.
5. **T-22** adds manual full-stack Preview. It depends on durable development,
   CI, selected Preview email/Sanity choices, and Vercel/Neon credentials.
6. **T-23** adds manual Production release. It depends on CI, a defined
   production database target, exact-ref policy, and a release candidate or
   equivalent hosted evidence path.
7. **T-24** proves the complete pipeline with layered tests and controlled
   disposable hosted evidence. It must not use production as a test target.
8. **T-25** documents the implemented behavior and reconciles stale current
   state, commands, secrets, failure handling, and evidence boundaries.
9. **T-26** through **T-29** are intentionally later post-baseline work:
   runtime observability/safety, authentication completion, Sanity live
   authoring, and a derivation guide. They must not block the core environment
   foundation unless an accepted production risk makes them prerequisites.

## Verification strategy

Verification is layered; no unit test substitutes for a real boundary it is
intended to prove.

### Contract and configuration checks

- Unit-test profile parsing, required variables, origin validation, target
  classification, pooled/direct role separation, safe redaction, and forbidden
  local/preview/production combinations.
- Test exact-ref resolution for branches, tags, short SHAs, full SHAs, and
  ambiguous/unknown refs. Record the final SHA in workflow output.
- Test that local reset, remote migration, preview cleanup, and production
  deploy commands refuse the wrong target before mutation.

### Local runtime checks

- Start the persistent Docker PostgreSQL environment, apply the committed
  migration chain, seed safe local data, run the app, and execute the existing
  browser/API smoke path.
- Prove that the local path still reaches the real Sanity read path and that
  local auth links use the local mailbox.
- Prove failure cleanup for interrupted startup, migration failure, and seed
  failure.

### Preview checks

- Exercise the manual workflow against an isolated non-production Neon branch
  and Vercel Preview target when credentials are available.
- Prove migration, deterministic/sanitized seed, password authentication,
  task/list mutation, landing read, branch isolation, URL configuration,
  cleanup/expiry, and traceability to the selected SHA.
- Capture the preview URL, deployment id, branch id, commit SHA, and redacted
  smoke result. Never capture credentials, auth tokens, or mailbox contents.

### Production checks

- Exercise the workflow in a protected production environment only after the
  production target and migration history are explicitly approved.
- Prove tag/SHA resolution, required approval, direct migration sequencing,
  Vercel production deployment, post-deploy smoke, failure reporting, and
  rollback reference. Do not run a destructive rollback experiment against a
  real production target.

### Commands and evidence

The implementation tasks must add only the commands they can make truthful,
then run the existing project gates proportionately:

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
git diff --check
```

New focused commands should be named in the task that introduces them, such as
an environment inspection command, a local database lifecycle command, or a
pipeline contract suite. Hosted Neon/Vercel evidence must be redacted and
recorded outside `.dwf` where it contains operational details.

## Risks and mitigations

- **Wrong database target:** explicit `APP_ENV`, expected branch identity, and
  fail-closed local/reset/migration guards; never infer safety from a friendly
  branch name alone.
- **Preview data leaks or collisions:** isolated branch, sanitized/deterministic
  seed, separate credentials, short expiry, and explicit cleanup.
- **Remote preview cannot authenticate:** decide and test a non-production mail
  transport or controlled seeded-account path before T-22.
- **Sanity environment ambiguity:** decide Preview dataset/read policy before
  wiring deployment variables; preserve the real Sanity read path locally.
- **Migration drift:** direct migration URL, branch-first verification,
  immutable shared/production history, and no migration at app boot.
- **Automatic deployment bypass:** separate manual workflows and Vercel Git
  trigger suppression/ignore configuration.
- **Unreviewed production ref:** exact tag/SHA input, resolved-SHA evidence,
  CI gate, protected Environment approval, and deployment record.
- **Stale design context:** reconcile `.dwf/CONTEXT.md` and supporting docs from
  verified current source/evidence instead of silently treating the original
  scaffold snapshot as current.
- **Overgrown abstraction:** keep environment logic as explicit profile and
  workflow adapters; do not introduce a generalized deployment platform.

## Handoff to task breakdown

Create the following ordered delivery tasks in `TODO.md`:

- **T-18:** Environment contract and fail-closed target guardrails, with
  subtasks for authority/contract reconciliation, profile/secret design,
  target classification, and focused guard tests.
- **T-19:** Persistent local Docker PostgreSQL development mode while retaining
  hosted Sanity.
- **T-20:** Durable Neon Development target, direct/pooled configuration,
  migration smoke, and safe development seed.
- **T-21:** Automatic CI quality gates with no deployment trigger.
- **T-22:** Manually triggered full-stack Vercel Preview with isolated seeded
  Neon branch and cleanup.
- **T-23:** Manually approved exact-ref Production release with migration,
  deployment, smoke, rollback, and remaining hosted baseline evidence.
- **T-24:** End-to-end environment and delivery pipeline test suite/evidence.
- **T-25:** Comprehensive environment, deployment, recovery, and current-state
  documentation.
- **T-26:** Runtime safety and observability hardening.
- **T-27:** Authentication completion and abuse resistance.
- **T-28:** Sanity authenticated preview/live authoring.
- **T-29:** Derived-application extension and replacement guide.

T-18 through T-25 are the core environment workstream. T-26 through T-29 are
recorded follow-on tasks and should not be started until the core pipeline has
been reviewed and verified.
