# Glossary

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
