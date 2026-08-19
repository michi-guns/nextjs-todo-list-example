---
status: active
owner: product-and-engineering
---

# List Lifecycle

- A signed-in user may have many lists.
- A list has a required, trimmed name containing 1–80 characters.
- A user may only read or mutate their own lists.
- Whenever a private workspace loads with no lists, the user receives exactly one atomic and idempotent `Inbox` list.
- The automatic Inbox may be renamed or deleted like any other list. Deleting the final list leads to a new empty Inbox on the next private workspace load.
- Any existing list prevents automatic Inbox creation.
- Deleting a list permanently deletes its tasks.
- List reads are deterministic and ordered oldest-created first. Manual reordering is outside the spike.

Soft deletion, shared lists, and moving tasks between users are outside the spike.
