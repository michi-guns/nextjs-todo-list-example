---
name: generate-agent-prd
description: Use when creating or refreshing output/agent/PRD.md from the project Workspace durable product state.
metadata:
  version: "0.1.0-proposal.1.local.2"
  maturity: "proposal"
---

# Generate Agent PRD

## Goal

Produce an exact, implementation-consumable product contract with minimal avoidable inference.

## Authoritative inputs

Read, in this order as relevant:

1. `RULES.md` for mandatory project constraints;
2. `CONTEXT.md` for verified durable facts;
3. `decisions/PRODUCT.md` for accepted `D-*` truth;
4. `decisions/EDGE-CASES.md` for considered scenarios and coverage checks;
5. `decisions/OPEN-QUESTIONS.md` / `OPEN-DECISIONS.md` so unresolved behavior is not presented as settled;
6. project glossary/concepts only as aids to interpretation, not competing authority.

`decisions/TECHNICAL.md` is not a source for inventing product behavior. Consult it only to detect accidental leakage/conflict when useful.

## Generation rules

- Express observable behavior, states, boundaries, failure semantics, lifecycle, actors, and constraints precisely enough for downstream technical design.
- Preserve all accepted `D-*` semantics.
- Use compact traceability metadata/references where useful.
- Keep unresolved blocking `OQ-*`/`OD-*` visible rather than guessing.
- Do not make implementation mechanisms product requirements unless an accepted `D-*` requires the observable mechanism itself.
- Do not duplicate decision ledger entries wholesale. Include only the contract details the PRD reader needs.

## Validation

Before writing:

- every normative behavior must be supported by durable Workspace authority;
- no accepted `D-*` may be omitted or contradicted;
- no superseded decision may be treated as current;
- no open item may be silently resolved.

After writing, run `validate-workspace` and then regenerate Agent SPEC if the PRD changed materially.
