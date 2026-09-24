# T-26.8 runtime target validation evidence

The owner's instruction of 2026-09-24 authorizes this local review unit under
the [runtime plan](../plans/2026-09-19-t-26-runtime-safety-and-alerts.md) and
[T-26.8](../../../TODO.md#t-268). No hosted configuration, deployment or
provider call was made. Delivery wiring of the observed endpoint and release
identity is T-26.10.

## Preflight

Clean `main` at `ce5fcd1` (main CI passed) before creating
`codex/t-26.8-runtime-target-validation`. Docker 29.7.2, Chromium, Node
24.18.0 and installed dependencies were available. The Production adapter
forwards the canonical `BETTER_AUTH_URL` and only the pooled `DATABASE_URL`;
Preview forwards no `BETTER_AUTH_URL` and relies on the assigned `VERCEL_URL`. Both pass the same values at build and runtime.
The owner's ignored `.env.local`, the Playwright harness and the CI build set
no `APP_ENV`, and Vercel Git auto-deploy is disabled.

## Delivered behavior

- `src/shared/environment/rules.ts` holds the pure profile rules (profile and
  `NODE_ENV` pairing, origin, provider/role/branch, Sanity and mail policy,
  Production Resend check). `scripts/environment/core.ts` now imports them
  and re-exports its historical surface; its messages and codes are unchanged.
- `src/shared/environment/runtime.ts` `parseRuntimeEnvironment` validates the
  application's own inputs. It needs only the pooled runtime URL, keeps
  Preview's assigned origin, checks an optional delivery-observed
  `DATABASE_ENDPOINT_HOST` against the pooled host, and defers only the
  `NODE_ENV` pairing during `next build`. It performs no I/O.
- `db/db.ts`, `lib/auth.ts` and `src/sanity/client.ts` call it before
  creating the pool, the Better Auth client or the Sanity client.
- Without `APP_ENV`, local developer and test processes keep the unprofiled
  behavior; a Vercel deployment without `APP_ENV` is refused.
- Refusals are `EnvironmentProfileError` with a stable code and variable name;
  values, URLs and secrets never appear.
- [Environment runbook](../../runbooks/environment-profiles.md#runtime-validation)
  and context updated.

## Checks

| Command                                                            | Result                                    |
| ------------------------------------------------------------------ | ----------------------------------------- |
| `pnpm exec vitest run src/shared/environment src/test/environment` | 5 files, 124 tests passed                 |
| `pnpm test:pipeline`                                               | 14 files, 235 tests passed                |
| `pnpm test`                                                        | 61 files, 605 tests passed                |
| `pnpm test:integration`                                            | 7 files, 29 tests passed                  |
| `pnpm test:e2e`                                                    | 8 Chromium journeys passed                |
| `pnpm typecheck`                                                   | Passed                                    |
| `pnpm lint`                                                        | Passed; only the existing `Geist` warning |
| `pnpm build`                                                       | Passed                                    |
| Changed-file Prettier, `git diff --check`                          | Passed                                    |

## Local Next runtime proof

A task-local probe (ignored `.local/`) started the optimized build with
`next start` twice, with secret, password and host sentinels:

1. **Hosted without a profile** (`VERCEL=1`, no `APP_ENV`): the instrumentation
   hook failed with `hosted deployments must declare APP_ENV`; `/api/lists`,
   `/dashboard` and `/` answered 500.
2. **Production on a direct Neon URL**: the hook failed with `the Neon runtime
must use the pooled DATABASE_URL, not a direct migration URL`; the same
   routes answered 500.

Neither response bodies nor server output contained the auth secret, the
database password or the Neon host. The unprofiled developer loop is proven
by the unchanged browser journeys and integration suite.

## Contract reconciliation

`TST-RUNTIME-001` moves from `specified` to `partial`: its local configuration
portion is verified; bounded health (T-26.9), release smoke (T-26.10) and
deployed evidence (T-26.12) remain. `TST-ENV-001` tooling tests pass unchanged
through the shared rules, and auth, landing and browser boundaries were rerun.

Limits: the endpoint comparison is active only when `DATABASE_ENDPOINT_HOST`
is supplied, which delivery starts doing in T-26.10. An unprofiled local
process is not validated against the profile matrix; that is the existing
developer loop, not a hosted path.

## Review

Pending a fresh exact-tip independent review before merge.
