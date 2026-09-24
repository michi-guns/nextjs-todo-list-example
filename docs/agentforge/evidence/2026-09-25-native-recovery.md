# T-27.2 native recovery and bounded auth-mail evidence

The owner's instruction of 2026-09-24 authorizes this local review unit under
the [account recovery plan](../plans/2026-09-19-t-27-account-recovery.md) and
[T-27.2](../../../TODO.md#t-272). Only disposable local PostgreSQL 18
Testcontainers, the local mailbox and a local `next dev` server were used. No
real email was sent and no hosted system was touched; hosted proof is T-27.4.

## Preflight

Clean `main` at `8ed1631` (main CI passed) before creating
`codex/t-27.2-native-recovery`. Docker 29.7.2, Chromium and installed
dependencies were available. Installed sources read: Better Auth 1.7.5
`api/routes/password.mjs` (reset request, `consumeVerificationValue`,
`revokeSessionsOnPasswordReset`), `api/routes/email-verification.mjs` (neutral,
500 ms-floored resend), `api/rate-limiter/index.mjs`, core `utils/ip.mjs`
(single-value `x-forwarded-for`, localhost fallback only in development/test),
`context/create-context.mjs`, and Next 16.3.5's `after` guide and
`base-server.js` (a client `x-forwarded-for` is kept, `??=`).

## Delivered behavior

- `lib/auth.ts` composes:
  - `rateLimit`: enabled in every environment on the T-27.1 PostgreSQL
    `customStorage`, native rules kept, plus `/reset-password` at 5 per 60 s
    per address. On Vercel only `x-vercel-forwarded-for` is trusted.
  - `hooks.before`: `/request-password-reset`, `/send-verification-email` and
    `/sign-in/magic-link` charge the recipient request budget (1 per 60 s)
    before any account lookup, for HTTP and `auth.api` calls alike. A limited
    recipient gets `429 RECIPIENT_COOLDOWN` with `X-Retry-After`; a store
    failure gets a generic `503 EMAIL_TEMPORARILY_UNAVAILABLE`. Absent and
    present addresses meet the same answer.
  - Native reset: `sendResetPassword`, 30-minute tokens,
    `revokeSessionsOnPasswordReset: true`; reset does not sign in.
  - Every verification, reset and magic-link message goes through
    `createAuthMailer` (`auth-mail.ts`): it is charged to the recipient's
    actual-send budget (5 per 15 min, all kinds, automatic sends included) and
    runs outside the response. A denied or failed send is suppressed without
    an account signal and logged only as a fixed event
    (`auth.mail.send.limited|unavailable|invalid`,
    `auth.admission.unavailable`). The magic-link kind is set server-side, so
    client metadata cannot change the message.
- `mail-scheduler.ts`: Next `after()` by default; seeds, scripts and
  integration tests select `selectStandaloneAuthMail()` and `drain()` it
  before reading a mailbox or closing the pool. The four seed scripts
  (Playwright, local PostgreSQL, Neon development, Preview) do this.
- `resend-mail.ts`: a "Reset your password" message for the trusted
  `password-reset` kind.
- `auth-rate-limit.ts`: the deferred T-27.1 comment now requires an
  autocommit Pool; `lib/auth.ts` passes `db/db`'s pool.
- Tests keep real limits on: integration requests and the Playwright seed use
  distinct synthetic client addresses, and a new auto fixture in
  `e2e/fixtures.ts` gives each browser test its own address on same-origin
  auth requests only.

## Checks

| Command                                                                       | Result                                    |
| ----------------------------------------------------------------------------- | ----------------------------------------- |
| `pnpm exec vitest run src/modules/auth`                                       | 8 files, 70 tests passed                  |
| `pnpm exec vitest run --config vitest.integration.config.ts src/modules/auth` | 2 files, 20 tests passed                  |
| `pnpm test:integration`                                                       | 10 files, 53 tests passed                 |
| `pnpm test`                                                                   | 72 files, 694 tests passed                |
| `pnpm test:pipeline`                                                          | 17 files, 269 tests passed                |
| `pnpm test:e2e`                                                               | 9 Chromium journeys passed                |
| `pnpm test:e2e` with the Sanity public variables cleared (as in CI)           | 9 passed                                  |
| `pnpm typecheck`, `pnpm build`                                                | Passed                                    |
| `pnpm lint`                                                                   | Passed; only the existing `Geist` warning |
| Changed-file Prettier, `git diff --check`                                     | Passed                                    |

### Real PostgreSQL through the Better Auth handler

- Reset requests for a verified and an unknown address answer identically;
  only the known address receives a `password-reset` message, and the stored
  token expires in 30 minutes.
- Two sessions stay valid while mail is requested. A successful reset returns
  no session cookie, ends both sessions, refuses the old password, accepts the
  new one, and refuses the reused token.
- Three concurrent submissions of one token: exactly one succeeds.
- Invalid and expired tokens, and a throttled second request, leave the
  session and the old password working.
- A second request inside 60 s is `429 RECIPIENT_COOLDOWN` for known and
  unknown addresses; `auth.api.requestPasswordReset` meets the same limit.
- One unverified account signing in from seven different addresses: sign-up
  plus automatic sends deliver exactly five messages.
- Reset submissions: five from one address answer normally, the sixth is
  `429`, another address is unaffected; every stored key is opaque.
- A held scheduler proves the reset response returns `200` before the mail
  task runs; the message appears only after the task is released.
- Verification resend answers `{ status: true }` for pending, absent and
  verified addresses, mails only the pending one, and a second request is
  `429`. An invalid link redirects with `INVALID_TOKEN`; a link used two hours
  later (fake clock) redirects with `TOKEN_EXPIRED` and leaves the account
  pending; the same link then verifies normally.
- Mutation check: with the request hook, session revocation and the send
  budget disabled, four of these tests fail.

## Contract reconciliation

`TST-AUTH-004` and `TST-AUTH-005` move from `specified` to `partial`: the
backend portions are verified; recovery screens and browser journeys are
T-27.3. `TST-AUTH-006` stays `partial` with the wiring, automatic and
`auth.api` send paths and IP handling now verified; browser feedback remains
T-27.3 and hosted proof T-27.4. AUTH-001–003 and E2E journeys pass unchanged.

**Operational consequence:** the next approved Production release must apply
the T-27.1 `auth_rate_limit` migration before this code serves traffic. The
protected release migrates before deploying, so no extra step is needed.

## Review

Pending a fresh exact-tip independent review before merge.
