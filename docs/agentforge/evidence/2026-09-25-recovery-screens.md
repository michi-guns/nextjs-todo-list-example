# T-27.3 recovery screens and local browser journeys evidence

The owner's instruction of 2026-09-24 authorizes this local review unit under
the [account recovery plan](../plans/2026-09-19-t-27-account-recovery.md) and
[T-27.3](../../../TODO.md#t-273). Only the harness-owned local PostgreSQL, the
local mailbox and a local `next dev` server were used. No real email was sent
and no hosted system was touched; hosted proof is T-27.4.

## Preflight

Clean `main` at `31eff08` (main CI passed) before creating
`codex/t-27.3-recovery-screens`. Docker, Chromium and installed dependencies
were available. Better Auth 1.7.5 sources confirmed the callback shapes:
reset links redirect to `/reset-password?token=…` or `?error=INVALID_TOKEN`;
verification failures append `error=INVALID_TOKEN|TOKEN_EXPIRED` to the
callback URL; `lib/auth-client.ts` disables default fetch plugins, so a
`callbackURL` never navigates the browser by itself.

## Delivered behavior

- `/forgot-password` (`components/auth/forgot-password-form.tsx`): email
  request with a neutral answer ("If an account exists…", 30-minute single-use
  link, possible wait), "Send another link", and the cooldown message on a
  repeat.
- `/reset-password` (`components/auth/reset-password-form.tsx`): reads the
  token Better Auth hands back, removes it from the address bar and history at
  once, asks for the new password twice (8–128 characters), and on success
  returns to `/sign-in?reset=success`. A missing, invalid, expired or reused
  link shows "This link cannot be used" with "Request a new link". The page
  sets `referrer: no-referrer`.
- `/verify-email`: every verification link now returns here (sign-up,
  unverified sign-in and resend). With a real session it continues to the safe
  `next` path; without one it asks the visitor to sign in; on
  `INVALID_TOKEN`/`TOKEN_EXPIRED` it explains the failure and offers a fresh
  link by email.
- `components/auth/verification-resend.tsx`: one resend control used on the
  pending sign-up screen, after an unverified sign-in, and on `/verify-email`.
  It answers the same way for any address.
- Sign-in: "Forgot password?" link, the post-reset notice, and a resend
  control after `EMAIL_NOT_VERIFIED`. Sign-up: resend on the pending screen.
- `auth-flow.ts`: `buildVerificationCallback`, `RESET_PASSWORD_CALLBACK`,
  `getRecoveryLinkError` (any unknown error collapses to `INVALID_TOKEN`),
  and messages for `TOKEN_EXPIRED`, `RECIPIENT_COOLDOWN` and
  `EMAIL_TEMPORARILY_UNAVAILABLE`, which now take precedence over the generic
  429 text.
- `src/test/browser-diagnostics.ts`: also redacts the
  `/reset-password/<token>` path form.
- Browser harness: `e2e/fixtures.ts` derives each test's synthetic client
  address from its id and retry (the T-27.2 review's deferred nit) and adds
  an explicit `expectedRefusals` option, so a journey that deliberately
  provokes `401`/`403`/`429` tolerates only those statuses. The existing
  magic-link spec no longer puts its tokenized URL in the report.
- `auth.integration.test.ts`: the concurrent-reset test now requires the
  losing submissions to answer `400` (the other deferred nit).

## Checks

| Command                                                                                                                                                              | Result                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `pnpm exec vitest run src/modules/auth src/test/browser-diagnostics.test.ts`                                                                                         | 9 files, 83 tests passed                  |
| `pnpm exec playwright test e2e/password-recovery.spec.ts e2e/verification-recovery.spec.ts e2e/email-verification.spec.ts e2e/magic-link.spec.ts --project=chromium` | 7 passed                                  |
| `pnpm test:integration`                                                                                                                                              | 10 files, 53 tests passed                 |
| `pnpm test:e2e`                                                                                                                                                      | 14 Chromium journeys passed               |
| `pnpm test`                                                                                                                                                          | 72 files, 698 tests passed                |
| `pnpm typecheck`, `pnpm build`                                                                                                                                       | Passed                                    |
| `pnpm lint`                                                                                                                                                          | Passed; only the existing `Geist` warning |
| Changed-file Prettier, `git diff --check`                                                                                                                            | Passed                                    |

### Real browser journeys (local mailbox, real limits)

- **Password recovery:** sign up and verify through the UI; request a reset
  from "Forgot password?"; open the captured link; the address bar loses the
  token; save a new password; the pre-reset session cookie no longer opens
  the dashboard; the old password is refused; the new one opens the Inbox; the
  used link shows "This link cannot be used".
- **Neutral request:** an unknown address gets the same answer; an immediate
  repeat shows the cooldown message.
- **Verification resend:** from the pending screen a new link arrives, an
  immediate repeat is refused, the dashboard stays closed until the link is
  followed, then the Inbox opens.
- **Invalid link and unverified sign-in:** a broken link lands on
  `/verify-email` with the invalid-link message; signing in unverified
  explains why and offers a new link, which then opens the dashboard.
- **Expired link:** `/verify-email?error=TOKEN_EXPIRED` explains the expiry
  and sends a fresh link by email. The real `TOKEN_EXPIRED` redirect is
  proven against Better Auth in the T-27.2 integration suite.

### Sanitized artifacts

The HTML report's embedded archive was decoded and scanned after the full
run: 9 entries, **0** verification, magic-link or reset tokens in either the
query or the path form. The raw report and `test-results` contain none
either. The only personal-looking strings are 17 randomized
`@example.test` addresses typed into forms, as in the earlier journeys. A
first run did expose a token through a URL `expect.poll` value and through
the magic-link spec's `page.goto` step title; both now use boolean polls and
evaluated navigation.

## Contract reconciliation

`TST-AUTH-004`, `TST-AUTH-005` and `TST-AUTH-006` stay `partial`: all local
evidence (boundary, PostgreSQL and browser) is now recorded, and the
remaining obligation is T-27.4's protected migration and hosted recovery
mail. Their summary-table rows, left at `specified` by T-27.1 and T-27.2, now
read `partial`. AUTH-001–003, UI and E2E journeys pass unchanged.

## Review

First independent review (`57a9499`, opus, xhigh): approved, no blockers or
should-fix items. It reproduced 83 focused, 698 unit and 20 auth integration
tests and the 14 browser journeys, and decoded the report archive: 0 real
tokens (only the spec's literal `not-a-real-token`). Four optional nits were
fixed: the reset page's invalid-link copy now tells a visitor who refreshed
to reopen the emailed link; the unverified sign-in journey clears the
automatic sign-in mail so the resend button itself is proven; the reset-link
path check is a boolean, so a failure cannot print the token; known error
codes use `Object.hasOwn`. Follow-up, not in scope: `next dev` prints
incoming request URLs (including callback tokens) to a developer's own
terminal, as it already did for verification and magic links;
`logging.incomingRequests` in `next.config.ts` could quiet it.

Confirmation review pending.
