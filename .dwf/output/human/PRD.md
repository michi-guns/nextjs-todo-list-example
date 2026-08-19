# Human Product Guide — Next.js Todo List Example

This is a human-oriented projection of the validated [Agent PRD](../agent/PRD.md) and [Agent SPEC](../agent/SPEC.md). It explains the product without changing its contract. Durable rationale lives in [`../../decisions/PRODUCT.md`](../../decisions/PRODUCT.md); unresolved state lives in [`../../decisions/OPEN-QUESTIONS.md`](../../decisions/OPEN-QUESTIONS.md) and [`../../decisions/OPEN-DECISIONS.md`](../../decisions/OPEN-DECISIONS.md).

## What this project is

This repository is an opinionated, production-minded Next.js starter implemented as a complete todo reference application. A derived application should be able to replace mostly the domain and UI while retaining or adapting the cross-cutting foundations. The starter intentionally provides one preferred stack and architecture rather than a framework for interchangeable providers.

It demonstrates a small, real authenticated journey:

```text
anonymous visitor
  → landing page
  → sign up/sign in or magic link
  → personal lists
  → tasks
  → status changes
  → sign out
```

The starter uses modern recommended practices and production-minded safeguards, but it is not a turnkey production SaaS. It favors the simplest robust implementation and accepts extra complexity only when a small investment clearly improves reusable quality or prevents meaningful rework. Vercel is its intended hosting target, although deployment is not required to complete the current starter baseline.

## Product boundary

- Anonymous visitors can see the marketing landing page and authentication entry points.
- Signed-in users manage only their own lists and tasks.
- Requests for another user's private list or task do not reveal whether it exists.
- There is no tenant, organization, or `Workspace` entity. Lists belong directly to the signed-in user.
- Teams, organizations, shared lists, collaboration, OAuth, recurring tasks, attachments, payments, offline mode, and multi-region operations are outside the current todo reference baseline. Derived applications may choose different domain scope.

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

Tasks are shown newest-created first through forward cursor pagination, 20 at a time by default, with a visible way to load more. Hiding completed tasks keeps the remaining tasks in the same relative order and restarts pagination, as does selecting another list. Manual list and task reordering is outside the current todo reference baseline.

Concurrent list and task edits do not show a merge prompt or reject an otherwise valid request merely because another edit completed first. Each update changes only its submitted fields. If two accepted updates change the same field, the last successfully committed value is the one later reads show; changes to different fields may both remain visible. Every request still passes the ordinary ownership, validation, and uniqueness checks.

## Content ownership

PostgreSQL owns authenticated users/session records, lists, tasks, ownership, status, timestamps, and relational integrity. Sanity owns editable landing headline, blurb, and CTA content only. Todo records never live in Sanity.

Publishing the landing document automatically invalidates its public cache through a trusted Sanity webhook. An authorized operator has a manual recovery control that performs the same invalidation. Live draft preview and click-to-edit visual editing are accepted starter capabilities, but they follow the webhook and manual-recovery baseline rather than blocking it.

## Starter-baseline acceptance

The local starter baseline is complete when it supports:

1. email/password registration and sign-in;
2. magic-link request and consumption;
3. sign-out and private-data protection;
4. automatic `Inbox` creation whenever the private workspace has no lists;
5. list CRUD and cascade deletion;
6. task CRUD and status changes;
7. show/hide completed tasks;
8. visible cursor pagination for lists and tasks;
9. Sanity-driven landing content plus a read-only live smoke of the published singleton before baseline completion;
10. Zod-validated server inputs;
11. database-free domain/application/Zod tests;
12. real PostgreSQL 18 integration tests through Testcontainers using the versioned migrations;
13. the core Playwright journey in Chromium, with Firefox and WebKit available as a separate check before public release or after major UI changes;
14. local typecheck, lint, Husky, and lint-staged quality checks;
15. representative Neon seed data and lightweight evidence that the main paginated database queries use their intended indexes and meet the agreed warm-query target.
16. last-successful-write behavior for concurrent list and task edits without bypassing normal safeguards.
17. automatic published-content invalidation through a trusted Sanity webhook plus protected manual recovery.

The exact implementation contract is in the [Agent SPEC](../agent/SPEC.md). It must implement the [Agent PRD](../agent/PRD.md) and may not weaken it.
