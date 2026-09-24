# T-27.1 shared authentication admission evidence

The owner's instruction of 2026-09-24 authorizes this local review unit under
the [account recovery plan](../plans/2026-09-19-t-27-account-recovery.md) and
[T-27.1](../../../TODO.md#t-271). Only disposable local PostgreSQL 18
Testcontainers were used. No hosted database, Neon branch, provider or
Production migration was touched; hosted proof is T-27.4.

## Preflight

Clean `main` at `006d9fb` (main CI passed) before creating
`codex/t-27.1-auth-admission`. Docker 29.7.2 and installed dependencies were
available. Installed Better Auth 1.7.5 was read at
`better-auth/dist/api/rate-limiter/index.mjs` and the core
`BetterAuthRateLimitStorage` type: a `customStorage` replaces every built-in
backend and must answer `consume(key, { window, max })` with
`{ allowed, retryAfter }` atomically. Its key is `ip|path`, so it is hashed
before storage. Its own database backend was not reused: it reads, then updates
by predicate, and would store raw IP keys.

Migration mode: **append-only**. The existing chain is adopted by Production
(see [CONTEXT](../../../.dwf/CONTEXT.md)), so the change is one new forward
migration generated with `drizzle-kit generate`; no earlier file changed.

## Delivered behavior

- `db/schema/auth-rate-limit.ts` and migration
  `20260924204611_auth-rate-limit` add one table and an expiry index:

  ```sql
  auth_rate_limit (
    key text PRIMARY KEY,               -- <purpose>:<HMAC-SHA256>
    count integer NOT NULL CHECK (count >= 1),
    window_expires_at timestamptz NOT NULL
  )
  ```

- `src/modules/auth/infrastructure/auth-rate-limit.ts`:
  - `createAdmissionStore(pool)`: one conditional PostgreSQL UPSERT
    (`INSERT … ON CONFLICT DO UPDATE … WHERE`) per decision, evaluated on
    database time. A missing or expired row restarts at one, a live row below the maximum increments, and
    a full row is left untouched, so a rejection never counts or extends the
    window. A rejection then reads the remaining wait without granting
    anything. A new window triggers a bounded `SKIP LOCKED` delete of up to 100
    expired rows; cleanup failure never changes the decision.
  - `admissionKey`: `<purpose>:<HMAC-SHA256>` over environment, purpose and
    subject with the Better Auth secret. No raw email or IP is stored; a
    secret rotation starts fresh counters.
  - `createAuthAdmission`: Better Auth's `customStorage` (purpose `http`) and
    `consumeRecipient("request" | "send", email)` with separate namespaces.
    Recipients are trimmed and lowercased; dots and plus aliases stay
    distinct. Any store failure denies (HTTP `retryAfter` = window; mail
    `unavailable`) and never forwards the error; there is no in-memory or
    permissive fallback.
- `src/modules/auth/infrastructure/auth-policy.ts`: the plan's defaults in
  one place: recipient request 1 per 60 s, actual sends 5 per 15 min, reset
  submission 5 per 60 s per address, reset token 30 min.
- Nothing is wired into `lib/auth.ts` yet; T-27.2 owns that integration.
  Credentials and sessions are never touched.
- `src/test/logging-settings.integration.test.ts` now finds its own migration
  by content instead of assuming it is the last one, so its upgrade proof is
  unchanged by the new migration.

## Checks

| Command                                                                             | Result                                    |
| ----------------------------------------------------------------------------------- | ----------------------------------------- |
| `pnpm exec vitest run src/modules/auth`                                             | 6 files, 54 tests passed                  |
| `pnpm exec vitest run --config vitest.integration.config.ts src/modules/auth`       | 2 files, 11 tests passed                  |
| `pnpm test:integration`                                                             | 10 files, 44 tests passed                 |
| `pnpm test`                                                                         | 70 files, 678 tests passed                |
| `pnpm exec drizzle-kit check --config drizzle.config.ts`                            | Passed                                    |
| `pnpm exec drizzle-kit generate --config drizzle.config.ts --explain --output text` | No pending statements                     |
| `pnpm typecheck`, `pnpm build`                                                      | Passed                                    |
| `pnpm lint`                                                                         | Passed; only the existing `Geist` warning |
| Changed-file Prettier, `git diff --check`                                           | Passed                                    |

No route, page or runtime composition changed, so the browser suite was not
rerun.

### Real PostgreSQL (independent pools on one disposable database)

- Simultaneous first use: 24 concurrent calls over three independent pools
  with `max: 3` admit exactly three; the stored count is three.
- Exhaustion: after three admissions the fourth is refused with a wait between
  1 and 60 seconds, and the row (count and expiry) is byte-for-byte unchanged.
- Expiry: with the window moved into the past in the database, 12 concurrent
  calls over two pools admit exactly three and open a new future window.
- Cleanup: 150 expired rows and one live row; one cleanup removes exactly 100
  expired rows and keeps the live one.
- Recipient: eight concurrent sends from eight independent pools for one
  address admit five and report `limited`; the request budget is still open;
  another environment on the same database has its own budget; all stored
  keys are opaque and none contains the address.
- An unreachable database denies mail admission as `unavailable`.
- Upgrade: the prior chain has no table (`42P01`); after existing user data
  is added, the new migration applies, the data survives, admission works and
  the `count >= 1` check refuses zero (`23514`). The full chain on a fresh
  database is applied by the harness for every integration file.

## Contract reconciliation

`TST-AUTH-006` moves from `specified` to `partial`: the storage portion is
verified. Wiring into Better Auth, `auth.api`/automatic send paths, trusted IP
handling and browser feedback remain for T-27.2 and T-27.3; hosted proof is
T-27.4. Migration, harness and foundation contracts pass unchanged.

**Operational consequence:** the next approved Production release applies
this forward migration through the protected workflow. Nothing uses the table
until T-27.2 is released.

## Review

Pending a fresh exact-tip independent review before merge.
