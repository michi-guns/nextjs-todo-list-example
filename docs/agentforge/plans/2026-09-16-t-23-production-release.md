# T-23 protected Production release plan

> AgentForge plan. Task breakdown lives in [TODO.md](../../../TODO.md#t-23-add-manually-approved-exact-ref-production-release).

**Status:** Accepted scope under the owner's 2026-09-16 instruction to continue T-23 autonomously. Implementation waits for the credential prerequisite below.

**Goal:** Release one reviewed tag/full commit SHA through CI, protected approval, forward migration, exact-revision deployment, smoke and a redacted recovery record.

**Spec and decisions:** [SPEC 11](../../../.dwf/output/agent/SPEC.md#11-environment-and-delivery-contract), [TD-025](../../../.dwf/decisions/TECHNICAL.md#td-025), [TD-026](../../../.dwf/decisions/TECHNICAL.md#td-026), [TD-027](../../../.dwf/decisions/TECHNICAL.md#td-027), [testing contracts](../../../.dwf/decisions/TESTING.md), and the [existing environment delivery plan](2026-08-31-t-18-environment-delivery-pipeline.md).

**Architecture:** Add a small Production adapter beside Preview. Reuse the existing environment parser and mutation guards. Resolve and check the candidate without Production secrets, then use a separate protected job. Keep migrations outside application startup.

**Global constraints:** Preserve the accepted Node/pnpm/Next.js/Drizzle stack and committed migration chain. No new dependency, schema change, seed, reset, automatic deployment, Preview rewrite or provider abstraction. No Production failure injection. The owner has authorized reviewed PR merges; real release execution retains the protected approval requirement.

## Current state and file map

- `scripts/environment/core.ts`: `parseEnvironmentProfile` validates Production origin, direct/pooled roles, remote mail, Sanity recovery secrets and namespace.
- `scripts/environment/guards.ts`: `ResolvedDeliveryRef`, `ProductionApproval`, `DatabaseConnectionObservation`, `assertMigrationAllowed` and `assertProductionDeploymentAllowed` already enforce the shared mutation contracts.
- `.github/workflows/ci.yml`: Quality and Harness provide build/unit/integration/Chromium evidence. Require the successful main-push CI run and both successful jobs for the exact candidate SHA; a different revision or unrelated successful workflow does not qualify.
- `scripts/deploy/preview/`: existing process, provider and smoke shapes are evidence for implementation conventions. Preserve its behavior; Production may use a small separate process wrapper so failures never expose raw provider output or secrets.
- New `scripts/deploy/production/ref.ts` and tests: full-SHA or explicit tag resolution, reachability in reviewed main history, checkout identity and exact-SHA CI checks.
- New `scripts/deploy/production/core.ts` and tests: typed stage sequence and safe release result. Injectable external operations support meaningful refusal/failure tests.
- New `scripts/deploy/production/runtime.ts` and tests: read-only Neon/Vercel identity observation, direct migration subprocess, Production deployment metadata verification and bounded HTTP smoke.
- New `scripts/deploy/production/cli.ts`: workflow entry point, safe fixed diagnostics, record writing and exit status. It does not load `.env.local`.
- New `.github/workflows/deploy-production.yml`: manual main-only workflow; ref/CI job without protected secrets; immutable-checkout release job under `environment: production`; pinned actions; serialized releases; always publish an available redacted result.
- `package.json`: add the release entry command and include its tests in `test:pipeline`.
- New `docs/runbooks/production-release.md` and release evidence; reconcile production-readiness, environment map, TODO and testing ledger with actual results.

## Dependencies and work order

T-18, T-20, T-21, T-21.5 and the accepted migration policy are complete. [Preflight evidence](../evidence/2026-09-16-production-release-preflight.md) records observed targets and the current credential blocker.

| Prerequisite                                              | Needed for                                                | Current evidence / unblock                                                                                                                                                      |
| --------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Installed dependencies, Node/pnpm, Git and GitHub access  | Implementation and local verification                     | Available; existing unit suite and hosted CI pass                                                                                                                               |
| Disposable local PostgreSQL through Docker/Testcontainers | Migration/integration verification                        | Docker server 29.7.2 available; do not use Neon as the test target                                                                                                              |
| Neon Production identity and correlated URLs              | Required release adapter boundary                         | Project `jolly-dew-32309276`, branch `br-purple-sea-a53v962l` / `main`, `neondb`; read-only query confirms PostgreSQL 18.6, no public tables or migration journal               |
| Vercel scoped deployment credential                       | Required implementation preflight and hosted verification | Existing CLI login cannot create a token (403); prepared project-only browser form awaits confirmation                                                                          |
| Production-only provider/database/auth/recovery settings  | Protected profile validation and release                  | Only mail settings currently exist; provision separate scoped credentials and generated auth/recovery values after the blocker is resolved, without copying Preview credentials |
| Published Sanity production content                       | Release smoke                                             | Existing `pnpm sanity:smoke` passes; deployed webhook configuration/delivery remains required for release evidence                                                              |
| Protected approval                                        | Real migration/deployment                                 | Required reviewer, no admin bypass, main-only policy already verified; approval must cover the concrete release                                                                 |
| Optional provider-native Neon branch protection           | Additional protection                                     | Unavailable on the current plan; accepted protection is the separately isolated project plus guarded protected workflow                                                         |

Complete the prerequisite before executable implementation, then build the ref/CI boundary, the guarded release adapter and workflow, and the recovery/evidence documentation in that order. Each coherent completed unit receives focused checks and independent review. Do not mark the parent task complete before its required hosted evidence.

## Release sequence and interfaces

1. Resolve only a full 40-character SHA or a tag through Git's explicit tag namespace. Refuse branch aliases, ambiguous input, non-commits and commits outside reviewed main history. Record `ResolvedDeliveryRef` and use its SHA for every later operation.
2. Require completed successful `ci.yml` main-push evidence for that SHA, including successful Quality and Harness jobs. Export the immutable SHA and CI run id; neither job receives Production secrets.
3. Wait at the existing protected `production` Environment. Checkout the exported SHA with persisted checkout credentials disabled. Install pinned tooling before injecting sensitive values into the release step.
4. Validate the complete Production profile and mail readiness, clean exact checkout, approval/SHA correlation, observed Neon project/branch/endpoint and Vercel project/team. Refuse an unexpected target before migration.
5. Record the current Production deployment as the rollback reference before changing anything. Require operator confirmation that its application is compatible with the forward schema. The known first-release placeholder may be identified by deployment id when it has no application commit metadata; document that it is a static maintenance fallback, not a prior working application release.
6. Apply the committed reviewed migrations through the guarded direct endpoint. Do not seed or reset. Record migration success before attempting deployment.
7. Deploy the exact checkout to the configured Vercel Production project. Pass the canonical origin and necessary runtime/build configuration, and verify deployment id, project, Production target, READY state and commit metadata through the team-scoped API.
8. Run bounded checks at the canonical origin for the landing/sign-in routes, unauthenticated auth/list boundaries, and the real Sanity read path. Verify canonical-origin assignment to the new deployment. Deployed browser/authentication and real Sanity webhook evidence must be recorded at their actual boundary, not inferred from these HTTP checks.
9. Write a safe `ReleaseRecord`: resolved SHA/ref, CI run, stage outcomes, observed non-secret target ids, deployment id, rollback deployment/commit when available, compatibility acknowledgement, actor/run id and timestamps. On deployment failure after migration, preserve the successful migration result. Emit no raw errors, connection strings, credentials, mail links or subprocess output. Never attempt automatic database rollback or reset.

The record should use finite stage outcomes (`not_started`, `succeeded`, `failed`) and an overall success/failure result. It must distinguish migration failure from deployment failure, and retain a known deployment id if smoke fails. Cancellation or runner loss can prevent final artifact writing; the runbook must direct the operator to inspect provider and migration state rather than assume no mutation occurred.

## Verification strategy

Affected contracts: `TST-RELEASE-001`, `TST-PIPELINE-001`, `TST-ENV-001`, `TST-MIGRATION-001`, `TST-LANDING-003`, and the relevant authentication/browser contracts. Reuse existing verified application evidence for unchanged behavior and distinguish it from deployed evidence.

- TDD for real Git ref resolution, invalid branch/ref refusal, exact checkout and exact-SHA CI gating.
- Focused orchestration tests prove approval/target refusal before mutation, migration-before-deploy ordering, failure state preservation and secret-free records. Test ordinary failures and plausible high-impact mismatches; avoid combinatorial fixtures.
- Static workflow tests prove manual/main-only trigger, immutable checkout, protected secret scope, action pins, stage ordering and always-attempted safe artifact publication.
- Run `pnpm test:pipeline`, `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, changed-file Prettier and `git diff --check`. Run `pnpm test:integration` and Chromium `pnpm test:e2e` through the disposable harness or valid exact-SHA hosted CI.
- Rehearse exact-ref/CI selection without Production secrets and the committed migration chain on disposable local PostgreSQL. Record the evidence as non-Production; T-24 retains its broader hosted failure/boundary obligations.
- Before presenting a public release, run the specified Firefox/WebKit journey. For real release evidence, capture protected approval, direct migration, matching deployment/SHA, canonical-origin smoke, actual browser path and one real Sanity webhook delivery as required by SPEC 10.4. Do not replace missing hosted evidence with unit results.
- Fresh independent review of the latest commit; fix actionable in-scope findings, rerun affected checks and obtain fresh review. Three unresolved substantive cycles require escalation.

## Risks and assumptions

- A tag can move: resolve once and pass only the SHA after the initial job.
- A successful unrelated CI run is insufficient: bind workflow, event, repository, SHA and required jobs.
- A deployment may fail after migration succeeds: preserve separate results and recover the app only after checking schema compatibility.
- The initial target is empty, but that observation is not permission to reset it or consolidate shared migration history.
- The Vercel placeholder is only a maintenance fallback. A subsequent release should retain a known compatible prior application deployment.
- Sanity webhook and deployed auth claims need actual hosted evidence. Missing configuration is a named blocker, not grounds to weaken the acceptance criteria.
- Credentials belong only in the protected Environment and deployment runtime. Provider API tokens and the direct migration URL should not be unnecessarily exposed to the running app.

## Handoff to task breakdown

Turn this approach into ordered T-23 checkboxes in TODO: finish prerequisite setup; implement and prove exact-ref/CI selection; implement and prove guarded migration/deployment/results; wire the protected workflow and recovery runbook; then perform authorized hosted verification and reconcile all evidence. This is the existing T-23 scope, not a new product decision or an independently authorized partial implementation.
