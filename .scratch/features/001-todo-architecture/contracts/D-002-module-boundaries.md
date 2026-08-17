# D-002 Contract — Module Boundaries

**Status:** normative  
**Decision:** [D-002](../DECISIONS.md#d-002--four-capability-modules)

## Capability modules

| Module                | Public application boundary                                        | Primary owned concepts                             |
| --------------------- | ------------------------------------------------------------------ | -------------------------------------------------- |
| `src/modules/auth`    | `getCurrentUser()`, `requireUser()` and auth presentation adapters | authenticated user/session boundary                |
| `src/modules/landing` | `getLandingContent()`                                              | landing view model and CMS read path               |
| `src/modules/lists`   | list queries/commands and presentation adapters                    | list identity, naming, CRUD, default Inbox         |
| `src/modules/tasks`   | task queries/commands and presentation adapters                    | task identity, title/notes/status, list membership |

`src/shared/` is not a business module. It may contain a small utility or error primitive only when at least two modules need the same stable concept.

## Layer rules

- `domain/`: plain types, pure rules, domain errors, and contracts. No framework or adapter imports.
- `application/`: use cases, DTOs, and ports. No SQL, GROQ, JSX, HTTP response construction, or raw external records.
- `infrastructure/`: Drizzle, Better Auth, Sanity, mail, and mapping implementations. No UI or route composition.
- `presentation/`: Server Actions, JSON adapters, Zod input schemas, view models, and capability-owned UI. No core business rules.
- `app/`: Next.js route composition only. It may import module presentation/application entry points, but not persistence tables or CMS clients.

## Allowed dependency graph

```text
app → module presentation → module application → module domain
module infrastructure → module application ports + module domain contracts
```

A module may consume another module only through a named application contract. No module may import another module's infrastructure or presentation internals.

## Layer omission rule

A module does not need every layer. Omit `domain/` when the capability has no application-owned business invariant, and omit `presentation/` when it has no user/API surface. Add files only with real responsibility; do not create placeholder abstractions.
