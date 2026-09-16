# T-23 implementation and local release rehearsal

Date: 2026-09-16. This records implementation and non-Production verification.
The later [live release evidence](2026-09-16-production-release-live.md) records
the authorized protected runs, credential repair and successful live checks.

## Reviewed merge and release candidate

Fresh independent review approved the complete implementation commit
`7c9f1a923467389e9bd59a64117b440df2b1e701`, with 76 independently run focused tests
passing. [PR #38](https://github.com/michi-guns/nextjs-todo-list-example/pull/38)
merged it as `d639dfeeeca2932606c652cf5305ca3e0cd87a89`. The two Git trees are
identical (`fcbde8968a5d12221b17484bb4bc38f82c044000`). PR CI
[35111580645](https://github.com/michi-guns/nextjs-todo-list-example/actions/runs/35111580645)
and exact main-push CI
[35111932584](https://github.com/michi-guns/nextjs-todo-list-example/actions/runs/35111932584)
both passed Quality and Harness.

A final `BEGIN READ ONLY` inspection confirmed that the accepted Production
database still has no public tables and no migration journal. The initial
chain creates the historical scaffold `posts_table` in its first migration
and drops it in the second; the final schema has the six tables listed below.
Concrete owner approval for this candidate's migration/deployment and live
verification was requested separately. No protected release has run at this
checkpoint.

## Implemented boundary

The [accepted plan](../plans/2026-09-16-t-23-production-release.md) is implemented
through the ref/CI selector, guarded stage runner, Neon/Vercel adapter, CLI,
manual protected workflow and [release runbook](../../runbooks/production-release.md).
The workflow resolves a tag/full SHA and successful main-push CI before waiting
at `production`. Its protected job uses that immutable checkout, rechecks the
CI attempt and target identities, migrates directly, deploys, smokes, and writes
separate stage outcomes with recovery metadata. No seed, reset or automatic
database rollback path exists.

The provider adapter uses observed Neon branch/endpoint/database and Vercel
project/team/deployment identities. Runtime receives only application settings,
not the direct migration URL or provider API tokens. Read-only provider checks
confirmed the configured branch/database, direct endpoint, and READY Production
placeholder `dpl_GRpcAgtr9BZ7QcsUNHX259WAvLin`. These reads used the operator's
existing CLI sessions; they do not prove the protected job's new token access.

## Verification

The full `pnpm test` suite passes 415 tests across 42 files.

| Check                                                    | Result                                                                   |
| -------------------------------------------------------- | ------------------------------------------------------------------------ |
| `pnpm exec vitest run scripts/deploy/production`         | 62 tests across five files passed                                        |
| `pnpm test:pipeline`                                     | 235 tests across 14 files passed                                         |
| `pnpm typecheck`                                         | Passed                                                                   |
| `pnpm lint`                                              | Zero errors; existing unused `Geist` warning in `app/layout.tsx` remains |
| `pnpm build`                                             | Passed Next.js compilation, types and route generation                   |
| `pnpm exec drizzle-kit check --config drizzle.config.ts` | Passed migration shape check                                             |
| `pnpm test:integration`                                  | 23 tests across six files passed on disposable PostgreSQL                |
| `pnpm test:e2e:cross-browser`                            | 24 journeys passed across Chromium, Firefox and WebKit                   |
| Browser diagnostics regression                           | Nine tests passed, including six new cancellation-boundary cases         |

The real read-only command `pnpm release -- resolve --ref e3ee5c0c63d34f81358243496cafe8777db5f785`
returned the same immutable SHA and successful main-push CI
[35107944387](https://github.com/michi-guns/nextjs-todo-list-example/actions/runs/35107944387),
attempt 1. The GitHub token was supplied only through the process environment.

A separate harness-owned local container ran the installed `drizzle-kit migrate`
command with explicit direct loopback URLs. It applied the two committed
migrations and reported two `drizzle.__drizzle_migrations` entries plus the
expected `account`, `lists`, `session`, `tasks`, `users` and `verification` tables.
The container was stopped by the harness. No hosted database was used.

## Findings resolved during implementation

- The independent review of the initial ref selector found that a tag named
  `origin/main` could shadow the remote-tracking reference. The anchor now uses
  `refs/remotes/origin/main`; the added test failed before the fix and passed
  afterward. Fresh independent review approved ref/core commit `b2c1d2a` with
  45 tests across three files. The complete implementation later received the
  final latest-commit approval recorded above.
- The first cross-browser run passed eight Chromium journeys, then failed
  Firefox diagnostics after the core journey completed. The reported failure
  was an interrupted GET for a Next.js static JavaScript chunk with
  `NS_BINDING_ABORTED`. Installed Playwright 1.62.1 source classifies this code
  as cancellation. The fixture already ignored Chromium's cancellation code;
  its Firefox handling now ignores only this GET/static-script case. API
  cancellations, connection failures, unknown errors, console errors and page
  errors remain visible. The regression suite and all 24 browser journeys pass
  after this supporting test fix. No application behavior was changed.

## Release boundary at this checkpoint

At the implementation checkpoint, the new protected token/profile had not been exercised by this workflow.
No Production migration, deployment, browser/authentication journey, or real
Sanity webhook delivery occurred in this implementation rehearsal. T-23.5
retained these obligations after concrete release authorization. The later
live evidence above completes T-23. `TST-RELEASE-001` is now `verified`;
`TST-PIPELINE-001` and `TST-ENV-001` await T-24's final evidence reconciliation.

The previous Production placeholder is a schema-independent static maintenance
fallback, not a previous working application. Only the existing two reviewed
forward migrations are proposed for the initial release; no consolidation,
destructive cleanup or seed is included.
