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

The example is intentionally serious about ownership, data boundaries, validation, tests, and local quality without becoming a production SaaS. Vercel is its intended hosting target, although deployment is not required to complete the local spike.

## Product boundary

- Anonymous visitors can see the marketing landing page and authentication entry points.
- Signed-in users manage only their own lists and tasks.
- Requests for another user's private list or task do not reveal whether it exists.
- There is no tenant, organization, or `Workspace` entity. Lists belong directly to the signed-in user.
- Teams, organizations, shared lists, collaboration, OAuth, recurring tasks, attachments, payments, offline mode, and multi-region operations are outside the spike.

## Lists and tasks

A user can own many lists. List names are trimmed, contain 1–80 characters, and are unique for that user under case-insensitive comparison. Whenever the private workspace loads with no lists, the product creates exactly one `Inbox`. The automatic Inbox is an ordinary list after creation and may be renamed or deleted. If the final list is deleted, the next private workspace load creates a new empty Inbox. Any existing list prevents automatic Inbox creation. Deleting a list removes its tasks. Lists are shown oldest-created first through forward cursor pagination, 20 at a time by default, with a visible way to load more.

Each task belongs to exactly one list and has:

- a required title containing 1–200 characters after trimming, unique within that list under case-insensitive comparison;
- optional trimmed notes containing at most 5,000 characters, with empty notes treated as absent;
- a status of `todo`, `in_progress`, or `done`;
- timestamps.

Tasks can be created, edited, deleted, and moved between statuses. Completed tasks stay stored and are shown by default, while the interface can explicitly hide or show them.

The same task title may be used in different lists, but not twice within one list.

New tasks begin as `todo`. After creation, a task can move directly between any two valid statuses; applying its current status again simply leaves it unchanged.

Tasks are shown newest-created first through forward cursor pagination, 20 at a time by default, with a visible way to load more. Hiding completed tasks keeps the remaining tasks in the same relative order and restarts pagination, as does selecting another list. Manual list and task reordering is outside the spike.

## Content ownership

PostgreSQL owns authenticated users/session records, lists, tasks, ownership, status, timestamps, and relational integrity. Sanity owns editable landing headline, blurb, and CTA content only. Todo records never live in Sanity.

## Spike acceptance

The local spike is complete when it supports:

1. email/password registration and sign-in;
2. magic-link request and consumption;
3. sign-out and private-data protection;
4. automatic `Inbox` creation whenever the private workspace has no lists;
5. list CRUD and cascade deletion;
6. task CRUD and status changes;
7. show/hide completed tasks;
8. visible cursor pagination for lists and tasks;
9. Sanity-driven landing content;
10. Zod-validated server inputs;
11. database-free domain/application/Zod tests;
12. real PostgreSQL 18 integration tests through Testcontainers using the versioned migrations;
13. the core Playwright journey;
14. local typecheck, lint, Husky, and lint-staged quality checks;
15. representative Neon seed data and lightweight evidence that the main paginated database queries use their intended indexes and meet the agreed warm-query target.

The exact implementation contract is in the [Agent SPEC](../agent/SPEC.md). It must implement the [Agent PRD](../agent/PRD.md) and may not weaken it.
