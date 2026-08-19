---
status: active
owner: product-and-engineering
---

# List Lifecycle

- A signed-in user may have many lists.
- A list has a required, trimmed name containing 1–80 characters.
- List names are unique per user under case-insensitive comparison. Lists belong directly to users; there is no `Workspace` entity.
- A user may only read or mutate their own lists.
- Whenever a private workspace loads with no lists, the user receives exactly one atomic and idempotent `Inbox` list.
- The automatic Inbox may be renamed or deleted like any other list. Deleting the final list leads to a new empty Inbox on the next private workspace load.
- Any existing list prevents automatic Inbox creation.
- Deleting a list permanently deletes its tasks.
- List reads are deterministic and ordered oldest-created first. Manual reordering is outside the spike.
- List reads use forward cursor pagination and return items plus an opaque next cursor.
- List pages default to 20 records, accept at most 100, and do not return total counts or numbered-page metadata.

Soft deletion, shared lists, and moving tasks between users are outside the spike.
