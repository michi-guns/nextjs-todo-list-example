# T-25 current delivery documentation plan

**Status:** Accepted under the owner's authorization for truthful partial documentation before Production is available.

**Goal:** Make current setup, environment identity, delivery limits and recovery actions understandable from repository documentation.

**Spec and decisions:** [TD-026](../../../.dwf/decisions/TECHNICAL.md#td-026), [TD-027](../../../.dwf/decisions/TECHNICAL.md#td-027), [T-25](../../../TODO.md#t-25-carefully-document-the-complete-environment-and-delivery-system), and existing TST-ENV/PIPELINE/PREVIEW/RELEASE contracts.

**Architecture:** Supporting docs reference DWF contracts and actual scripts. No new workflow, provider or requirement is introduced.

**Global constraints:** Preserve the distinction between implemented tooling, local evidence and hosted proof. No secrets or invented Production commands. No external mutation during documentation verification.

## Current state and file map

README names a stale pnpm version. CONTEXT incorrectly says CI/Preview workflows are absent and durable Development is pending. Existing Local/Development examples insert a separator that pnpm 11 forwards to parsers which do not accept it. The source accepts direct script arguments without that separator.

Update README and current runbook examples, CONTEXT and supporting indexes. Add `docs/architecture/environments.md` for the concise matrix/lifecycle and `docs/runbooks/preview-delivery.md` for the current blocked state, preflight, exact-ref semantics and explicit cleanup limits. Add a Production readiness page identifying T-23 prerequisites rather than pretending a release procedure exists. Reconcile stale hosted-prerequisite statements in TESTING without changing status.

## Dependencies and work order

Read-only source/manifest/workflow evidence is sufficient. Resend code and T-27 browser slice are merged. The T-22 repair/evidence checkpoint is draft PR #30; the first-deployment decision remains unresolved. T-24's local test slice is under review. Record these boundaries without claiming completion. Write the docs, check relative links and command shapes, format and obtain fresh review.

## Verification strategy

Review examples against the parsers and workflows; validate local relative file links and document anchors; run changed-file Prettier and `git diff --check`. This prose-only slice does not rerun application suites. No hosted command is executed for a copy/paste check. Reuse recorded evidence with its exact limits.

## Risks and assumptions

Vercel's documented first-deployment Production behavior invalidates the original Preview plan assumption. Stop instructions must precede deployment examples. The existing cleanup command deletes the matched Neon branch only, not Vercel deployments. Production remains separately provisioned and protected under TD-026; current Neon main is not an approved Production target.

## Handoff to task breakdown

Complete T-25's current-context/version reconciliation and available operational documentation slice. Keep full Preview/release/recovery completion pending the respective implemented and verified workflows.
