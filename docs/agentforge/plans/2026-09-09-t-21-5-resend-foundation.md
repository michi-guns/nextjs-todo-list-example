# T-21.5 Resend foundation plan

**Status:** Accepted within the owner's overnight authorization for Resend and test-domain sends. Production readiness remains conditional on a verified owner domain.

**Goal:** Wire the existing auth-mail boundary to one explicitly selected remote provider and reject invalid mail configuration before a Production profile can be accepted.

**Spec and decisions:** [TD-027](../../../.dwf/decisions/TECHNICAL.md#td-027), [SPEC auth](../../../.dwf/output/agent/SPEC.md#2-auth-better-auth), [T-21.5](../../../TODO.md#t-215-establish-the-minimum-production-mail-foundation), TST-AUTH-001/002, TST-ENV-001, TST-PIPELINE-001 and TST-RELEASE-001.

**Architecture:** Keep Better Auth callbacks unchanged. `deliverAuthEmail` selects local capture, Preview controlled-account no-op, or Resend in Production. Use native fetch against the documented fixed Resend API. No dependency, token system, queue or provider framework is needed.

**Global constraints:** No paid actions or domain purchase. No Production deployment/database operations. Secrets remain in protected configuration, never the safe environment inspection projection. Existing local tests continue using disposable PostgreSQL and the mailbox.

## Current state and file map

- `auth-mail.ts` currently suppresses Preview sends and captures every other message locally. `lib/auth.ts` routes verification and magic-link callbacks through it.
- Add `src/modules/auth/infrastructure/resend-mail.ts` for configuration validation and bounded remote delivery; add focused tests beside it.
- Extend `auth-mail.ts` and its tests for fail-closed transport selection.
- `scripts/environment/core.ts` validates mail policy but accepts any provider name without provider credentials. Invoke the shared configuration validator for Production; retain the safe metadata-only mail projection.
- Update the two environment fixture matrices to represent the accepted provider and add missing/invalid configuration cases.
- Update environment-profile documentation, test ledger and TODO with implementation evidence and the unresolved sender-domain prerequisite.

## Dependencies and work order

Required to implement: installed pnpm/Node/Zod, existing auth-mail seam, owner-approved Resend. Present. Required for local regression verification: Docker and Chromium. Present and recently passing. Required only for real Production sender proof: owner domain verified by Resend, protected Production configuration and controlled real recipient. Unavailable; do not claim that evidence.

First write failing adapter/configuration tests. Implement a plain-text email containing Better Auth's original URL, distinct verification/sign-in subjects, and generic errors for HTTP, network and malformed responses. Bound calls to ten seconds and reject redirects. Then wire profile/runtime selection with negative tests before running the full local gates and a synthetic provider send.

## Verification strategy

Run focused Vitest mail/profile tests, `pnpm test`, `pnpm typecheck`, `pnpm lint`, formatting and diff checks. Run existing local integration and Chromium suites to prove local capture remains intact. TST-AUTH-001/002 gain remote-adapter request/error evidence, not real inbox proof. TST-ENV-001 gains missing configuration and wrong-profile refusal. TST-PIPELINE-001/RELEASE-001 remain incomplete because no Production release workflow exists.

The already authorized Resend test account supports `onboarding@resend.dev` to `delivered@resend.dev`. A separate synthetic send may exercise the adapter with a harmless example URL; never send real auth tokens to the test service. Production configuration rejects the test sender domain. Keep simulated delivery distinct from real inbox delivery.

## Risks and assumptions

Remote mail carries an auth URL and recipient. Send only to the fixed HTTPS provider endpoint; do not log bodies, headers, raw provider errors or exception causes. Validate credentials and sender without including rejected values in errors. Local/Development/Preview must never select remote delivery, even if a test API key happens to be present in local configuration. A syntactically valid key/address is not proof of a verified domain or working protected Production setup; T-23 must require that provider evidence before release.

Official references: [Resend send API](https://resend.com/docs/api-reference/emails/send-email), [test addresses](https://resend.com/docs/dashboard/emails/send-test-emails), [Better Auth verification](https://better-auth.com/docs/authentication/email-password).

## Handoff to task breakdown

Keep one T-21.5 task with a completed code/local-evidence slice and a pending real-domain/protected-release acceptance. Order adapter tests/implementation, profile/runtime wiring, local and synthetic evidence, documentation and independent review. Do not mark the parent complete without its remaining provider-readiness evidence.
