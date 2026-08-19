---
name: manage-technical-decision
description: Use when proposing, accepting, provisioning, superseding, or recording a technical/architectural decision in the TD-* ledger.
metadata:
  version: "0.1.0-proposal.1.local.2"
  maturity: "proposal"
---

# Manage Technical Decision

## Classification

Use `TD-*` when the mechanism could change while preserving the observable PRD behavior.

A Technical Decision is downstream of Product Decisions and the Agent PRD.

## Record

1. Establish the governing `D-*` / PRD constraints first.
2. Allocate the next unused `TD-*` ID and stable anchor.
3. Use `PROVISIONAL`, `ACCEPTED`, or `SUPERSEDED` only.
4. Link related Product Decisions.
5. Record the accepted mechanism and scope. Add a short reason only for an unusually complex or likely-to-be-questioned tradeoff.
6. Do not require an `OD-*` entry before recording an accepted decision.
7. If this resolves an `OD-*`, remove the open entry. Git keeps routine history.
8. Keep a superseded entry only when current work still needs the old contract.
9. Never use a `TD-*` to weaken or reinterpret a `D-*`.
10. Regenerate Agent SPEC and any affected Human outputs/Concepts.
11. Validate.

## Provisional use

Use `PROVISIONAL` only for an explicitly authorized bounded technical commitment. Record scope clearly and reconcile it before treating the complete architecture as final.
