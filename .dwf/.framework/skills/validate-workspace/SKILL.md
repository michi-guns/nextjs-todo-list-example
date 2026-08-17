---
name: validate-workspace
description: Use after DWF Workspace creation/migration/design changes or before handoff to verify ownership, traceability, projection consistency, and framework isolation.
metadata:
  version: "0.1.0-proposal.1"
  maturity: "proposal"
---

# Validate Workspace

## Structural checks

- `.framework/VERSION` and `.framework/PROTOCOL.md` exist.
- required Workspace core files exist at standard locations.
- no alternative product/technical decision ledger competes with `decisions/PRODUCT.md` / `TECHNICAL.md`.
- Edge Cases live in `decisions/EDGE-CASES.md`, not `output/`.

## Framework isolation

- `.framework/**` contains no project-specific product/technical truth.
- normal project work did not modify `.framework/**`.

## Semantic checks

- stable `D-*`, `TD-*`, `EC-*`, `OQ-*`, `OD-*` IDs are unique and not reused;
- supersession links are coherent;
- `TD-*` does not override `D-*`;
- Agent PRD reflects current accepted `D-*` and does not invent behavior;
- Agent SPEC implements Agent PRD and reflects current accepted `TD-*`;
- Human outputs preserve the validated Agent semantics;
- `EC-*` points to owners rather than becoming a competing behavior source;
- unresolved blocking items remain visible;
- Concepts contain no unique required invariant;
- `output/` contains no unique design truth.

## Fresh-Agent test

Starting from `.dwf/README.md`, a capable Agent should be able to determine:

- what project/system this is;
- mandatory constraints;
- accepted Product Decisions;
- accepted Technical Decisions;
- important Edge Cases;
- unresolved facts/choices;
- where exact Agent contracts live;
- where deeper explanations live;
- which framework version governs the Workspace;

without historical chat/session files.

## Result

Report failures explicitly. Do not silently repair semantic conflicts unless the user authorized the corresponding write operation.
