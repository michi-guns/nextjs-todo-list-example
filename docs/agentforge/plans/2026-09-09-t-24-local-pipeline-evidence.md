# T-24 local pipeline evidence plan

**Status:** Accepted under the owner's authorization to complete this local slice independently of hosted/Production prerequisites.

**Goal:** Provide one local pipeline command and prove that failed Preview stages stop subsequent operations and still permit identity-checked explicit cleanup.

**Spec and decisions:** [TD-026](../../../.dwf/decisions/TECHNICAL.md#td-026), [T-24](../../../TODO.md#t-24-prove-the-complete-environment-and-delivery-pipeline), TST-ENV-001, TST-PIPELINE-001, TST-PREVIEW-001 and TST-RELEASE-001.

**Architecture:** Extend existing injected-runtime tests in `scripts/deploy/preview/core.test.ts`. Keep the environment matrix and static workflow tests as their existing authorities. Add `test:pipeline` to `package.json` to run these local layers together.

**Global constraints:** No provider calls, database resets or deployment in these tests. No release workflow or approval simulation is invented. T-24 remains incomplete.

## Current state and file map

Existing tests prove wrong-profile, wrong-ref/dirty-checkout and branch-identity refusal plus happy-path call counts and explicit cleanup. Add assertions for stage order, migration/seed/deploy/smoke failures, absence of success evidence after failure, and explicit cleanup after a failed attempt. Preserve refusal when cleanup observes another branch identity.

`package.json` owns the grouped command. TODO and the testing ledger record the additional local evidence and hosted limitations. No runtime change is planned.

## Dependencies and work order

Installed dependencies and local Git are required for the focused tests. Docker and Chromium are present for the parent task's local gates. Write evidence tests, add the command, run all local checks, reconcile the ledger, and obtain independent review.

Hosted Preview remains blocked by the first-deployment Production prerequisite discovered in T-22 and its team-scoped lookup repair. Production release rehearsal requires the unimplemented T-23 and protected target. These unavailable named boundaries do not prevent this explicitly authorized local slice.

## Verification strategy

Run `pnpm test:pipeline`, `pnpm test`, `pnpm test:integration`, `pnpm test:e2e`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, changed formatting and diff checks. Tests for existing behavior may pass immediately; do not introduce a defect to manufacture RED. Local injection proves control flow only, not hosted cleanup or a working deployment. Keep all hosted contract statuses partial/specified as appropriate.

## Risks and assumptions

Cleanup is a separate explicit command today. Tests must preserve that behavior, not assume rollback or automatically delete retained resources. An error must prevent success evidence and later deployment stages. Do not count a Production-tagged first Vercel deployment as Preview evidence.

## Handoff to task breakdown

One local T-24 slice: stage/failure/cleanup tests, grouped command, local gates and evidence. Retain the parent task's hosted Preview and protected release acceptance as pending.
