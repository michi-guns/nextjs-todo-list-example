# T-26.9 dependency health evidence

The owner's instruction of 2026-09-24 authorizes this local review unit under
the [runtime plan](../plans/2026-09-19-t-26-runtime-safety-and-alerts.md) and
[T-26.9](../../../TODO.md#t-269). No external monitor, account, deployment or
provider call was used. Monitor provisioning is T-26.12; delivery of the
release SHA and smoke against these endpoints is T-26.10.

## Preflight

Clean `main` at `197f78f` (main CI passed) before creating
`codex/t-26.9-dependency-health`. Docker 29.7.2, Chromium, Node 24.18.0 and
installed dependencies were available. Installed `pg` honors a per-query
`query_timeout`; `@sanity/client` 8.6.2 (through `next-sanity`) accepts
`signal`, `useCdn`, `cache` and `perspective` per fetch.

## Delivered behavior

- `src/shared/health/probes.ts`: bounded probes with a three-second budget and
  single-flight per instance. The database probe acquires from the existing
  pool and runs `SELECT 1` in a read-only transaction with a server-side
  `statement_timeout`; failed or timed-out connections are destroyed, and a
  late acquisition is released on arrival while later probes answer
  `timeout` at once. The CMS probe aborts its HTTP request at the deadline and
  separates unreachable from invalid content.
- `src/shared/health/handler.ts`: public liveness, secret-header protection
  (`x-health-secret`, constant-time) for dependency probes in remote
  environments, `monitor_unconfigured` instead of readiness when the secret is
  missing or weak, a fixed status vocabulary, `no-store`, and the release
  identity (`APP_RELEASE_SHA`, else `VERCEL_GIT_COMMIT_SHA`, else explicit
  `unknown`/`unreleased`).
- `src/modules/landing/infrastructure/sanity-landing-health.ts`: fresh
  published landing read with the page's query and validation, no CDN,
  `no-store`, `perspective=published`.
- Thin `app/api/health/[component]/route.ts`: composes the pool, the Sanity
  client and a local `warn` log per unavailable dependency; it skips the
  settings refresh so liveness does not wait on the database.
- New [operations runbook](../../runbooks/operations.md); logging,
  environment, index, context, SPEC and testing updates.

## Checks

| Command                                   | Result                                    |
| ----------------------------------------- | ----------------------------------------- |
| `pnpm exec vitest run src/shared/health`  | 2 files, 11 tests passed                  |
| `pnpm test`                               | 65 files, 619 tests passed                |
| `pnpm test:integration`                   | 9 files, 37 tests passed                  |
| `pnpm test:e2e`                           | 9 Chromium tests passed                   |
| `pnpm typecheck`                          | Passed                                    |
| `pnpm lint`                               | Passed; only the existing `Geist` warning |
| `pnpm build`                              | Passed; `/api/health/[component]` dynamic |
| Changed-file Prettier, `git diff --check` | Passed                                    |

One earlier browser run timed out in the unchanged core journey while the dev
server compiled the new route; the rerun and the final gate passed all nine.

### Real PostgreSQL (disposable Testcontainers harness)

1. Success through the pool leaves one idle connection and no waiter.
2. A `CREATE TABLE` placed in the probe is refused by the server as a
   read-only transaction; the table does not exist afterwards.
3. An unreachable port answers `unreachable` well inside the deadline.
4. With the pool saturated, the probe answers `timeout` in under a second,
   queues no second acquisition, and the late connection is released as soon
   as the holder frees it; the next probe is `ok`.
5. `pg_sleep(5)` with a 300 ms deadline answers `timeout` in under 1.5 s, the
   connection is destroyed, and `pg_stat_activity` shows no running sleep.

### Controlled CMS HTTP API (loopback)

1. Two probes make two real `/data/query` requests with
   `perspective=published`. Plain Node has no Next data cache and a loopback
   host has no separate CDN, so a unit test locks the exact fetch options
   instead: `useCdn: false`, `cache: "no-store"`, `perspective: "published"`,
   an abort signal and no `next` cache tags.
2. A missing singleton is `invalid_content`; an HTTP 500 is `unreachable`.
3. A hanging API answers `timeout` in under a second and the server observes
   the request connection closed before a response: the work is aborted.

### Local Next runtime proof

A task-local probe (ignored `.local/`) ran `next start` on the optimized build
in a Preview profile whose pooled database host does not resolve, with
secret, password and host sentinels:

- `app` answered 200 with the supplied release SHA.
- With `HEALTH_PROBE_SECRET` set: no or wrong header answered 401; the right
  header answered `503 unreachable`, and one `health.database.unavailable`
  warning was logged and flushed before the response.
- Without the secret: `database` answered `503 monitor_unconfigured` for
  every request.
- No response or server output contained the secret, the password, the host
  or the raw DNS error.

The probe also confirmed the T-26.8 gate in a real server: the ignored
`.env.local` loopback `BETTER_AUTH_URL` was refused for the Preview profile
until the probe supplied a Preview origin.

## Contract reconciliation

`TST-RUNTIME-001` stays `partial`: configuration (T-26.8) and health (T-26.9)
local portions are verified; release smoke (T-26.10) and deployed evidence
(T-26.12) remain. `TST-FOUNDATION-001`, `TST-LANDING-001`/`003` and
`TST-ENV-001` checks were rerun and pass. Browser proof of the CMS probe
against real Sanity is intentionally absent; the harness does not call
external services.

## Review

The first independent review (read-only, against `5c2a956`) confirmed the
bounded database probe (single outstanding acquisition, server-side
cancellation, destroyed connections, pooler-safe `SET LOCAL`), that
`@sanity/client` 8.6.2 passes `cache` and `signal` into fetch, the access
modes and constant-time comparison, and the route composition, and raised:

- **Fixed:** the CMS cache bypass was claimed but not locked by a test; a unit
  test now asserts the exact fetch options, and the wording above says what
  each test proves.
- **Fixed:** the health warning can also reach provider logs; it is now
  flushed before the response and the runbooks say so.
- **Fixed:** `timeout` troubleshooting now includes network black holes and
  a waking compute.
- **Fixed (confirmation review):** the new test's unused mock parameter added
  a lint warning; it was removed, and the runbook now states the up-to-one-second
  flush on failing answers.
- **Disclosed:** the real `next start` proof is a task-local script under the
  ignored `.local/`, as for T-26.6 and T-26.8.

After the fixes the unit, integration, browser, typecheck, lint, build and
real-server checks were rerun. A fresh exact-tip review confirmed the fixes
before merge.
