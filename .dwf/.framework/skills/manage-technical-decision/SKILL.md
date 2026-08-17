---
name: manage-technical-decision
description: Use when proposing, accepting, provisioning, superseding, or recording a technical/architectural decision in the TD-* ledger.
metadata:
  version: "0.1.0-proposal.1"
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
5. Preserve supersession history.
6. Never use a `TD-*` to weaken or reinterpret a `D-*`.
7. Regenerate Agent SPEC and any affected Human outputs/Concepts.
8. Validate.

## Provisional use

Use `PROVISIONAL` only for an explicitly authorized bounded technical commitment. Record scope clearly and reconcile it before treating the complete architecture as final.
