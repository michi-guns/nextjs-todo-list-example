# Human Product Guide — Next.js Todo List Example

This is a human-oriented projection of the validated [Agent PRD](../agent/PRD.md) and [Agent SPEC](../agent/SPEC.md). It explains the product without changing its contract. Durable rationale lives in [`../../decisions/PRODUCT.md`](../../decisions/PRODUCT.md); unresolved state lives in [`../../decisions/OPEN-QUESTIONS.md`](../../decisions/OPEN-QUESTIONS.md) and [`../../decisions/OPEN-DECISIONS.md`](../../decisions/OPEN-DECISIONS.md).

## What this project demonstrates

A small, real authenticated todo journey on a modern Next.js stack:

```text
anonymous visitor
  → landing page
  → sign up/sign in or magic link
  → personal lists
  → tasks
  → status changes
  → sign out
```

The example is intentionally serious about ownership, data boundaries, validation, tests, and local quality without becoming a production SaaS.

## Product boundary

- Anonymous visitors can see the marketing landing page and authentication entry points.
- Signed-in users manage only their own lists and tasks.
- There is one implicit personal workspace per user.
- Teams, organizations, shared lists, collaboration, OAuth, recurring tasks, attachments, payments, offline mode, and multi-region operations are outside the spike.

## Lists and tasks

A user can own many lists. If the user has no lists on first authenticated use, the product creates an `Inbox` list. Lists can be created, renamed, and deleted; deleting a list removes its tasks.

Each task belongs to exactly one list and has:

- a required title;
- optional notes;
- a status of `todo`, `in_progress`, or `done`;
- timestamps.

Tasks can be created, edited, deleted, and moved between statuses. Completed tasks stay stored and are shown by default, while the interface can explicitly hide or show them.

## Content ownership

PostgreSQL owns authenticated users/session records, lists, tasks, ownership, status, timestamps, and relational integrity. Sanity owns editable landing headline, blurb, and CTA content only. Todo records never live in Sanity.

## Spike acceptance

The local spike is complete when it supports:

1. email/password registration and sign-in;
2. magic-link request and consumption;
3. sign-out and private-data protection;
4. automatic `Inbox` creation;
5. list CRUD and cascade deletion;
6. task CRUD and status changes;
7. show/hide completed tasks;
8. Sanity-driven landing content;
9. Zod-validated server inputs;
10. domain/application/Zod tests and the core Playwright journey;
11. local typecheck, lint, Husky, and lint-staged quality checks.

The exact implementation contract is in the [Agent SPEC](../agent/SPEC.md). It must implement the [Agent PRD](../agent/PRD.md) and may not weaken it.
