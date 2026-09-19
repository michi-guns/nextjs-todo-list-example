# Account recovery and abuse resistance implementation plan

> Accepted AgentForge approach. The authorized consolidated breakdown is T-27.1–T-27.4 in TODO.md.

**Status:** Accepted for consolidated task definition on 2026-09-19. Implementation and hosted operations still require execution authorization and their scoped prerequisites.

**Goal:** Deliver usable password and verification recovery with shared abuse limits, neutral responses and automatic session revocation after a successful reset.

**Spec and decisions:** [D-011](../../../.dwf/decisions/PRODUCT.md#d-011), [TD-032](../../../.dwf/decisions/TECHNICAL.md#td-032), [Agent PRD](../../../.dwf/output/agent/PRD.md#account-recovery-and-abuse), [SPEC section 2.5](../../../.dwf/output/agent/SPEC.md#account-recovery-and-abuse), [T-27](../../../TODO.md#t-27-complete-authentication-product-flows-and-abuse-resistance), and [TST-AUTH-004–006](../../../.dwf/decisions/TESTING.md#tst-auth-004).

**Architecture:** Keep Better Auth responsible for credentials, verification, tokens and sessions. Add an auth-owned PostgreSQL admission adapter, explicit request/mail boundaries and thin recovery UI. Reuse the existing environment-selected database, mail transports and real browser harness.

**Global constraints:** No new auth provider, Redis, service, generic limiter framework, account settings feature or dependency upgrade. Preserve TD-026/027 mail policy, T-27's completed local verification slice, native verification semantics, existing private-operation authorization and protected hosted migration gates. Logger/diagnostics implementation is not a prerequisite for this account work.

## Current state and file map

Inspected installed versions: Better Auth 1.7.5, Next 16.3.5, Drizzle ORM/Kit 1.0.0-rc.4, PostgreSQL 18 harness, Playwright 1.63.0. Recheck the installed APIs when implementation starts.

| Existing or proposed file                                                                                                                  | Responsibility                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lib/auth.ts`; a small auth-owned configuration/factory module                                                                             | Keep the Next singleton and trusted origins; inject the mail scheduler and shared admission dependencies without duplicating Better Auth options.      |
| `app/api/auth/[...all]/route.ts`; `lib/auth-client.ts`                                                                                     | Retain Better Auth HTTP/client adapters; use supported recovery methods rather than parallel custom reset endpoints.                                   |
| New `db/schema/auth-rate-limit.ts`; `db/schema/index.ts`; one forward `migrations/*/migration.sql`                                         | Opaque counter identity, count, window timestamps and bounded expiry cleanup; no reuse of verification-token rows.                                     |
| New `src/modules/auth/infrastructure/auth-rate-limit.ts` and focused tests                                                                 | Atomic PostgreSQL admission, opaque keys and the supported `customStorage.consume` adapter. Keep policy defaults and recipient hook wiring auth-owned. |
| `src/modules/auth/infrastructure/auth-mail.ts`, `resend-mail.ts`, and their tests                                                          | Universal actual-send cap, preserved environment selection and explicit verification/reset/magic-link message kinds.                                   |
| New auth mail-scheduler module; Next and standalone composition                                                                            | Supported `after()` lifetime for HTTP/server-function sends, explicit awaited/tracked execution for seeds and integration tests.                       |
| New `app/(auth)/forgot-password`, `reset-password`, and `verify-email` pages with corresponding `components/auth/*` forms                  | Thin request/reset/verification-recovery surfaces using existing AuthCard, AuthNotice, labels and buttons.                                             |
| Existing sign-in/sign-up forms and `src/modules/auth/presentation/auth-flow.ts`                                                            | Recovery links, pending resend, safe callback/error handoff and bounded retry guidance.                                                                |
| `src/modules/auth/auth.integration.test.ts`; new focused auth integration suites                                                           | Real token/session/admission behavior and cross-instance concurrency.                                                                                  |
| `scripts/playwright-local/seed.ts`, `scripts/local-postgres/seed.ts`, `scripts/neon-development/seed.ts`, `scripts/deploy/preview/seed.ts` | Existing standalone auth consumers select the explicit standalone scheduler; preserve their target and mail safeguards.                                |
| `e2e/fixtures.ts`, existing verification/magic journeys, new recovery journeys; `src/test/browser-diagnostics.ts`                          | Real UI/mailbox flows, isolated identities, safe diagnostics and reset-token path redaction.                                                           |

The [2026-09-09 plan](2026-09-09-t-27-email-verification-browser.md) remains the completed signup/verification browser slice. It neither plans nor proves this recovery extension.

## Dependencies and work order

The Production mail foundation (T-21.5), environment/mail policy (T-18) and pipeline boundaries (T-24) are complete. No broad account-flow decision remains open. Docker, installed dependencies and Chromium are execution prerequisites for local evidence, not newly missing product decisions. Real hosted migrations/mail journeys still require their existing concrete authorization.

The work packages are shared admission/schema, recovery/mail integration, UI recovery and integrated evidence/runbooks. T-27.1 establishes storage, T-27.2 integrates recovery/admission/mail lifecycle, T-27.3 delivers UI/browser evidence and T-27.4 obtains separately authorized hosted proof. TODO.md owns the exact sequence; UI integration follows the implemented API/callback contract.

### Shared admission and migration

Use Better Auth's supported `rateLimit.customStorage.consume(key, rule)` contract for HTTP IP limiting, backed by one focused PostgreSQL store. Enable intended runtime limits explicitly because the library defaults them off in development. Preserve native trusted-IP/IPv6 handling; on Vercel, configure the documented proxy-owned forwarding header rather than trusting arbitrary client input. Standalone/test requests use controlled distinct synthetic addresses or isolated counters, not a global limiter bypass. An absent trusted address retains the library's bounded shared fallback.

Store only opaque, namespaced HMAC keys using the existing stable effective Better Auth secret, environment and purpose. Validate email syntax, trim and lowercase consistently with Better Auth; do not remove provider-specific dots or plus aliases. Do not log addresses, IPs, counter keys, tokens or incoming error objects. Environment databases and key namespaces both preserve isolation. An intentional auth-secret rotation also resets the effective counter namespace; do not generate a random per-instance key.

Use a conditional PostgreSQL UPSERT with admission predicates on the current conflicting row, a primary/unique counter key, database time and an explicit window-expiry value. Expired windows restart at one; admitted operations increment; rejection does not extend the window. Read remaining wait after rejection without granting a second admission. Clean only a bounded batch of expired counter rows through the existing request/maintenance seam; add no scheduler or service.

This chooses fixed windows for the custom store; the result implements the supported consume contract without depending on the built-in database adapter's read/update sequence. Installed Drizzle `incrementOne` places its predicate in a selected-ID subquery and updates by ID, which deserves concurrency scrutiny. That source observation is not a reproduced defect. Prove the chosen UPSERT with independent database connections under simultaneous first use, exhaustion and expiry before claiming shared atomicity.

Generate one append-only Drizzle migration through the repository's existing migration workflow. Preserve historical migrations and snapshots. Verify the complete chain and fresh schema on disposable local PostgreSQL; TD-025's non-default Neon branch proof precedes any separately authorized default-branch migration. Do not run Better Auth's schema tool against a real database or replace Drizzle migration ownership.

### Recipient feedback and universal send cap

Use supported `hooks.before` for the explicit `/request-password-reset`, `/send-verification-email` and `/sign-in/magic-link` endpoints. Validate the request email and consume a shared recipient **request** budget before account lookup, so absent and present addresses receive the same cooldown outcome. This hook also covers `auth.api` calls; the HTTP IP limiter does not. Preserve authenticated verification's native email-mismatch/already-verified checks rather than flattening every framework response.

Separately enforce a shared recipient **actual-send** budget in the auth-mail boundary for every verification, reset and magic-link message, including automatic signup/sign-in sends. Request and send counters use different namespaces: one operation must not double-charge a single counter, and automatic callbacks must not need unsupported hook-context plumbing. Do not put a recipient mail quota in front of ordinary successful password authentication.

Send-budget denial suppresses delivery without throwing an account-existence signal from a callback reached only for real users. Neutral acceptance copy always explains that recent requests may require a wait. Counter-store failure denies mail admission and produces only generic retry guidance/sanitized diagnostics; never send through an in-memory or permissive fallback. Unknown and known explicit requests encounter the same request-admission failure path. No account lock flag or credential/session mutation is involved.

### Mail lifetime and native recovery

All three trusted message kinds go through one explicit scheduler seam. Next composition schedules the whole bounded send task with `after()`, including actual-send admission, existing environment-aware delivery and sanitized failure handling. Standalone seeds/integration code selects an awaited or explicitly drained scheduler through the auth factory. Do not catch a missing Next request context and silently fall back to another lifecycle. The current seeds import the singleton outside Next, so those callers must move with the seam.

Configuring Better Auth's background handler alone is insufficient: signup/sign-in/reset use `runInBackgroundOrAwait`, whereas explicit verification and magic-link callbacks await directly. The shared scheduler makes all relevant HTTP request responses independent of provider latency. Use a controlled pending mail operation to prove that property; do not rely on fragile timing thresholds. Retain the Resend adapter's ten-second network bound and supported route lifetime, with no fire-and-forget timer or durable retry queue.

Add an explicit trusted `password-reset` message kind and matching subject/body in the existing Resend adapter. Set magic-link kind in its trusted callback rather than accepting client-supplied metadata as a template selector. Preserve Preview suppression, non-Production remote-mail rejection, local mailbox gating and Production configuration validation. Background operational failures retain safe diagnosis without returning provider details or changing neutral account-existence responses.

Wire `emailAndPassword.sendResetPassword`, `resetPasswordTokenExpiresIn` and `revokeSessionsOnPasswordReset: true`. Native reset validates password policy, consumes the verification row, updates credentials and revokes sessions before reporting success. Native PostgreSQL token claiming uses `DELETE ... RETURNING`; verify its one-success concurrency behavior. Do not replace it with a second token table or promise rollback of every internal framework write after an operational failure. Invalid/expired/replayed/throttled requests must leave credentials and sessions unchanged.

Keep the existing `getCurrentUserFromHeaders` database-backed check (`disableCookieCache: true`). After successful reset, two prior browser cookies must fail real protected operations, the old password must fail, and the new password must require ordinary sign-in. Requesting reset mail alone must leave both sessions usable. Verification retains its separate JWT semantics, automatic first-verification sign-in and native already-verified behavior.

### Chosen implementation defaults

These are engineering defaults within D-011/TD-032, not new product choices. Keep them in one auth policy module and document them with the resulting implementation.

| Control                                   | Initial value and reason                                                                                                          |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Signup/password sign-in IP                | Native 3 requests per 10 seconds; preserve library defaults.                                                                      |
| Reset-request/verification-resend IP      | Native 3 per 60 seconds.                                                                                                          |
| Magic-link request/consumption IP         | Native plugin 5 per 60 seconds.                                                                                                   |
| Password-reset submission IP              | Explicit 5 per 60 seconds; bound the credential-update endpoint without changing token ownership.                                 |
| Explicit email-request recipient budget   | 1 request per 60 seconds across the three explicit email-request paths; immediate resend feedback.                                |
| All actual auth-email sends per recipient | 5 sends per 15 minutes across all message kinds; bounds automatic sends and IP rotation while allowing ordinary recovery retries. |
| Reset token                               | 30 minutes; finite recovery window with time to retrieve mail.                                                                    |
| Verification/magic token                  | Preserve native 60 minutes / 5 minutes.                                                                                           |

Use native `X-Retry-After` where the HTTP limiter emits it and a safe bounded retry hint for recipient admission. Client countdowns are feedback only; the database remains authoritative. Temporary throttling must never become an account lockout or revoke sessions.

### Recovery surfaces and callback safety

`/forgot-password` accepts email and shows neutral acceptance. `/reset-password` accepts the token passed by Better Auth's native callback, validates the new-password form, and returns to ordinary sign-in after success. Missing/invalid/expired/reused tokens offer a fresh request. Reuse the 8–128 character password policy and safe redirect helper; never accept an arbitrary external callback.

Use `/verify-email` as a public verification-result/recovery surface. Send verification callbacks there with the sanitized intended `next` path. On native `TOKEN_EXPIRED`/`INVALID_TOKEN`, present recovery; on successful verification, require the real session before continuing to private content. A signed-out user reusing an already-verified link receives the ordinary sign-in path, not an invented new session. Pending signup and unverified signin expose explicit resend. Keep the email in component/request state rather than adding it to callback URLs. Expand only the small public error vocabulary; do not render raw provider messages.

Update the existing fresh-signup journey to tolerate this safe callback surface while preserving its proof of pending-access refusal, verification, Inbox access and password sign-in. No seeded session or direct database change may substitute for recovery browser journeys.

## Verification strategy

Implement [TST-AUTH-004](../../../.dwf/decisions/TESTING.md#tst-auth-004), [005](../../../.dwf/decisions/TESTING.md#tst-auth-005) and [006](../../../.dwf/decisions/TESTING.md#tst-auth-006) through `testing-first-class` and focused TDD; they remain `specified` until executable evidence exists. Preserve AUTH-001–003, E2E-001/002, environment and migration obligations.

- Unit/boundary checks: request admission before lookup for known/unknown recipients; safe cooldown/error vocabulary; effective counter-key normalization; explicit scheduler lifetime; trusted mail kinds; all automatic and `auth.api` send paths; failure without unbounded mail or sensitive logs.
- Real PostgreSQL: independent limiter instances/connections; first-use conflict, maximum and expiry; environment separation; concurrent token consumption; invalid/replayed links; two-session revocation only after successful reset; migration upgrade and rollback-free refusal behavior.
- Real Chromium: request/capture/consume reset, ordinary new-password sign-in, previous-session refusal; verification resend, invalid/expired recovery and pending private-access refusal. Retain magic-link and the existing signup flow. Use fresh recipients/counter namespaces and retrying assertions rather than sleeps or global auth-limit disabling.
- Sensitive browser evidence: Better Auth reset links contain `/api/auth/reset-password/<token>` before the final `?token=` URL. Extend the current query-only redactor with focused reset-path cases; never print captured URLs/tokens. Reuse trace-off link journeys, evaluated navigation and pathname assertions; inspect the report archive as in the completed verification slice. Reset pages must not leak credentials through diagnostics or navigation/referrer behavior.

Focused commands are `pnpm exec vitest run src/modules/auth src/test/browser-diagnostics.test.ts`, `pnpm exec vitest run --config vitest.integration.config.ts src/modules/auth`, and `pnpm exec playwright test e2e/password-recovery.spec.ts e2e/verification-recovery.spec.ts e2e/email-verification.spec.ts e2e/magic-link.spec.ts --project=chromium` after those new files exist. Final gates are `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm test:integration`, `pnpm test:e2e`, `pnpm exec drizzle-kit check --config drizzle.config.ts`, `pnpm build`, changed-file Prettier and `git diff --check`. Normal commit hooks, independent review and main CI remain required. No runtime suite was run to validate this unimplemented plan.

Local mailbox evidence does not prove remote receipt. Protected migration and a real hosted reset/verification journey are separately authorized evidence; preserve existing T-21.5 historical transport proof without relabeling it as recovery verification.

## Risks and assumptions

The main risks are bypassed automatic/server sends, recipient existence leakage, non-atomic counter admission, lost background work and stale-session acceptance. The explicit seams and real database/browser obligations above address them without overriding Better Auth lifecycle behavior. Counter cleanup is bounded; database outage fails admission closed; a database-backed setting cache is not a rate limiter.

Source grounding: [Better Auth recovery](https://better-auth.com/docs/authentication/email-password), [hooks](https://better-auth.com/docs/concepts/hooks), [rate limits](https://better-auth.com/docs/concepts/rate-limit), installed `better-auth/dist/api/routes/{password,email-verification}.mjs`, `api/{dispatch,to-auth-endpoints}.mjs`, the resolved `@better-auth/drizzle-adapter` implementation, installed `next/dist/docs/01-app/03-api-reference/04-functions/after.md`, and [Vercel request headers](https://vercel.com/docs/headers/request-headers#x-forwarded-for). Inspect the installed source again if versions change. A possible adapter concurrency defect is not claimed as reproduced evidence.

No additional broad product decision blocks this plan. Hosted target access, Docker/browser availability and production secrets are verified at the relevant execution step without silently substituting a different environment.

## Handoff to task breakdown

The owner authorized the consolidated T-27.1–T-27.4 breakdown. Reuse this plan and the completed browser-slice record; do not create an overlapping account plan. Keep runtime-safety/notification and Sanity product scope separate while preserving any shared-file integration order in TODO.md. Plan acceptance does not start implementation, update verification status or authorize hosted operations.
