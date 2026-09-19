# T-26.2 shared logging settings evidence

The owner's next-task instruction authorizes this review unit under the
[accepted plan](../plans/2026-09-18-t-26-shared-logger.md) and
[T-26.2](../../../TODO.md#t-262). T-26.3 application adoption and later tasks
are outside this delivery. One implementing agent owns the code; fresh subagents
perform independent review only.

## Preflight and migration classification

Clean `main` at `3582b4f` matched the remote before creating
`codex/t-26-2-shared-logging-settings`. Docker 29.7.2, pnpm 12.4.2, installed
Vitest/Drizzle and authenticated Neon CLI were available. Read-only inspection
of project `curly-dust-60603928`, branch `development`,
`br-super-leaf-axfwoi2e`, confirmed non-default identity, a direct connection,
the existing migration role, six application tables and two applied migrations.
No connection strings or credentials were printed. The existing Development
target is the task's migration-smoke target; Production is a separate project.

Applied history is shared and already adopted by Production. TD-025 therefore
requires an append-only migration. Drizzle generated
`20260919162239_logging-settings` with its snapshot metadata; neither adopted
migration changed. The new table is additive, with no seed or automatic defaults.
Required evidence covers `TST-LOGGING-002`, `TST-MIGRATION-001`,
`TST-FOUNDATION-001`, `TST-HARNESS-001` and `TST-ENV-001`.

## Implementation and grounding

The store reads and atomically publishes a full validated snapshot. A compare
and update or insert-if-absent statement lets only one writer advance an expected
revision. The cache coalesces boundary reads, retains valid policy through
failure and applies only newer revisions. Runtime composition accepts the
existing pool without importing the database back into the logger core.

The thin TypeScript CLI selects its environment and target explicitly, reuses
the profile/migration guards and resolves Neon metadata independently through
the authenticated provider CLI. Database permissions remain the write authority.
Policy files and result streams contain no credentials. Production also reuses
the protected main-job, reviewed checkout and CI proof from the release tooling;
this task adds no Production workflow or self-approval flag.

Sources checked on 2026-09-19:

- [node-postgres pool API](https://node-postgres.com/apis/pool) and installed
  `pg-pool` 3.14.0 source confirm bounded acquisition removes waiting requests,
  and `release(true)` destroys the client.
- [node-postgres client API](https://node-postgres.com/apis/client) and installed
  `pg` 8.23.0 `Client.end` confirm ending an active query destroys its socket.
- [PostgreSQL statement deadlines](https://www.postgresql.org/docs/current/runtime-config-client.html#GUC-STATEMENT-TIMEOUT)
  bound server work independently of connection lifetime. A transaction-local
  750 ms deadline handles blocked SQL while the client budget stays one second.
- [Drizzle insert](https://orm.drizzle.team/docs/insert), installed Drizzle
  1.0.0-rc.4 types and generated migration shape ground insert-if-absent and
  revision-checked updates with `returning`.
- Installed Next.js 16.3.5 `serverExternalPackages.md` documents Pino/pg
  externalization. The `server-only` composition does not enter client bundles.

The illustrative one-second total refresh proposal is refined to the existing
pool's maximum 10-second connection/checkout plus a one-second query deadline.
pg-pool has no public per-acquisition cancellation/timeout option. This preserves
the shared pool and existing connection behavior. Each operation uses a small
transaction with a local server statement deadline; reads use a read-only
transaction. Client timeout destroys the checked-out connection, and PostgreSQL
also cancels blocked SQL. Failed transactions are discarded. Retry spacing
is 30 seconds after completion, with no background refresh and no recursive
cache-failure logging. The [runbook](../../runbooks/logging.md) states active/idle
limits and the ambiguous-commit case after a write timeout.

## Local verification

The first cache, persistence and CLI-core focused runs failed because their new
modules did not exist. Implementations then passed the focused behavior checks.
An initial integration assertion exposed synchronous invalid-policy rejection;
the store now consistently returns a rejected promise from its async write API.

- `pnpm exec vitest run src/shared/logging`: 33 tests, including three new cache
  tests for policy changes, old loggers, coalescing, failure retry and no idle I/O.
- `pnpm exec vitest run scripts/logging`: 20 tests in two files, nonzero discovery.
  Tests cover inspection/update, invalid input, target/profile/namespace refusal,
  stale revisions, provider identity/default-branch refusal, protected Production
  refusal and an actual short CLI process with credential-safe stderr.
- `pnpm test`: 49 files, 468 tests pass.
- `pnpm typecheck`: passes under the existing strict TypeScript configuration.
- `pnpm test:integration`: seven files, 28 tests pass against disposable local
  PostgreSQL 18. Five new tests cover independent pools/caches converging after
  an update, target isolation, conflicting edits, malformed data, real table-lock
  timeout/socket cleanup, full-pool waiter removal, a fresh chain and a prior-schema
  upgrade that retains an existing synthetic user. Missing schema falls back to
  the default cached policy.

- `pnpm lint`: passes with only the existing unused `Geist` warning.
- `pnpm build`: passes under Next.js 16.3.5.
- `pnpm exec drizzle-kit check --config drizzle.config.ts`: passes.
- Changed-file Prettier, `git diff --check` and 448 local Markdown destinations
  pass. An initial broader formatting check also reported existing untouched
  schema/logger files; those are outside this task. The newly generated snapshot
  was formatted without changing its metadata values.

Independent review, non-default Neon smoke and main-push CI gate closeout.

## Independent review and fixes

Fresh GPT-6-Astra `xhigh` review of `982057a` found two actionable issues.
Disconnecting a query waiting on a table lock left its PostgreSQL backend work
alive until the lock was released, and one integration test depended on a prior
test's policy revision. Both findings match the task's timeout and test-isolation
contracts. A regression check reproduced the active lock waiter before the
blocker was released. The store now adds PostgreSQL `SET LOCAL statement_timeout`
within a bounded transaction, and each integration case creates its own state.
The formerly dependent test passes in isolation. The review's optional schema
inventory correction and two related stale Agent SPEC paragraphs were also fixed.
A fresh review of the changed tip is required before integration.

## Evidence limits

`TST-LOGGING-002` remains partial until application adoption/runtime evidence in
T-26.3. `TST-LOGGING-001` retains its existing partial status. Foundation/environment
evidence is supplemented without changing shared guard semantics; the existing
live Docker-outage observation under `TST-HARNESS-001` remains partial. No browser
journey changed, so T-26.2 does not require a local browser rerun. Normal main CI
still runs its Chromium suite. No Production migration, deployment, settings edit,
external log ingestion or notification is claimed.
