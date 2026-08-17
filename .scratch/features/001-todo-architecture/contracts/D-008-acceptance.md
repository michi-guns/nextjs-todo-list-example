# D-008 Contract — Testing and Acceptance

**Status:** normative  
**Decision:** [D-008](../DECISIONS.md#d-008--layered-contract-verification)

## Required test layers

### Domain

Colocate tests with domain rules:

- list name trimming and rejection of empty names
- task title/notes normalization
- accepted task statuses only
- new tasks default to `todo`
- completed tasks remain valid stored tasks

Suggested files:

```text
src/modules/lists/domain/list.test.ts
src/modules/tasks/domain/task.test.ts
```

### Application

Use in-memory fakes for repository ports:

- default Inbox is created once and remains idempotent
- list CRUD enforces the supplied user id
- deleting a list invokes the repository delete boundary
- task creation rejects an absent/foreign list
- task updates enforce task ownership
- `includeCompleted: false` filters only `done` tasks

Suggested files:

```text
src/modules/lists/application/use-cases.test.ts
src/modules/tasks/application/use-cases.test.ts
```

### Boundary

Test Zod and auth/presentation behavior:

- malformed names/titles/statuses reject with `422` or action errors
- anonymous requests reject with `401`
- foreign resources map to `404`
- client-supplied owner ids are ignored/not accepted
- JSON envelope remains `{ error: { code, message } }`

Suggested files:

```text
src/modules/auth/application/session.test.ts
src/modules/lists/presentation/schemas.test.ts
src/modules/tasks/presentation/schemas.test.ts
src/modules/lists/presentation/handlers.test.ts
src/modules/tasks/presentation/handlers.test.ts
```

### Infrastructure

Test non-trivial translation logic without requiring every adapter query to have a unit matrix:

```text
src/modules/landing/infrastructure/map-sanity-document.test.ts
src/modules/lists/infrastructure/drizzle-list-repository.test.ts  # when mapping is non-trivial
src/modules/tasks/infrastructure/drizzle-task-repository.test.ts  # when mapping is non-trivial
```

### End to end

Replace the scaffold example with:

```text
e2e/todo-journey.spec.ts
```

Minimum journey:

1. sign up or use a deterministic seeded user
2. sign in
3. observe/create default Inbox
4. create a list
5. create a task
6. change task status
7. sign out
8. verify private data is no longer accessible

Magic-link coverage may use a local test mailer or deterministic test hook; it must not require a real external inbox for local completion.

## Acceptance commands

The implementation should pass the repository scripts:

```text
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
```

A browser smoke run must exercise the actual local application path, not a third-party documentation site.

## Contract-to-check rule

Every normative contract must have at least one deterministic unit, boundary, adapter, or end-to-end check. If a rule is only verified by manual smoke behavior, record the scenario and expected observation next to the implementation.
