# Documentation Protocol

This is the navigation and maintenance protocol for the project's design, supporting documentation, and operational material.

## Reading order

1. [`.dwf/README.md`](../.dwf/README.md)
2. [`.dwf/RULES.md`](../.dwf/RULES.md) and [`.dwf/CONTEXT.md`](../.dwf/CONTEXT.md), when present
3. [`.dwf/PRD.md`](../.dwf/PRD.md) and the relevant sections of [`.dwf/SPEC.md`](../.dwf/SPEC.md)
4. Relevant [`.dwf/DECISIONS.md`](../.dwf/DECISIONS.md), ADRs, open questions, and open decisions
5. Supporting architecture, domain, data, development, handbook, and runbook documents under `docs/`

## Authority

- `.dwf/PRD.md` defines current observable product behavior.
- `.dwf/SPEC.md` defines the current technical implementation contract and is subordinate to the PRD.
- `.dwf/DECISIONS.md` and `.dwf/ADRs/` preserve rationale/history and must be reflected into current-state PRD/SPEC when they affect current behavior.
- `.dwf/OPEN-QUESTIONS.md` contains unresolved facts; `.dwf/OPEN-DECISIONS.md` contains unresolved choices. Neither is accepted truth.
- `.dwf/concepts/` and any `.dwf/artifacts/` are derived explanations/projections, never authorities.
- `docs/` supplies supporting, operational, and explanatory material. It must not silently override `.dwf/`.
- Conversation history and Delivery artifacts are not design authority.

## Update rules

- Product behavior changes update `.dwf/PRD.md`, affected technical contracts/tests, and supporting documents.
- Technical or architectural changes update `.dwf/SPEC.md` and add or amend an ADR when rationale is worth preserving.
- Do not silently resolve contradictions. Preserve uncertainty and record the appropriate open question/decision.
- Move verified facts from open questions into `.dwf/CONTEXT.md`, `.dwf/RULES.md`, PRD, or SPEC according to semantic ownership.
- Keep Delivery Roadmap/Milestone/Phase state outside `.dwf/`; Delivery may reference `.dwf/` but must not redefine it.
- Keep implementation tasks, file-level coding plans, and executor orchestration below the Delivery Phase boundary.
- Repeated operational problems get a runbook under `docs/runbooks/`.
- One document should own one concept or decision; prefer links over duplicated normative prose.
- Repair navigation when canonical files move.

## ADR rules

Accepted ADRs are not silently rewritten. Corrections may clarify wording without changing the decision. Changed decisions require a new ADR, and the previous ADR is marked superseded.

## Completion checklist

- Canonical DWF artifacts were read.
- Relevant repository evidence, facts, assumptions, and open questions were checked.
- Current-state documents and indexes are accurate.
- Accepted decisions/ADRs are reflected in current PRD/SPEC where applicable.
- Delivery artifacts, if present, reference rather than duplicate DWF authority.
- Written rules are enforced by tests or tooling where practical.
- Remaining uncertainty is reported honestly.
