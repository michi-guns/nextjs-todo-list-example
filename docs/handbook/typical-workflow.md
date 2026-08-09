# Typical Workflow

1. An anonymous visitor reads Sanity-backed landing content.
2. The visitor signs up or signs in through Better Auth.
3. The application ensures the user has an `Inbox` list.
4. The user creates or selects a list.
5. The user creates, edits, completes, or deletes tasks.
6. Server Actions and JSON Route Handlers pass through the same authorization, validation, and application paths.

## Important distinctions

- UI validation improves experience; server validation protects the system.
- A Server Component reads from the application/data layer directly.
- A Route Handler is an external boundary, not an internal data-fetching shortcut.
- Sanity content can change without changing task or list data.
