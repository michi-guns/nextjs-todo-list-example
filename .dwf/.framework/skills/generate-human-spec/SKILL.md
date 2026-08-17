---
name: generate-human-spec
description: Use when deriving a human-oriented technical specification from the validated Agent PRD/SPEC pair without changing the technical contract.
metadata:
  version: "0.1.0-proposal.1"
  maturity: "proposal"
---

# Generate Human SPEC

## Source

Derive from the validated Agent PRD/SPEC pair.

## Goal

Transfer the system mental model to developers efficiently using clearer narrative, concrete flows, diagrams, examples, and conceptual TypeScript/pseudocode where useful.

## Invariants

- Preserve every implementation-required invariant.
- Mark illustrative code/interfaces as illustrative unless normative in Agent SPEC.
- Do not independently choose a different architecture.
- Do not let explanatory Concepts become higher authority.

Validate semantic equivalence with the Agent pair after generation.
