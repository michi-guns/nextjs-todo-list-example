---
status: active
owner: engineering
related-adrs:
  - ADR-0001
---

# Dependency Rules

```text
Presentation → Application → Domain
Infrastructure → Application and Domain contracts
app routes → module presentation/application APIs
```

The domain must not import Next.js, React, Drizzle, Sanity, HTTP types, or browser APIs. Application code must not execute SQL/GROQ, render JSX, or expose persistence/CMS types. Presentation code must not contain core business rules or import database tables directly. Infrastructure types must not leak into domain APIs.

`shared/` stays small and must not become a second domain layer.
