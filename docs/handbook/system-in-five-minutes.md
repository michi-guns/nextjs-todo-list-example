# System in Five Minutes

This repository is a public teaching example: a small authenticated todo application built to demonstrate a modern Next.js stack, a domain-centered modular monolith, and an AI-friendly documentation system.

## Responsibilities

```text
Domain:          what a list or task means and what is valid
Application:     what an authenticated user may do
Infrastructure:  how PostgreSQL, Drizzle, Sanity, and auth are used
Presentation:    how routes, actions, APIs, and UI interact with the system
```

## Main technologies

See the [technology stack](../architecture/stack.md) for the canonical inventory and each technology’s role.

## Most important rule

> PostgreSQL owns user, list, and task truth. Sanity owns editable landing content. Todos never live in Sanity.

## Initial workflow

```text
Anonymous visitor → landing page → sign up/sign in
Signed-in user → lists → tasks → status changes → sign out
```
