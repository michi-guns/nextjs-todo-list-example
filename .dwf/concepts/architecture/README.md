# Architecture Concept — Capability Boundaries

**Derived explanation.** Normative behavior lives in [`../../output/agent/PRD.md`](../../output/agent/PRD.md) and [`../../output/agent/SPEC.md`](../../output/agent/SPEC.md). Durable rationale and unresolved state live in [`../../decisions/PRODUCT.md`](../../decisions/PRODUCT.md), [`../../decisions/TECHNICAL.md`](../../decisions/TECHNICAL.md), [`../../decisions/EDGE-CASES.md`](../../decisions/EDGE-CASES.md), [`../../decisions/OPEN-QUESTIONS.md`](../../decisions/OPEN-QUESTIONS.md), and [`../../decisions/OPEN-DECISIONS.md`](../../decisions/OPEN-DECISIONS.md). This document exists to reload the mental model quickly; it does not add requirements.

## Quick reload

- One Next.js deployable, organized around `auth`, `landing`, `lists`, and `tasks`.
- PostgreSQL/Drizzle owns auth and todo truth; Sanity owns landing copy only.
- `app/` composes routes; module presentation owns boundary adapters; application owns use cases; domain owns invariants.
- Server entry points authenticate, validate, call a use case, and map the result.
- Delivery consumes this design and creates Roadmap → Milestones → Phases outside `.dwf/`.

## Responsibility map

```text
app routes
  → presentation adapters/actions
    → application use cases
      → domain rules + repository ports
        → Drizzle / Better Auth / Sanity adapters
```

The source tree does not need to mirror every conceptual noun. Add a file or layer only when it has a real responsibility and the implementation contract requires it.

## Authenticated mutation walkthrough

```text
request/form data
  → requireUser()
  → Zod input validation
  → use case(user.id, input)
  → domain + repository boundary
  → view model / JSON envelope
  → revalidate or respond
```

A client-provided `userId` is never the owner of a mutation. The server session is the ownership source.

See [`examples/TD-004-auth-flow.md`](./examples/TD-004-auth-flow.md) for an illustrative snippet.

## Task ownership walkthrough

A task operation receives the authenticated user id and list/task identifiers. The task persistence boundary verifies the list and task belong to that user before returning or mutating data. A foreign resource produces the same `not_found` outcome as a nonexistent resource, so ownership information is not exposed.

See [`examples/TD-006-task-create-flow.md`](./examples/TD-006-task-create-flow.md) for an illustrative snippet.

## Sanity boundary walkthrough

```text
unknown Sanity payload
  → schema validation
  → mapper
  → landing view model
  → marketing route
```

GROQ, Sanity clients, and raw CMS documents stop inside infrastructure.

See [`examples/TD-007-sanity-mapping.md`](./examples/TD-007-sanity-mapping.md) for an illustrative snippet.

## Common traps

- Treating `docs/` explanations or this concept as stronger than the generated Agent PRD/SPEC and decision ledgers.
- Putting Delivery phases or coding tasks in `.dwf/`.
- Making `app/` or generic `components/` a second domain layer.
- Letting Sanity become a todo store.
- Trusting client ownership input or UI-only validation.
