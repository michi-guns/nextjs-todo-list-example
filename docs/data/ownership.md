---
status: active
owner: engineering
related-adrs:
  - ADR-0002
  - ADR-0003
---

## Data ownership

The canonical product and technical ownership rules are in [`.dwf/PRD.md`](../../.dwf/PRD.md) and [`.dwf/SPEC.md`](../../.dwf/SPEC.md). This supporting note summarizes the boundary for orientation.

## Sanity owns

- Landing-page headline, blurb, and CTA copy
- Editorial publishing workflow for that content

## PostgreSQL owns

- Better Auth users, sessions, accounts, and verification records
- Lists and tasks
- Ownership, status, timestamps, and relational integrity

## Rule

Sanity content must never become the source of truth for lists or tasks. CMS payloads are validated and mapped at the infrastructure boundary.
