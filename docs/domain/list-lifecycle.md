---
status: active
owner: product-and-engineering
---

# List Lifecycle

- A signed-in user may have many lists.
- A list has a required, trimmed name containing 1–80 characters.
- A user may only read or mutate their own lists.
- A user with no lists receives one idempotent `Inbox` list.
- Deleting a list permanently deletes its tasks.
- List reads are deterministic and ordered oldest-created first. Manual reordering is outside the spike.

Soft deletion, shared lists, and moving tasks between users are outside the spike.
