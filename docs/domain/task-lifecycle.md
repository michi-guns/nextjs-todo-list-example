---
status: active
owner: product-and-engineering
---

# Task Lifecycle

- A task belongs to exactly one list and its owning user.
- A task title is required and contains 1–200 characters after trimming.
- Task titles are unique within a list under case-insensitive comparison and may repeat in different lists.
- Notes are trimmed and optional. Empty notes normalize to `null`; non-empty notes contain at most 5,000 characters after trimming.
- Status is `todo`, `in_progress`, or `done`.
- New tasks start as `todo`.
- After creation, tasks may move directly between any valid statuses; applying the current status again succeeds as a no-op.
- Completed tasks remain stored and may be hidden by a query/UI filter.
- Task reads are deterministic and ordered newest-created first. Hiding completed tasks preserves the relative order of remaining tasks.
- Manual task reordering is outside the spike.

Recurring tasks, subtasks, tags, comments, attachments, and cross-list movement are outside the spike.
