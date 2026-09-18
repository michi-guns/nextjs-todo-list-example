# Workflow, documentation stewardship, and dependency refresh

**Status:** Accepted

**Goal:** Deliver the owner's three approved maintenance tasks without changing
the todo product scope or replacing AgentForge.

**Spec and decisions:** [Repository rules](../../../AGENTS.md),
[documentation protocol](../../documentation-protocol.md),
[Agent SPEC](../../../.dwf/output/agent/SPEC.md),
[TD-028](../../../.dwf/decisions/TECHNICAL.md#td-028), and
[testing ledger](../../../.dwf/decisions/TESTING.md).

**Architecture:** Keep the existing repository and authority structure. Use
short-lived task branches with direct merges, an adapted existing documentation
skill for specialist delegation, and related dependency groups with regression
checks. No new application capability or agent framework is needed.

**Global constraints:** No PR is required. Preserve independent exact-tip review
and protected hosted-release gates. Delete only branches proven merged into
`main` and unused by another worker. Preserve the existing dependency stash.
Select stable package releases, allow the Drizzle RC line, and keep TypeScript
below 7. Do not apply stashed package versions as upgrade authority.

## Current state and file map

- `AGENTS.md` owns repository-wide execution, safety, and Git rules. `TODO.md`
  owns delivery selection and task evidence. Their PR requirement conflicts
  with the newly approved workflow and must be replaced.
- `git-workflow-and-versioning`, `code-review-and-quality`,
  `testing-first-class`, and the testing ledger contain related execution
  guidance. Reconcile current instructions, preserving historical PR records.
- `documentation-and-adrs` is the documentation skill; `context-engineering`
  owns session context setup. Adapt the former for documentation maintenance
  and focused context audits, and route to it without duplicating the workflow.
- `docs/documentation-protocol.md` remains the authority map. `.dwf/.framework/`
  stays read-only. Source-project agent profiles are inspiration only.
- `package.json` and `pnpm-lock.yaml` own package declarations and resolutions.
  `docs/architecture/stack.md` describes the stack. Changes to source, test
  configuration, or framework integration must be required by an upgrade.

## Dependencies and work order

1. T-31 establishes the approved branch/merge/cleanup workflow.
2. T-32 delivers the documentation specialist and checks its behavior on
   representative maintenance and context-conflict requests.
3. T-33 refreshes dependencies in related groups, checks compatibility, and
   uses the specialist to reconcile affected documentation.

The first two tasks require only repository files, Git, and the existing
formatter. Dependency installation additionally requires registry access.
Integration/browser verification requires Docker and the selected Playwright
browsers. The initial read-only preflight found Node 24.18.0, pnpm 11.25.0,
Docker 29.7.2, installed dependencies, and Playwright 1.62.1 browsers available.
New browser revisions may be installed as part of the authorized upgrade.
No hosted deployment or database mutation is part of this plan.

## Verification strategy

- T-31: current-rule consistency, local Markdown links, changed-file Prettier,
  `git diff --check`, and independent exact-tip review. No product `TST-*`
  status changes are needed for prose-only workflow edits.
- T-32: skill validation, focused forward-testing by an independent sub-agent,
  link/format checks, and independent review. Test maintenance vs review-only
  boundaries, code/contract disagreement, and duplicate context guidance.
- T-33: compare registry releases and official migration notes, record a
  pre-upgrade test baseline, and verify each related group with affected checks.
  Final commands are `pnpm typecheck`, `pnpm lint`, `pnpm test`,
  `pnpm test:integration`, `pnpm test:e2e`, `pnpm test:e2e:cross-browser`,
  `pnpm exec drizzle-kit check --config drizzle.config.ts`, `pnpm build`,
  changed-file formatting, and `git diff --check`. Read installed-version
  Next.js guides before changing application code. Add regression tests only
  when compatibility repairs change meaningful executable behavior.
- Dependency verification covers the local portions of the existing
  `TST-FOUNDATION-001`, `TST-MIGRATION-001`, `TST-HARNESS-001`,
  `TST-PERSISTENCE-001`, `TST-AUTH-*`, `TST-LISTS-*`, `TST-TASKS-*`,
  `TST-CONCURRENCY-001`, `TST-BOUNDARY-001`, `TST-LANDING-*`, `TST-UI-001`,
  `TST-E2E-*`, `TST-ENV-001`, `TST-PIPELINE-001`, `TST-PREVIEW-001`, and
  `TST-RELEASE-001`. Preserve previously recorded hosted/performance evidence
  with its original date and scope; local reruns do not refresh hosted proof.

## Risks and assumptions

Stable major releases can require migration work. Keep related upgrades
separate enough to identify failures; stop for a real contract conflict rather
than weakening verification. TypeScript 7 is explicitly excluded. Existing
unrelated work, secrets, historical evidence, and active parallel branches are
preserved. The documentation specialist reports framework overhead with
concrete examples; it does not remove AgentForge or decide product scope.

## Handoff to task breakdown

Create T-31, T-32, and T-33 in `TODO.md` with the scopes and checks above.
Complete their review/fix/merge loop in order. Finish on clean `main` with only
active parallel-work branches excepted, and report any concrete remaining
blocker without starting T-26, T-27, or T-28.
