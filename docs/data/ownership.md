---
status: active
owner: engineering
related-decisions:
  - TD-005
  - TD-023
---

## Data ownership

The canonical product and technical ownership rules are in [`../../.dwf/output/agent/PRD.md`](../../.dwf/output/agent/PRD.md) and [`../../.dwf/output/agent/SPEC.md`](../../.dwf/output/agent/SPEC.md). This supporting note summarizes the boundary for orientation.

## Sanity owns

- Landing-page headline, blurb, and CTA copy
- Editorial publishing workflow for that content

## PostgreSQL owns

- Better Auth users, sessions, accounts, and verification records
- Lists and tasks
- Ownership, status, timestamps, and relational integrity

## Rule

Sanity content must never become the source of truth for lists or tasks. CMS payloads are validated and mapped at the infrastructure boundary.
