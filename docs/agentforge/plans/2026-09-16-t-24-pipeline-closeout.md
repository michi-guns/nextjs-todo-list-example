# T-24 complete pipeline evidence reconciliation

**Status:** Accepted within the owner's instruction to continue unblocked delivery tasks autonomously. Extends the completed [local slice](2026-09-09-t-24-local-pipeline-evidence.md).

**Goal:** Close the environment and pipeline baseline with one traceable matrix of required local, static and real hosted evidence.

**Spec and decisions:** [SPEC 10.7](../../../.dwf/output/agent/SPEC.md#107-environment-and-delivery-evidence), [SPEC 11](../../../.dwf/output/agent/SPEC.md#11-environment-and-delivery-contract), TD-026/027, and [TST-ENV-001 / TST-PIPELINE-001](../../../.dwf/decisions/TESTING.md#tst-env-001).

**Architecture:** Reuse the implemented environment guards and Preview/Production runners. Reconcile their evidence; do not add another runner, test framework or provider abstraction.

**Global constraints:** No provider mutation, new deployment, credential change, seed, cleanup or Production failure injection. Existing reviewed implementation and test files remain unchanged unless an actual required-evidence gap is found.

## Current state and file map

- `src/test/environment/` and `scripts/environment/` own four-profile validation, target guards and refusal before mutation.
- `src/test/pipeline/` owns static CI/Preview/mail/Production trigger, approval, secret scope and exact-checkout contracts.
- `scripts/deploy/preview/*.test.ts` own stage order, explicit identity-matched cleanup, expiry and failure behavior. [Hosted Preview evidence](../evidence/2026-09-14-preview-run.md) proves the real branch, migration, seed, browser journey and cleanup.
- `scripts/deploy/production/*.test.ts` own exact-ref/CI selection, protected-profile refusal, observed identity, stage order and separate partial-failure records. [Live release evidence](../evidence/2026-09-16-production-release-live.md) proves approval, migration, exact deployment, authentication and signed Sanity delivery.
- Add `docs/agentforge/evidence/2026-09-16-pipeline-closeout.md` with a requirement-to-evidence matrix and exact verification results. Reconcile `.dwf/decisions/TESTING.md` and `TODO.md`; T-25 owns broader operational documentation.

## Dependencies and work order

T-18 through T-23 are complete, including reviewed PR #39. Installed pnpm dependencies and local Git are required for the focused pipeline gate. Read-only authenticated GitHub, Neon and Vercel metadata are required to corroborate recorded hosted identities and protection. Docker and browser prerequisites apply only if a new executable change invalidates the existing same-code integration/browser evidence.

Inspect current sources and safe provider metadata, map each acceptance clause to evidence, run the focused pipeline suite, then reconcile statuses and obtain independent exact-tip review. A missing mandatory boundary stops closeout; it cannot be replaced by another unit assertion.

## Verification strategy

- Run `pnpm test:pipeline`, including workflow static checks and all Production tests.
- Reuse the same-code implementation's passing typecheck, lint, build, migration shape, 23 integration tests and 24 cross-browser journeys. PR #39 CI `35115190232` reran typecheck, lint, 415 unit tests, build, migration shape, 23 integration tests and eight Chromium journeys after the documentation changes; both jobs passed. Confirm no executable diff from that reviewed revision.
- Reuse the recorded real Preview lifecycle and Production runs. Read provider/Environment metadata only; do not recreate or destroy a hosted resource for redundant evidence.
- Check documentation links/anchors, changed-file Prettier, safe evidence redaction and `git diff --check`. The commit hook runs the unit suite; hosted CI and fresh independent review gate merge.
- Mark `TST-ENV-001` and `TST-PIPELINE-001` verified only when every baseline clause is mapped. Preserve `TST-PREVIEW-001`, `TST-RELEASE-001` and the named migration/auth/Sanity evidence limits.

## Risks and assumptions

Deterministic injected failures establish control flow, not provider outcomes. The real controlled lifecycle supplies the provider boundary proof; Production failure injection is neither required nor permitted. Mail shape checks cannot prove key validity; retain T-23's real failed attempt and successful repair. Existing evidence is reusable only for unchanged behavior and must retain its original SHA/run attribution.

## Handoff to task breakdown

One T-24 closeout unit: audit the evidence matrix, execute the focused gate, reconcile the two partial contracts and dependency checkpoint, then review/CI/merge. No new product decision or application implementation is planned.
