---
name: manage-product-decision
description: Use when proposing, accepting, superseding, or recording an observable product/design decision in the D-* ledger.
metadata:
  version: "0.1.0-proposal.1.local.2"
  maturity: "proposal"
---

# Manage Product Decision

## Classification

Use `D-*` when changing the choice would change observable product behavior or semantics.

If the mechanism can change without changing the product contract, use `TD-*` instead.

## Acceptance

Do not convert discussion into an accepted `D-*` without appropriate human/project decision authority. When the user explicitly accepts the choice, persist it if write authority exists.

## Record

1. Allocate the next unused `D-*` ID.
2. Add a stable anchor.
3. Use machine-simple status `ACCEPTED` or `SUPERSEDED`.
4. Record the accepted result and scope. Add a short reason only for an unusually complex or likely-to-be-questioned tradeoff.
5. Do not require an `OD-*` entry before recording an accepted decision.
6. If this resolves an `OD-*`, remove the open entry. Git keeps routine history.
7. Keep a superseded entry only when current work still needs the old contract.
8. Update affected `EC-*` links and open items.
9. Regenerate Agent PRD, then Agent SPEC if technically affected, then Human outputs.
10. Validate.

## Invariant

No `TD-*`, Concept, SPEC implementation detail, or repository fact may silently override an accepted `D-*`.
