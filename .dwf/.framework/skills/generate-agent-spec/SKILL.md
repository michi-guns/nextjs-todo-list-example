---
name: generate-agent-spec
description: Use when creating or refreshing output/agent/SPEC.md from the validated Agent PRD and durable technical state.
metadata:
  version: "0.1.0-proposal.1"
  maturity: "proposal"
---

# Generate Agent SPEC

## Goal

Produce the exact technical contract needed by an implementation Agent while preserving implementation freedom below the accepted black-box boundaries.

## Authoritative inputs

1. `RULES.md`;
2. `CONTEXT.md`;
3. accepted `D-*`;
4. `output/agent/PRD.md`;
5. accepted or explicitly scoped provisional `TD-*`;
6. relevant `EC-*`;
7. open items that affect technical completeness.

Concepts may improve explanation but may not supply the only copy of a required invariant.

## Generation rules

- SPEC is subordinate to PRD.
- Make required invariants, state transitions, data contracts, responsibility boundaries, failure/retry/recovery semantics, security/authorization boundaries, and verification-relevant behavior explicit when needed.
- Distinguish normative contracts from illustrative examples/signatures.
- Prefer existing project architecture/extension points when repository evidence is known, but do not silently alter the product contract to fit code.
- Do not create file-by-file implementation tasks or coding-agent decomposition inside the SPEC unless the project explicitly treats such shape as a normative contract.
- Preserve traceability to `D-*`, `TD-*`, `EC-*`, and rules.

## Validation

Reject/regenerate when:

- SPEC weakens or contradicts PRD;
- a `TD-*` conflicts with `D-*`;
- required behavior exists only in a Concept;
- unresolved blocking items are presented as settled;
- technical detail imposes unnecessary repository shape without a real contract reason.

After a valid Agent pair exists, Human projections may be derived.
