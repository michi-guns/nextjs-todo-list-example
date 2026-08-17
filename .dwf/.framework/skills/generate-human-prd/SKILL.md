---
name: generate-human-prd
description: Use when deriving a human-oriented PRD from the already validated Agent PRD/SPEC pair without changing semantics.
metadata:
  version: "0.1.0-proposal.1"
  maturity: "proposal"
---

# Generate Human PRD

## Source

Derive from the validated Agent PRD/SPEC pair and use durable ledgers only to verify traceability or resolve presentation ambiguity.

## Goal

Optimize comprehension: direct language, actors, cause/effect, compact flows, realistic examples, and useful diagrams where appropriate.

## Invariants

- Preserve behavior exactly.
- Do not independently design or resolve gaps.
- Do not omit a constraint merely because it is inconvenient to explain.
- When simplification would change meaning, keep the precise meaning and improve the explanation instead.

After generation, compare against the Agent pair and regenerate if semantics diverged.
