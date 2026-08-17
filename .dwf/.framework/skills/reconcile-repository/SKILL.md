---
name: reconcile-repository
description: Use when comparing settled DWF design against real repositories to verify feasibility and minimize code-shape pressure before delivery planning.
metadata:
  version: "0.1.0-proposal.1"
  maturity: "proposal"
---

# Reconcile Repository

## Goal

Verify that accepted design can fit the real codebase without forcing unnecessary structural change.

## Procedure

1. Establish a clean/read-only repository baseline where possible.
2. Read the DWF Agent PRD/SPEC, relevant `D-*`, `TD-*`, `EC-*`, and rules.
3. Inspect actual architectural ownership, write paths, persistence, identity, transactions, auth, lifecycle, and other relevant extension points.
4. Classify material findings:
   - `ALIGNED`
   - `MINIMAL_EXTENSION`
   - `DESIGN_SHAPE_PRESSURE`
   - `VERIFIED_CONFLICT`
   - `EVIDENCE_GAP`
5. Prefer existing extension points and established conventions.
6. Do not require code nouns/classes/tables to mirror conceptual design nouns.
7. Do not change product truth merely because the current implementation differs.
8. Surface verified conflicts for design review; surface missing evidence honestly.

## Output

Produce an evidence-backed feasibility report suitable for Delivery planning. Keep repository observations distinct from accepted design authority.
