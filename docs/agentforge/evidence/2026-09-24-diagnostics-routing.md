# T-26.4 diagnostics routing evidence

The owner's execution instruction of 2026-09-24 authorizes this review unit
under the [diagnostics plan](../plans/2026-09-18-t-26-diagnostics.md) and
[T-26.4](../../../TODO.md#t-264). Provider SDKs (T-26.5), application adoption
and Next instrumentation (T-26.6) and hosted evidence (T-26.7) are outside this
delivery. One implementing agent owns the code; fresh subagents review only.

## Preflight and persistence classification

Clean `main` at `ed60220` matched the remote before creating
`codex/t-26.4-diagnostics-routing`. Docker 29.7.2, Node 24.18.0, pnpm 12.4.2
and installed dependencies were available. No provider credentials or hosted
access were used.

The settings table stores the complete policy as one `jsonb` value, so the
destination extension needs no schema change or migration. Version 1 rows and
files stay valid: they are upgraded in memory on read and stored as version 2 on
the next write. `TST-MIGRATION-001`, `TST-FOUNDATION-001` and `TST-HARNESS-001`
therefore need no new migration evidence, and the non-default Neon migration
check does not apply.

## Delivered behavior

- Policy version 2 keeps shared vetoes (`enabled`, `disabledModules`,
  `suppressedEvents`) and adds independent `console` and `diagnostics`
  destinations with their own switch, default threshold and exact module
  thresholds, plus `diagnostics.errorReportsEnabled`. Cold defaults keep console
  `info` and remote export off with a `warn` minimum.
- A legacy snapshot keeps its numeric thresholds as console policy, turns module
  `off` into a shared veto and keeps diagnostics and reports off.
- The facade resolves each destination before building lazy metadata, sends
  console output through Pino and remote records through the dispatcher only
  when a startup provider is active. `reportError` is separate from `emit`,
  ignores numeric thresholds and requires both remote controls.
- `src/shared/diagnostics/` holds the typed `SafeLogEvent`, `SafeErrorReport`,
  `DiagnosticsStrategy` and `ExportGate` contracts, a non-buffering dispatcher,
  safe error projection and startup-only provider selection. Adapters receive
  the gate so they can recheck current policy at transmission; the dispatcher
  itself never queues, so suppressed records cannot be replayed.
- Error reports carry class, classified kind/code, a static message,
  repository-relative frame locations (at most 10), up to three cause facts and
  a fingerprint of module, event, class, code/kind and the first in-app source
  frame. Next runs application code from `.next/server` chunks without
  source-mapped stacks, so in the Next runtime the frame slot is `no-frame` and
  grouping rests on module, event, class and code/kind; T-26.6/T-26.7 confirm
  runtime and hosted grouping. Occurrence and
  correlation IDs stay outside grouping.
- `DIAGNOSTICS_PROVIDER` selects `none` (default), `sentry` or `better-stack` at
  startup. Invalid selected configuration disables export with one local notice
  and never falls back; no adapter module is loaded for `none`. T-26.5 supplies
  the adapter factories; until then the application exports nothing.

## Checks

| Command                                                                          | Result                                    |
| -------------------------------------------------------------------------------- | ----------------------------------------- |
| `pnpm exec vitest run src/shared/logging src/shared/diagnostics scripts/logging` | 12 files, 110 tests passed                |
| `pnpm test`                                                                      | 54 files, 530 tests passed                |
| `pnpm test:integration`                                                          | 7 files, 29 tests passed                  |
| `pnpm typecheck`                                                                 | Passed                                    |
| `pnpm lint`                                                                      | Passed; only the existing `Geist` warning |
| `pnpm build`                                                                     | Passed                                    |
| Changed-file Prettier, `git diff --check`                                        | Passed                                    |

The PostgreSQL case writes a real legacy row, proves two independent caches
upgrade it to console-only, then switches to remote-only and back through the
revision-checked store and verifies both routing directions on both instances.

## Contract reconciliation

`TST-DIAGNOSTICS-001` becomes `partial`: routing matrix, legacy/cold transition,
old contextual objects, no emission reads, invalid-credential refusal without
fallback, privacy sentinels for message/cause/frame input, grouping without
occurrence IDs and dispatcher failure/timeout/drop containment are proven
locally. Payload re-allowlisting after SDK enrichment, boundary ownership,
Next error transformation and runtime flush remain for T-26.5 and T-26.6.
`TST-LOGGING-001`/`002` and `TST-ENV-001` evidence remains valid; affected
logging tests were rerun.

## Review

A fresh Claude Opus 5.5 reviewer (xhigh effort requested) reviewed `fcbe90e`
and confirmed the routing, legacy transition, startup selection, gate and
containment against SPEC 11.2. It found one narrow privacy gap: frame parsing
trusted the current message to size the stack header, so a rewritten or
accessor-backed message could smuggle frame-like text into frames and the
fingerprint. Commit `f73846f` now parses frames only when the cached header
matches the current own data message, with regression tests for both cases.
The same commit applies the four nits: grouping uses the first in-app source
frame rather than hashed `.next` chunks or packages, report policy is checked
before projection, a failing console writer no longer blocks remote export,
and the runbook documents rollback of version-2 rows.

A second fresh reviewer of `23551c9` confirmed those fixes and the closeout
counts, and found that Next's stack formatter writes `Error: ` for an empty
message, so frames were dropped inside the Next runtime. The follow-up commit
accepts that header shape with a regression test, measures the record bound in
UTF-8 bytes with an oversize test, notes `no-frame` grouping under Next and
clarifies the rollback revision step. The final tip receives its own fresh
review before merge.

A third fresh review found that the empty-message allowance could accept a
stale header when a message beginning with a newline was cleared after the
stack was first read. Gating on a custom formatter would not help because
Node 24 installs its own default `Error.prepareStackTrace`, so this residual
limit is documented in code and here rather than engineered away: if the
error's message or name changes after the first stack read, the cached header
can still appear to match, and frame-like lines from the original message are
then parsed. Fourth and fifth reviews found further instances of this one
limit, so it is stated generally rather than as a list of cases. Application
code does not rewrite error messages, and frame paths and function names stay
filtered in those cases.
