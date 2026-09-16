# T-24 complete environment and pipeline evidence

Date: 2026-09-16. The [closeout plan](../plans/2026-09-16-t-24-pipeline-closeout.md)
reconciles the baseline from SPEC 10.7/11 and the testing ledger. This is an
evidence audit, not a new deployment or a Production failure experiment.

## Requirement-to-evidence matrix

| Required boundary                                                                                          | Executable evidence                                                                                                                                               | Real boundary evidence and limits                                                                                                                                                                                                                                                                    |
| ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Explicit Local, Development, Preview and Production profiles; required/conflicting settings and origins    | `src/test/environment/profile.test.ts`, `src/test/environment/contract.test.ts`                                                                                   | T-19 Local lifecycle, T-20 durable Development, T-22 Preview and T-23 Production records establish the corresponding targets. Local parsing alone does not establish hosted identity.                                                                                                                |
| Direct migration versus pooled runtime, matching project/branch/endpoint/database; refusal before mutation | `src/test/environment/guards.test.ts`, environment contract tests, Preview and Production core/runtime tests                                                      | Guarded Development migration and the controlled Preview/Production runs used their observed direct endpoints. Production read-only catalog has six expected tables and two journal entries.                                                                                                         |
| Local reset cannot reach Neon; Development cannot reset or masquerade as Production                        | Environment guards and `scripts/local-postgres/core.test.ts`                                                                                                      | T-19's recorded loopback lifecycle is separate from harness-owned PostgreSQL. No remote reset was attempted to prove a refusal.                                                                                                                                                                      |
| CI verifies without deployment or Production secrets; Preview/Production are manual                        | `src/test/pipeline/ci-workflow.test.ts`, `preview-workflow.test.ts`, `production-workflow.test.ts`                                                                | CI run `35115190232` passed both jobs. Vercel project metadata has no Git link, so provider Git auto-deploy is not enabled.                                                                                                                                                                          |
| Exact immutable revision, clean checkout, main ancestry and matching successful CI                         | Preview workspace tests; Production ref/process/core tests, including remote-ref shadowing regression                                                             | T-22 recorded SHA `1c8c38c7999347c7f2734b0a421be6bc86aab61b`; T-23 released `d639dfeeeca2932606c652cf5305ca3e0cd87a89` with exact main CI `35111932584`. Real read-only ref resolution and local migration rehearsal are recorded in T-23 implementation evidence.                                   |
| Temporary Preview branch, Development parent, expiry, scoped migration and deterministic seed              | Preview core tests and environment/seed guards                                                                                                                    | T-22 run `34840457016` created `preview-t22-20260914` from durable Development with expiry, migrated, seeded and deployed the same SHA.                                                                                                                                                              |
| Functional Preview authentication, lists/tasks, content and isolation                                      | Preview runtime smoke plus local browser privacy/mutation tests                                                                                                   | Independent Chromium and owner checks passed on the real Preview. Production still served its placeholder during that run. This is not Production authentication evidence.                                                                                                                           |
| Identity-checked explicit cleanup and expiry                                                               | Preview core failure/cleanup tests, including mismatched/durable/missing target refusal                                                                           | T-22 cleanup `34845688852` removed only its temporary branch; the orphaned Vercel Preview was removed with owner authorization. Read-only Neon inspection still lists only durable `development` and original `main`. Expiry was configured and observed; automatic expiry execution is not claimed. |
| Migration/seed/deployment/smoke failures stop later stages and report state                                | Preview injected-stage failures require explicit matching cleanup; Production injected failures retain separate migration/deployment status and recovery metadata | Controlled lifecycle proves the real providers; deterministic tests prove failure decisions. The failed T-22 checkout stopped before provider work. No deliberate Production failure or cleanup was performed.                                                                                       |
| Protected Production approval and secret scope; non-production jobs cannot consume the release settings    | Production workflow static tests, CLI Actions/main restriction, profile/target/ref guard tests                                                                    | Both real release runs waited for the required reviewer. `production` is main-only, admin bypass disabled. CI has no protected environment or provider secrets; Preview references its separate environment. Secret values were never read back or printed.                                          |
| Minimum Production mail transport and actual authentication                                                | Mail adapter/configuration failure tests and local auth/browser lifecycle tests                                                                                   | T-23's first real send failed although shape checks passed. Updating the protected credential and redeploying the same SHA produced an Inbox receipt and working magic-link/dashboard/sign-out journey. The old provider error remains unknown.                                                      |
| Forward migration, exact Production deployment, smoke, recovery record                                     | Production core/runtime/CLI tests                                                                                                                                 | Runs `35112456687` and `35114013699` passed. Final READY deployment `dpl_ERxkjWHpMbQakgKTVM81rPT5KuWf` has the approved SHA and canonical alias. Safe records distinguish all stages and retain schema-compatible recovery references. No down-migration or actual rollback is claimed.              |
| Published Sanity content and trusted invalidation                                                          | Read-path, signature/relevance/duplicate/recovery boundary tests                                                                                                  | The real Sanity read passed in each release. Two actual signed webhook attempts returned HTTP 200 after identical-content publishes, including the final deployment. No Production negative/recovery request was injected.                                                                           |
| Diagnostics and artifacts omit secrets, tokens and private message data                                    | Environment inspect/redaction tests, process-error tests, Production safe-record tests, browser diagnostic redaction tests                                        | Committed release artifacts contain target/deployment identifiers and stage metadata only. Mail observations omit the recipient and auth URL.                                                                                                                                                        |

