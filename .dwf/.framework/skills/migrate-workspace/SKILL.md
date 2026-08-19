---
name: migrate-workspace
description: Use when converting an existing project documentation set or older DWF layout into the current standard .dwf Workspace schema.
metadata:
  version: "0.1.0-proposal.1.local.2"
  maturity: "proposal"
---

# Migrate Workspace

## Principle

The target schema is predictable. Mapping arbitrary existing documentation into it is semantic and best-effort, not a brittle filename converter.

## Procedure

1. Inventory existing project documentation and the current `.dwf/` if present.
2. Read documents for meaning before deciding ownership.
3. Classify content into:
   - project context/facts;
   - mandatory project rules;
   - `D-*` Product Decisions;
   - `TD-*` Technical Decisions;
   - `EC-*` Edge Cases;
   - `OQ-*` Open Questions;
   - `OD-*` Open Decisions;
   - derived Concepts;
   - generated PRD/SPEC projections.
4. Preserve current accepted decisions and stable IDs. Carry rationale or superseded entries only when current work still needs them.
5. Split mixed-authority legacy documents when necessary.
6. Do not silently reconcile contradictions. Promote unresolved conflicts to `OQ-*` or `OD-*` as appropriate.
7. Normalize into the standard required file locations.
8. Repair references after moves/renames.
9. Regenerate Agent outputs from durable state; then derive Human outputs.
10. Validate the result.

## Important rules

- Do not modify `.framework/**`.
- Do not create `sessions/`, `topics/`, ADR ledgers, or alternative decision files merely to preserve old process structure.
- Do not infer missing requirements from source code.
- Do not manufacture content just to make files look populated.
