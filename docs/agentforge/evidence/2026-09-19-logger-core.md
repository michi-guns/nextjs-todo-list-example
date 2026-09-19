# T-26.1 logger core evidence

Date: 2026-09-19. Base: `15c66488af11412663daf7d1a55f807d42c3e830`.
The owner's next-task instruction authorizes this first implementation unit
from the [accepted logger plan](../plans/2026-09-18-t-26-shared-logger.md).
This record does not authorize later tasks or provider operations.

## Delivery

The new `src/shared/logging/` core supplies validated immutable policy snapshots,
exact filtering, lazy metadata, isolated Node request/job correlation, fixed
safe metadata projection and direct Pino output. It has no database imports and
is absent from client-facing shared barrels. The only dependency addition is
Pino 10.3.1 and its generated lockfile entries. Readable local output uses a
small formatter in the direct destination, without a pretty-print dependency.

The [runbook](../../runbooks/logging.md) explains the API and its limits. No
application boundary, database schema, environment credential, hosted provider
or existing CLI result stream changed.

## Prerequisites and sources

- Required implementation prerequisites passed: accepted plan/task, execution
  instruction, pnpm 12.4.2, installed dependencies and registry access.
- Node 24.18.0 provides the local process evidence. No Docker/database/browser
  prerequisite is required for this core-only unit.
- The pre-existing lockfile dirty marker had the same normalized Git object as
  HEAD, `c766555060020b9bb4fb6641aec4723dbd74fa37`; it contained no semantic edit.
  Its original bytes were preserved in ignored `.local/t-26-1-lockfile-before.yaml`.
  The generated committed diff adds only the Pino dependency graph.
- [Pino 10.3.1 API](https://github.com/pinojs/pino/blob/v10.3.1/docs/api.md)
  and installed `node_modules/pino/docs/api.md`: direct destination, serializers,
  ISO timestamp, severity formatter and additional key redaction. No transport
  worker or asynchronous Pino buffer is created.
- [Node AsyncLocalStorage](https://nodejs.org/api/async_context.html#asynclocalstoragerunstore-callback-args):
  isolated async context through `run` and restoration afterward.
- Installed Next 16.3.5 guide
  `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`:
  `server-only` guards Node facade/context/writer imports. Real Node fixture
  processes use the `react-server` export condition; Vitest mocks only this marker.
- [Vercel runtime logs](https://vercel.com/docs/logs/runtime) and
  [structured logging guidance](https://vercel.com/kb/guide/add-structured-application-logs-to-vercel-functions):
  console method/channel controls dashboard severity. Tests preserve all six
  Pino severities in output and route warn/error deliberately.
- [Node process I/O](https://nodejs.org/api/process.html#a-note-on-process-io):
  normal process completion is tested. Abrupt termination and sink failure may
  lose logs; direct output is not a persistence guarantee.

## Verification

The red/green sequence first demonstrated missing config, sanitizer and facade
modules, then passing behavior. A focused environment-mutation regression failed
before fixing the captured and validated environment identity.

| Check                                             | Result                                                         |
| ------------------------------------------------- | -------------------------------------------------------------- |
| `pnpm exec vitest run src/shared/logging`         | Pass, 4 files and 30 tests                                     |
| `pnpm test`                                       | Pass, 46 files and 445 tests                                   |
| `pnpm typecheck`                                  | Pass                                                           |
| `pnpm lint`                                       | Pass, only existing unused `Geist` warning in `app/layout.tsx` |
| `pnpm build`                                      | Pass, Next 16.3.5 optimized build                              |
| `pnpm install --frozen-lockfile --ignore-scripts` | Pass, no lockfile update                                       |
| Changed-file Prettier and `git diff --check`      | Pass                                                           |
| Local Markdown link/anchor check                  | Pass, 447 destinations                                         |

Core tests prove global/module/event precedence, stricter and more permissive
thresholds, policy updates visible to old loggers, invalid/stale policy refusal,
trusted-field protection and interleaved/nested async contexts. Privacy tests
exercise credentials, URLs, tokens, email and task text in error messages,
causes, stacks, arbitrary fields, cyclic objects, getters and serializers.
Neither JSON nor readable output contains the sensitive fixture sentinel.

Real short Node processes prove normal-exit stdout/stderr output for both formats.
Separate processes inject asynchronous Console Writable failures and still
complete with the business result. Synchronous writer failures, serialization
exceptions and throwing lazy metadata/policy sources also leave results/errors
unchanged. Actual output is inspected, not only calls to a mocked Pino logger.

Dependency review: Pino is the accepted library, MIT-licensed and pinned to the
registry's stable 10.3.1. Installation used `--ignore-scripts`; the existing
`allowBuilds` policy is unchanged. `pnpm audit --json` reports no advisory in the
new Pino graph. It reports 11 high and 10 moderate advisories in existing
transitive packages, including js-yaml, nanoid, fast-uri, smol-toml, hono, qs,
uuid and adm-zip. Those existing findings are not a clean dependency audit or
part of this logger change; no unrelated upgrade or forced remediation ran.

## Contract and next boundary

[TST-LOGGING-001](../../../.dwf/decisions/TESTING.md#tst-logging-001) becomes
`partial`. This unit proves the core and Node output behavior. T-26.3 still owns
adoption, once-only propagated failure reporting and local Next request lifecycle
evidence. TST-LOGGING-002 remains `specified`, as do the diagnostics contracts.
No hosted readiness, provider ingestion or deployment is claimed.

T-26.2 is the next serial task after this unit's integration. It needs its own
execution instruction, Docker/PostgreSQL integration prerequisites and an
explicitly authorized non-default Neon branch/direct migration role for the
required migration smoke. Those prerequisites were not inferred from this unit.

Fresh GPT-6-Astra `xhigh` review approved implementation commit
`57aa12f0dc77a850175b5e40e8cebacb53663367` with no actionable findings or contract
conflicts. The reviewer independently reran all 30 focused tests and the diff
check, and reconciled metadata privacy, context, output lifecycle and documentation
against the accepted scope. The implementation commit's normal hooks also passed
all 445 unit tests.

Manual console inspection confirmed readable local and deployed-format JSON
lines with common per-operation correlation, severity channels and safe timeout
classification. An initial inline smoke command had a missing closing parenthesis;
the corrected command exited successfully without any application code change.

The completion metadata receives a fresh exact-tip review before direct merge.
Main-push CI is checked against that final commit afterward; no deployment is
part of this task.