Sources for hosted rows are the [T-22 lifecycle and cleanup](2026-09-14-preview-run.md),
[T-23 implementation/rehearsal](2026-09-16-production-release-implementation.md),
[T-23 live release and safe records](2026-09-16-production-release-live.md),
[Production protection](2026-09-16-production-mail-protection.md), and the
[testing ledger](../../../.dwf/decisions/TESTING.md). Earlier evidence retains
its original commit and run attribution.

## Fresh verification and reused checks

Preflight found Node `24.18.0`, pnpm `11.25.0`, installed Vitest and available
read-only provider sessions. `pnpm test:pipeline` passed **235 tests in 14 files**.
It includes environment configuration/guards, workflow/static tests, both
deployment orchestrators, and Production ref/process/runtime/CLI tests.

The starting merge `13a9dfee3a6c9a41184f1f3e4dc503fb67f5dbee` has the identical
tree to reviewed closeout `8405d8d2204f8f47ae30c58ff75c088b4a3653b4`.
[PR #39 CI 35115190232](https://github.com/michi-guns/nextjs-todo-list-example/actions/runs/35115190232)
passed Quality and Harness, executing typecheck, lint, 415 unit tests, migration
shape, build, 23 integration tests and eight Chromium journeys. The earlier
T-23 verification also passed all 24 Chromium/Firefox/WebKit journeys.
Application code, tests, dependencies and workflows have not changed since
those checks; this closeout only adds the plan, evidence and ledger/tracker
reconciliation. No weaker substitute for integration/browser proof is used.
The existing unused `Geist` lint warning remains recorded.

Read-only metadata corroboration on 2026-09-16 confirmed:

- GitHub `production` Environment `21297499656` requires reviewer `jimzord12`,
  permits only branch `main`, and reports `can_admins_bypass: false`.
- Production has the eight expected scoped secret names. Preview has its
  separate five names and no Resend, Production database URL or Sanity recovery
  secret. Same names such as `VERCEL_TOKEN` refer to separate Environment
  entries; secret values were neither retrieved nor compared.
- Original Neon project `curly-dust-60603928` contains only durable
  `development` (`br-super-leaf-axfwoi2e`, no expiry) and original `main`
  (`br-plain-block-axskh5gq`). The cleaned-up Preview branch is absent.
- Vercel project/team match the accepted identities, its Git link is absent,
  and its Production target is final deployment `dpl_ERxkjWHpMbQakgKTVM81rPT5KuWf`.

## Result and remaining scope

Every required baseline clause has matching evidence. `TST-ENV-001` and
`TST-PIPELINE-001` are now `verified`; `TST-PREVIEW-001`, `TST-RELEASE-001` and
the auth/migration/Sanity/browser contracts retain their verified statuses.
Verification is a recorded checkpoint, not continuous monitoring or a guarantee
that credentials, provider settings or domain delivery cannot change later.

T-24 is complete after fresh exact-tip independent review and passing CI.
T-25 can now reconcile the full operational documentation, followed by T-29's
derived-app guide closeout. T-26 still requires agreed observability scope;
broader T-27 and T-28 retain their product-decision prerequisites. No maintained
derived application or additional platform capability is implied.
