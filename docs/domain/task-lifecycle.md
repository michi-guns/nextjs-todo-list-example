---
status: active
owner: product-and-engineering
---

# Task Lifecycle

- A task belongs to exactly one list and its owning user.
- A task title is required and contains 1–200 characters after trimming.
- Notes are trimmed and optional. Empty notes normalize to `null`; non-empty notes contain at most 5,000 characters after trimming.
- Status is `todo`, `in_progress`, or `done`.
- New tasks start as `todo`.
- After creation, tasks may move directly between any valid statuses; applying the current status again succeeds as a no-op.
- Completed tasks remain stored and may be hidden by a query/UI filter.

Recurring tasks, subtasks, tags, comments, attachments, and cross-list movement are outside the spike.
