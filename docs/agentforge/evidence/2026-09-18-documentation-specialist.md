# Documentation specialist verification

Date: 2026-09-18. Delivery task: [T-32](../../../TODO.md#t-32-specialize-documentation-maintenance-and-agent-context-audits).

## Delivered behavior

The existing [documentation skill](../../../.agents/skills/documentation-and-adrs/SKILL.md)
now owns the shared documentation-specialist instructions. Its maintenance mode
can update scoped project documentation; audit and review modes are read-only.
The parent delegates substantial passes and owns Git, tests and integration.
Trivial edits stay inline. No persistent worker or separate copied harness
profile is installed.

The skill covers product/domain explanations, architecture, decisions/ADRs,
operational guides, and affected AI context. It follows the existing DWF
authority map, preserves historical evidence, and reports code/contract
disagreement instead of treating code as permission to change requirements.

The router, root instructions and documentation navigation now link to that
owner. Context engineering handles session evidence selection. Generic
React 18/TypeScript 5/Prisma rules-file examples and unrelated ADR templates
were removed from these two project skills; they did not describe this starter.
AgentForge and its supplied DWF framework remain installed and in scope.

## Independent forward-tests

Two fresh sub-agents received the skill and raw artifacts without the parent's
expected answers. Neither was a substitute for final exact-tip review.

| Case            | Input and permitted actions                                                                                                                                                                    | Observed result                                                                                                                                                                 |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Maintenance     | An isolated temporary fixture with a stale README, package scripts, an accepted 2,000-character notes contract, and an implementation constant of 3,000. Only the fixture README could change. | Corrected the dev commands and separate seed step, retained the accepted limit, explicitly reported the conflicting code constant, and left source/contract/manifest unchanged. |
| Read-only audit | Current Git workflow instructions and directly related review/testing documentation, with the approved no-PR policy as intent.                                                                 | Made no edits. Found one real contradictory sentence about how to interpret historical reviewer names and returned an anchored, minimal correction.                             |

The parent inspected the resulting fixture README and unchanged implementation.
The maintenance agent also checked hashes of its protected inputs and local
links. The fixture is not an application test and its invented disagreement is
not a product defect in this repository.

The audit finding was actionable: `code-review-and-quality` said old plans
naming GPT-5.6-Sol meant the current selection rule, while `AGENTS.md` correctly
preserved the reviewer actually used. The current instruction now matches the
owner. Historical plans and evidence were not rewritten.

## Checks and limits

- The skill-creator `quick_validate.py` passes for documentation-and-adrs and
  context-engineering. It checks structure, not agent behavior.
- Changed-file Prettier, local Markdown destinations/anchors and
  `git diff --check` pass. The final task entry records the completed count.
- Pre-upgrade `pnpm typecheck` and `pnpm lint` pass; lint retains the existing
  unused `Geist` warning. These unchanged-code results are not required to
  establish the specialist's behavior.
- No product `TST-*` status changes, application edits, credential changes,
  hosted operations, or framework removal were made by this task.
- Forward-tests are focused evidence, not a guarantee of every future agent
  decision. Independent exact-tip review still gates integration.
