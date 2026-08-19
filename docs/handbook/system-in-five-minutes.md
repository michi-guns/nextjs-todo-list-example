# System in Five Minutes

This repository is a public, opinionated Next.js starter implemented as a complete authenticated todo reference application. It combines a modern stack, a domain-centered modular monolith, reusable cross-cutting foundations, and an AI-friendly documentation system. Derived applications should mainly replace domain and UI code rather than rebuild those foundations.

The starter is production-minded without becoming a universal framework or turnkey SaaS. It uses the simplest robust approach and spends extra complexity only where the reusable payoff is clear.

## Responsibilities

```text
Domain:          what a list or task means and what is valid
Application:     what an authenticated user may do
Infrastructure:  how PostgreSQL, Drizzle, Sanity, and auth are used
Presentation:    how routes, actions, APIs, and UI interact with the system
```

## Main technologies

See the supporting [technology stack](../architecture/stack.md) and the canonical technical contract in [`../../.dwf/output/agent/SPEC.md`](../../.dwf/output/agent/SPEC.md).

## Most important rule

> PostgreSQL owns user, list, and task truth. Sanity owns editable landing content. Todos never live in Sanity.

## Initial workflow

```text
Anonymous visitor → landing page → sign up/sign in
Signed-in user → lists → tasks → status changes → sign out
```
