# T-26.6 diagnostics adoption evidence

The owner's instruction of 2026-09-24 authorizes this review unit under the
[diagnostics plan](../plans/2026-09-18-t-26-diagnostics.md) and
[T-26.6](../../../TODO.md#t-266). Hosted provider proof (T-26.7) and delivery
adapter wiring of the provider variables are outside this delivery.

## Preflight

Clean `main` at `27e1150` (main CI passed) matched the remote before creating
`codex/t-26.6-diagnostics-adoption`. Docker 29.7.2, matching Chromium, Node
24.18.0 and installed dependencies were available. The installed Next.js 16.3.5
`instrumentation` reference and its `create-error-handler` source were read:
`register` runs once per server instance, `onRequestError` is awaited, the
error it receives is the thrown object with a digest attached, and `redirect`,
`notFound` and similar control flow are filtered before the hook.

## Delivered behavior

- Root `instrumentation.ts` starts diagnostics in the Node runtime only, never
  during `next build`, and forwards only the error and route type from
  `onRequestError`; the raw request is never read.
- `reportOperationError`, the existing single owner for caught and swallowed
  failures, now also sends one explicit issue report and marks the error.
  `onRequestError` reports only unreported failures as
  `next.<route type>.failed` and skips control-flow digests and expected
  refusals. The idle pool callback reports its swallowed failure.
- `runLoggedOperation` awaits the bounded diagnostics flush when each request
  or job completes; flush failures cannot change results or errors.
- The runtime probe exposed a real defect: Next compiles instrumentation, SSR
  and route handlers into separate module copies, so a dispatcher started in
  `register` never reached request handlers, and ownership and request
  context were invisible across copies. The logging runtime, the request and
  operation context stores and the reported-error registry are now
  process-wide `Symbol.for` singletons, which also gives each process one
  settings cache and one provider client.
- Plain-HTTP collector endpoints are accepted only on loopback with
  `APP_ENV=local`; every other environment requires HTTPS.
- New [diagnostics runbook](../../runbooks/diagnostics.md), with logging,
  environment-profile, index and context updates.

## Checks

| Command                                                                          | Result                                       |
| -------------------------------------------------------------------------------- | -------------------------------------------- |
| `pnpm exec vitest run src/shared/logging src/shared/diagnostics scripts/logging` | 17 files, 152 tests passed                   |
| `pnpm test`                                                                      | 59 files, 572 tests passed                   |
| `pnpm test:integration`                                                          | 7 files, 29 tests passed                     |
| `pnpm test:e2e`                                                                  | 8 Chromium journeys passed                   |
| `pnpm typecheck`                                                                 | Passed                                       |
| `pnpm lint`                                                                      | Passed; only the existing `Geist` warning    |
| `pnpm build`                                                                     | Passed                                       |
| Client bundle scan                                                               | No diagnostics or SDK code in `.next/static` |
| Changed-file Prettier, `git diff --check`                                        | Passed                                       |

## Local Next runtime proof

A task-local probe (kept under the ignored `.local/`) reused the PostgreSQL
harness, Playwright seed and optimized build. It started two `next start`
processes with `APP_ENV=local`, one selecting Sentry and one Better Stack,
both pointed at a loopback collector, and enabled export through the real
settings store. Results:

1. **Mapped:** the Sanity recovery configuration failure returned the unchanged
   generic 500 and produced exactly one report, already at the collector when
   the response arrived (the awaited completion flush).
2. **Concurrent:** four simultaneous task reads against a hidden table each
   returned 500 and produced four reports with four distinct correlation IDs
   and one shared fingerprint, so one issue with four occurrences.
3. **Rethrown render:** the dashboard failure was reported once by its
   boundary; Next handled the rethrown error (its hook ran) and no second
   `next.render.failed` report appeared.
4. **Expected flow:** an unauthenticated dashboard redirect, a cross-origin
   refusal and an invalid task delete created no report.
5. **Logs:** Sentry received structured logs for the three failure events;
   Better Stack received a Bearer-authenticated HTTP log batch and its
   Sentry-compatible error report.
6. **Privacy:** none of the recovery bearer sentinel, the user's email or
   password, the session cookie name, the hidden table name, the OS user name
   or a local absolute path appeared in any of the 14 captured requests.

Grouping under Next uses `no-frame` because stacks point at bundled chunks.
The adopted application has no unowned server failure path that can be
induced locally, so the `onRequestError`-as-owner branch is proven by the
boundary tests, while the runtime proves the hook's wiring and dedupe on a
real rethrow. A local collector does not prove hosted acceptance or grouping;
that is T-26.7.

## Contract reconciliation

`TST-DIAGNOSTICS-001` is `verified` for its local obligations: routing, policy
transition, privacy, ownership (caught, swallowed, unhandled, rethrown with
Next's digest, control-flow exclusions), startup selection, no browser code,
bounded awaited flush, failure containment and unsent-policy drops.
`TST-DIAGNOSTICS-002` stays `partial` until T-26.7. Affected `TST-LOGGING-001`/
`002`, `TST-BOUNDARY-001`, `TST-AUTH-001`/`002`, `TST-LANDING-001`/`003`,
`TST-ENV-001` and `TST-E2E-001`/`002` checks were rerun and pass.

## Review

Pending a fresh exact-tip independent review before merge.
