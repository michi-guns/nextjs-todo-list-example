# Documentation Protocol

This is the navigation and maintenance protocol for the project's design, supporting documentation, and operational material.

## Reading order

1. [`docs/index.md`](index.md)
2. [Project glossary](glossary.md), when project-specific terminology is involved
3. [`.dwf/RULES.md`](../.dwf/RULES.md) and [`.dwf/CONTEXT.md`](../.dwf/CONTEXT.md), when present
4. [`.dwf/output/agent/PRD.md`](../.dwf/output/agent/PRD.md) and the relevant sections of [`.dwf/output/agent/SPEC.md`](../.dwf/output/agent/SPEC.md)
5. Relevant [`.dwf/decisions/`](../.dwf/decisions/) ledgers, including [`TESTING.md`](../.dwf/decisions/TESTING.md) for affected behavior, and supporting architecture/domain/data documents
6. Human projections, concepts, handbook, development, runbook, and protocol material as needed

## Authority

- `.dwf/output/agent/PRD.md` defines current observable product behavior.
- `.dwf/output/agent/SPEC.md` defines the current technical implementation contract and is subordinate to the Agent PRD.
- `.dwf/decisions/PRODUCT.md` and `.dwf/decisions/TECHNICAL.md` contain concise accepted results and must be reflected into current projections when they affect behavior or implementation.
- `.dwf/decisions/TESTING.md` owns testing policy and durable `TST-*` test contracts. It links those contracts to Product Decisions, Technical Decisions, Edge Cases, SPEC areas, delivery tasks, and evidence without overriding the other ledgers.
- `.dwf/decisions/EDGE-CASES.md` records explicitly considered scenarios; `.dwf/decisions/OPEN-QUESTIONS.md` and `.dwf/decisions/OPEN-DECISIONS.md` are unresolved state, never accepted truth.
- `.dwf/concepts/` and `.dwf/output/human/` are derived explanations/projections, never authorities.
- `docs/` supplies supporting, operational, and explanatory material. It must not silently override `.dwf/`.
- Conversation history and Delivery artifacts are not design authority.

## Update rules

- Product behavior changes update the durable product decisions and regenerated Agent PRD, plus affected technical contracts, tests, and supporting documents.
- Technical or architectural changes update the durable technical decisions and regenerated Agent SPEC. Record reasoning only when the tradeoff is unusually complex or likely to be questioned later.
- Behavior changes update the affected `TST-*` contracts and delivery-task references. Test implementation and run evidence should follow the contract; they must not silently become a second source of requirements.
- Keep `OPEN-DECISIONS.md` for unresolved choices only. Accepted choices may go directly into their owning decision ledger. When an open choice is resolved, record its result and remove the open entry.
- Keep decision entries thin and avoid copying the same rule into documents whose readers do not need it.
- Do not silently resolve contradictions. Preserve uncertainty and record the appropriate open question/decision.
- Move verified facts from open questions into `.dwf/CONTEXT.md`, `.dwf/RULES.md`, or the relevant decision/projection according to semantic ownership.
- Keep Delivery Roadmap/Milestone/Phase state outside `.dwf/`; Delivery may reference `.dwf/` but must not redefine it.

## Maintenance

- Repeated operational problems get a runbook under `docs/runbooks/`.
- One document should own one concept or decision. Prefer links over repeated normative prose.
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
