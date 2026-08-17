---
name: manage-edge-case
description: Use when recording or updating a durable explicitly considered scenario in the EC-* edge-case ledger.
metadata:
  version: "0.1.0-proposal.1"
  maturity: "proposal"
---

# Manage Edge Case

## Principle

An `EC-*` records a scenario the design has explicitly considered. It does not independently own behavior.

## Procedure

1. Determine whether the scenario is durable/high-value enough to catalog.
2. Allocate the next unused `EC-*` ID and stable anchor.
3. Link the relevant `D-*`, `TD-*`, `RULE-*`, PRD/SPEC sections, or other owners.
4. Mark `HANDLED` only when the owning contract actually determines the outcome.
5. Use `OPEN` when the scenario exposes unresolved truth/choice; create/link `OQ-*` or `OD-*` instead of guessing.
6. Keep the scenario concise and concrete.
7. Validate links and regenerate outputs only when the underlying contract changed.

## Do not

- store Edge Cases under `output/`;
- use `EC-*` to override product/technical authority;
- duplicate exhaustive requirements prose into the catalog.
