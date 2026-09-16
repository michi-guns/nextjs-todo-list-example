# T-21.5 Resend foundation plan

**Status:** Accepted. The code/local-evidence slice is implemented. Owner-domain verification and controlled real delivery were completed on 2026-09-16; protected Production configuration remains pending. See the dated continuation below.

**Goal:** Wire the existing auth-mail boundary to one explicitly selected remote provider and reject invalid mail configuration before a Production profile can be accepted.

**Spec and decisions:** [TD-027](../../../.dwf/decisions/TECHNICAL.md#td-027), [SPEC auth](../../../.dwf/output/agent/SPEC.md#2-auth-better-auth), [T-21.5](../../../TODO.md#t-215-establish-the-minimum-production-mail-foundation), TST-AUTH-001/002, TST-ENV-001, TST-PIPELINE-001 and TST-RELEASE-001.

**Architecture:** Keep Better Auth callbacks unchanged. `deliverAuthEmail` selects local capture, Preview controlled-account no-op, or Resend in Production. Use native fetch against the documented fixed Resend API. No dependency, token system, queue or provider framework is needed.

**Global constraints:** No paid actions or domain purchase. No Production deployment/database operations. Secrets remain in protected configuration, never the safe environment inspection projection. Existing local tests continue using disposable PostgreSQL and the mailbox.

## Implementation starting point, 2026-09-09

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

## Documentation continuation, 2026-09-16

The owner requested a repository evidence update and a JZ handoff for a fresh
session. This authorizes documentation edits; it does not authorize protected
configuration changes, another email, or a Production release. The starting
point and unavailable-domain statements above describe 2026-09-09.

### Scope and file responsibilities

- Add `docs/agentforge/evidence/2026-09-16-resend-domain-delivery.md` as the
  record of approved DNS changes, provider verification, the one real send,
  Gmail's initial spam classification and the approved manual correction.
- Update `TODO.md` with the completed provider slice, the outstanding
  protected-configuration acceptance and the resulting next-task order.
- Reconcile `.dwf/CONTEXT.md` and `.dwf/decisions/TESTING.md` with this evidence.
  Keep the existing contract statuses; the send did not exercise a deployed
  Better Auth signup or magic-link session.
- Update `docs/runbooks/auth-mail.md`, `docs/runbooks/production-readiness.md`
  and `docs/architecture/environments.md` to distinguish available provider
  evidence from pending protected configuration and release work.
- Replace stale factual prerequisite snapshots in the Agent/Human SPEC with
  links to `CONTEXT.md`. Do not change accepted product or technical behavior.
- Allocate a new handoff through the installed `jz-handoff` helper after the
  repository update. Reference these artifacts rather than duplicating them.

### Prerequisites, order and verification

Repository reads, recorded session evidence, Node, pnpm and installed Prettier
are sufficient for this documentation slice. No database, running app, new
credential or deployment is required. Update this existing plan first, split
the existing T-21.5 checklist by evidence boundary, then reconcile the owning
documents and prepare the handoff. Do not create a competing delivery task.

Check changed Markdown with `pnpm exec prettier --check`, relative file links,
`git diff --check`, and a fresh independent review of the final artifacts.
Reuse earlier code-test evidence as historical evidence only; no executable
behavior changes in this slice. Reconcile TST-AUTH-001/002, TST-ENV-001,
TST-PIPELINE-001 and TST-RELEASE-001 without promoting provider delivery to
protected Production proof.

The next session must finish T-21.5's protected configuration and evidence
before treating T-23's mail prerequisite as satisfied. T-22 is complete;
T-24's remaining release evidence depends on T-23. DNS verification and manual
removal from Gmail Spam do not establish automatic inbox placement for other
recipients.
