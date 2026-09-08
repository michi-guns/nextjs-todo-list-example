# T-27 local email verification browser plan

**Status:** Accepted by the owner's 2026-09-09 authorization to deliver this local slice independently.

**Goal:** Prove fresh browser signup, pending-access refusal, email verification, Inbox access, and password sign-in after sign-out.

**Spec and decisions:** [PRD](../../../.dwf/output/agent/PRD.md), [SPEC §2](../../../.dwf/output/agent/SPEC.md#2-auth-better-auth), [TST-AUTH-001](../../../.dwf/decisions/TESTING.md#tst-auth-001), [TST-E2E-001](../../../.dwf/decisions/TESTING.md#tst-e2e-001), [T-27](../../../TODO.md#t-27-complete-authentication-product-flows-and-abuse-resistance).

**Architecture:** Exercise the existing signup UI and Better Auth route in Chromium through the existing fixture and local mailbox. Better Auth continues to own verification and sessions.

**Global constraints:** One synthetic fresh account per attempt. No provider delivery, seed-account substitution, direct database updates, session injection, or auth handler shortcuts. The parent T-27 remains incomplete.

## Current state and file map

- `e2e/fixtures.ts` supplies browser diagnostics and bounded mailbox polling.
- `e2e/global-setup.ts` owns the PostgreSQL Testcontainer, migration, seed, dedicated Next.js server and temporary mailbox.
- `components/auth/sign-up-form.tsx` already displays verification pending after signup.
- Add `e2e/email-verification.spec.ts`; extend evidence in `.dwf/decisions/TESTING.md` and `TODO.md`. No runtime change is expected.

## Dependencies and work order

Installed dependencies, Docker and Chromium have passed preflight. The baseline 7 browser journeys and 23 integration tests pass. Set TEMP/TMP inside the owner-approved michi-guns directory. The owner explicitly permits this slice before the parent's remote-mail and pipeline prerequisites.

Extend the two existing test contracts for this explicit browser evidence, implement the journey, run focused and full checks, and obtain fresh independent review before pushing the task PR.

## Verification strategy

Run `pnpm exec playwright test e2e/email-verification.spec.ts --project=chromium`, then `pnpm test:e2e`. Run `pnpm test`, `pnpm test:integration`, `pnpm typecheck`, `pnpm lint`, changed-file Prettier and `git diff --check` as required by the parent acceptance. Test-only evidence may pass immediately against existing correct behavior; do not introduce a runtime defect just to produce RED. Confirm the test detects unverified dashboard access and password-credential regressions through its assertions.

## Risks and assumptions

Use `randomUUID()` for a fresh recipient. Navigate through browser evaluation so Playwright's report step title contains no verification URL, then poll only the pathname. Trace recording is disabled for this link-bearing journey. Redact token query values from the shared browser diagnostics using `src/test/browser-diagnostics.ts`, with focused regression tests. Inspect the actual HTML report archive for token-bearing verification steps after the browser run. This addresses the independent review's observed report leak while retaining the diagnostics checks. Clear the harness mailbox before and in finally. No new product behavior or real inbox claim follows from this test.

## Handoff to task breakdown

The existing T-27 local browser acceptance is the complete ordered task slice. Link this plan and record the owner's dependency exception in TODO before implementation. Mark only the local browser acceptance complete after verification; retain the parent's outstanding product, remote-mail, and abuse-resistance work.
