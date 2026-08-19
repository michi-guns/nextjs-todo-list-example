# Glossary

## Starter

The opinionated, reusable Next.js foundation that is the repository's primary product.

## Todo reference application

The complete personal-todo implementation used to demonstrate and verify the starter's foundations.

## Starter baseline

The currently accepted local behavior, integration, verification, and quality contract required before the starter reference is considered complete.

## Derived application

A future application created from the starter, expected to replace mostly domain and UI code while retaining or adapting cross-cutting foundations.

## User

An authenticated person represented by Better Auth.

## List

A user-owned collection of tasks. A user receives an `Inbox` list when signing in with no existing lists.

## Task

A user-owned item belonging to exactly one list.

## Task status

One of `todo`, `in_progress`, or `done`.

## Domain rule

A business invariant that must hold regardless of UI or persistence.

## Application use case

A named operation the system permits, such as `createTask` or `deleteList`.

## Adapter

Infrastructure code that translates an external system into an application-facing interface.

## Transactional truth

Data whose correctness is owned by PostgreSQL rather than editorial content systems.
