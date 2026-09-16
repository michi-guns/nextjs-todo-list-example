# T-25 delivery documentation closeout

**Status:** Accepted under the owner's instruction to continue unblocked tasks. Completes the [earlier documentation slice](2026-09-09-t-25-delivery-documentation.md) after T-24's reviewed merge.

**Goal:** Let an operator configure, verify, preview, release and recover this starter using current repository instructions.

**Spec and decisions:** [SPEC 11](../../../.dwf/output/agent/SPEC.md#11-environment-and-delivery-contract), TD-025/026/027, [T-25](../../../TODO.md#t-25-carefully-document-the-complete-environment-and-delivery-system), and the [verified pipeline matrix](../evidence/2026-09-16-pipeline-closeout.md).

**Architecture:** Link operational instructions to the existing guarded commands, workflow inputs and canonical contracts. Update facts and navigation, with no new design authority.

**Global constraints:** Documentation only. No application/test/dependency/workflow changes, provider mutation, new release, credential access or migration execution. Historical evidence retains its original results and timestamps.

## Current state and file map

- `README.md` still says no Production workflow exists and omits pipeline/release command discovery. Name the intended target beside migration examples and link the real release procedure.
- `.dwf/CONTEXT.md` still describes the pre-release state and unchanged Resend key. Replace those current-state facts with the verified release/pipeline facts, without changing decisions or generated specifications.
- `docs/architecture/environments.md` needs the verified Production row and a release path beside its existing Preview sequence.
- `docs/runbooks/environment-profiles.md` needs current consumer wording, explicit ownership of hosted secret/variable categories, and actual CLI/workflow entry points instead of reserved parser shapes.
- `docs/runbooks/local-development-and-verification.md` should route migrations by Local/Development/Production target and link release operations. Preserve disposable harness ownership and failure recovery.
- `docs/runbooks/preview-delivery.md` needs current baseline status while preserving first-deployment history, authorization and cleanup limits.
- `docs/index.md` and `docs/development/quality-gates.md` should link release/recovery and pipeline evidence. The existing Production/auth/failure runbooks already contain the successful release and mail repair.
- `TODO.md` records final acceptance and dependency readiness. The derived-app identity map remains T-29's separately reviewed closeout.

## Dependencies and work order

T-18 through T-24 are complete. The relevant source, package manifest, workflows, parsers and safe evidence were inspected read-only before this plan. Only readable repository files, Git, installed Prettier and the local link checker are required. No live credentials, Docker or browser session is needed for this prose-only task.

Update current instructions and navigation, compare commands and setting names with their owning implementation, then validate and obtain independent review before merge.

## Verification strategy

- Review command shapes against `package.json`, environment/Preview/Production parsers and workflow inputs without executing mutation commands.
- Check that each operational command states its target and authorization boundary; direct and pooled roles, seed/cleanup ownership, mail/CMS policy and forward-only recovery remain clear.
- Validate relative links/anchors, changed-file Prettier and `git diff --check`; search the changed current-state docs for stale pre-release claims.
- Retain `TST-ENV-001`, `TST-PIPELINE-001`, `TST-PREVIEW-001`, `TST-RELEASE-001`, migration/harness and Sanity statuses. No behavior or evidence requirement changes.
- Reuse unchanged-code verification. The mandatory commit hook and hosted CI still run; a fresh exact-tip independent reviewer assesses the final prose against accepted contracts.

## Risks and assumptions

Copyable commands can select the wrong database when their target is implicit. Prefer the existing guarded target-specific commands and put Production behind the documented protected workflow. Credentials stay out of docs; only names, public identities and safe placeholders appear. A verified checkpoint does not authorize future releases or guarantee future provider availability.

## Handoff to task breakdown

One documentation closeout: current-state/command/ownership updates, links and source review, final TODO reconciliation, independent review and CI. T-29 follows this merge; unaccepted post-baseline scope remains out of this task.
