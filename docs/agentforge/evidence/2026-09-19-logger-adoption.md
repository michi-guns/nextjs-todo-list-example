# T-26.3 backend logger adoption

The owner's next-task instruction on 2026-09-19 authorized the remaining
[logger adoption unit](../../../TODO.md#t-263). The accepted
[plan](../plans/2026-09-18-t-26-shared-logger.md), TD-029 and the existing
`TST-LOGGING-001`/`002` contracts define this work. Parent T-26 and its later
diagnostics, runtime-safety and alert tasks remain open.

## Delivered behavior

List/task JSON and Server Action entries, dashboard and landing reads, and
Better Auth HTTP entries now establish isolated server-generated correlation
and await the bounded shared settings refresh. Caught unexpected failures are
reported before generic response mapping. Expected application refusals keep
their status, body and severity. Mail delivery and Sanity read/invalidation
boundaries own their propagated errors, including suppressed errors, so the
enclosing entry does not duplicate them.

Idle PostgreSQL errors use safe metadata and independent context. Settings
refresh emits only failure/recovery transitions through the current policy.
Emission never refreshes settings. Core Node modules remain usable by repository
seed/CLI tools; the Next facade retains `server-only`, and no client-facing
barrel exports logging. Integrations outside an adopted entry add no output to
existing CLI result streams. The [runbook](../../runbooks/logging.md) documents
entry usage, the event catalogue, ownership, diagnosis and operator commands.

No dependency, migration, domain rule, UI, provider SDK or deployment workflow
was changed. Better Auth's independent logger and behavior remain its own.

## Checks

| Check                                              | Result                                                                                               |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Initial `pnpm test`                                | 49 files, 468 tests passed before changes                                                            |
| Focused changed-boundary/core Vitest command below | 17 files, 118 tests passed                                                                           |
| Final `pnpm test`                                  | 51 files, 479 tests passed                                                                           |
| `pnpm test:integration`                            | 7 files, 28 tests passed against disposable local PostgreSQL 18                                      |
| `pnpm test:e2e`                                    | All 8 Chromium journeys passed, including password, verification, magic link, privacy and pagination |
| `pnpm typecheck`                                   | Passed                                                                                               |
| `pnpm lint`                                        | Passed, only the existing unused `Geist` warning                                                     |
| `pnpm build`                                       | Next.js 16.3.5 optimized build passed with loopback compile-only database placeholders               |
| Next dev MCP                                       | `get_compilation_issues`: no issues; `get_errors`: no config or session errors                       |
| Agent-browser                                      | Synthetic password sign-in and task creation succeeded on the disposable runtime                     |
| Client chunks                                      | No adopted logging event/module markers in `.next/static/chunks`                                     |

Changed-file Prettier and `git diff --check` pass. The local documentation check
validated 618 links/anchors without errors.

```powershell
pnpm exec vitest run src/modules/lists/presentation src/modules/tasks/presentation src/modules/auth/infrastructure src/modules/landing src/shared/logging
```

The red/green checks demonstrated missing mapped list/task diagnostics, missing
mail/Sanity outcomes, raw idle-pool output and missing bounded cache transition
events before their implementation. Coverage includes provider-error ownership,
suppression without outer re-reporting, concurrent IDs, last-valid policy,
refresh/output failure containment and exclusion of private fixture strings.
Successful Resend adapter output is tested with a controlled HTTP response;
no real email was sent by this task. Existing Pino subprocess tests freshly
passed for readable/JSON output, severity channels, normal process exit,
serialization failure and asynchronous Console stream failure.

## Real local Next.js output and independent instances

A task-local probe reused the committed PostgreSQL harness, migration chain,
Playwright seed, settings store and optimized Next build. It started two separate
`next start` Node processes on loopback ports 3213 and 3214, sharing only the
disposable database. `APP_ENV=development` selected JSON output; this was a local
test, not a hosted Development operation. The probe captured Pino records from
each process's stdout/stderr and asserted the following:

1. Four concurrent authenticated list reads returned HTTP 200 and four distinct
   server-owned correlation IDs. A supplied `x-request-id` was not adopted.
   Debug completion records had numeric level 20 and used stdout.
2. A deliberately absent local Sanity recovery secret produced the unchanged
   generic HTTP 500 configuration response on each instance. Each request
   emitted exactly one error record at level 50 on stderr, before completion.
3. Persisted revision 2 disabled logging. After 30.5 seconds and the next request
   on each instance, both still returned HTTP 200 and emitted no facade events.
4. Revision 3 re-enabled logging with `lists.read.completed` suppressed. After
   the next eligible refresh, both processes emitted new Sanity failure events
   while list completion remained suppressed. Neither process restarted.
5. Captured records contained no private bearer sentinel, synthetic account
   email or caller-controlled request ID. Policy writes stayed in the disposable
   database. The probe stopped its own processes and container.

The Playwright Next dev log also contained actual readable local
`INFO auth.mail auth.mail.delivery.completed` records for mailbox delivery,
with `transport: mailbox`, bounded duration and the enclosing `auth.post`
correlation. No recipient or token appeared in those records. The local probe
and sanitized JSON capture are retained under ignored `.local/` for this clone;
the assertions and results above are the durable evidence.

The channel interpretation matches [Vercel runtime logs](https://vercel.com/docs/logs/runtime#level):
stdout is info, stderr is error, and `console.warn` remains warning for streaming
functions but becomes error for non-streaming functions. JSON retains the Pino
severity separately. The writer has no application queue, worker or post-response
flush. These local checks establish emission at request completion and ordinary
Node exit, not guaranteed delivery after abrupt platform termination.

## Investigation and verification limits

The first build exposed a real adoption defect: refreshing settings before
`headers()` let dashboard prerendering attempt a settings read using the ambient
build configuration, then report Next's internal dynamic-render interruption as
an unexpected error. The dashboard now awaits the installed stable
`connection()` API before entering logging; its ordinary redirect stays outside
the observed callback. The final build passed against an unreachable loopback
database placeholder, without settings fallback or dashboard failure events.
No hosted database write or migration occurred.

The initial runtime probe needed two probe-only corrections: the settings store
method is `set`, and the core seed deliberately starts listless until dashboard
initialization. The corrected checks assert the actual list-page contract.
Neither required an application behavior change.

`TST-LOGGING-001` and `TST-LOGGING-002` now have their complete local obligations.
The unchanged T-26.2 migration and guarded CLI evidence remains valid. Fresh
boundary/unit, integration and Chromium results supplement `TST-BOUNDARY-001`,
`TST-AUTH-001`/`002`, `TST-LANDING-001`/`003`, `TST-FOUNDATION-001` and
`TST-E2E-001`/`002` without replacing their historical hosted evidence. The
separate partial `TST-HARNESS-001` live-outage observation stays open.

No new hosted ingestion, provider setup, Production settings edit, deployment,
notification or migration is claimed. Browser-only exceptions and independent
framework/provider output remain outside the facade. Formatting, link checks,
fresh independent exact-tip review and main-push CI gate integration. T-26.4 is
the next serial task and needs its own execution instruction and preflight.

## Independent review and closeout

Fresh GPT-6-Astra `xhigh` review approved implementation commit
`9b7e9ae14901c1ff9eb4912d66f7e74aa0cde4d0` with no actionable findings. The reviewer
independently passed the 118 focused tests and diff check, inspected the runtime
probe/capture, and reconciled source, privacy, lifecycle and documentation with
the accepted contracts. It assessed the other recorded checks without claiming
to rerun them. Commit hooks passed all 479 unit tests.

The final metadata commit is independently reviewed before direct merge; the
parent reports that exact SHA and its main-push CI afterward. No PR or release
is part of this delivery. Only T-26.3 was authorized by this next-task request.
The 18 remaining child tasks require their respective execution instructions;
the next serial unit is T-26.4, whose implementation dependency is now satisfied.
