---
name: task-breakdown
description: Turn an accepted AgentForge implementation plan into ordered, independently verifiable tasks in TODO.md. Use after planning and before implementation.
---

# Task breakdown

## Purpose

Task breakdown answers: "What should be done first, and how will we know each step is complete?" It converts an accepted plan into delivery tasks. It does not choose a new architecture, write application code, or execute the tasks.

The project uses [`TODO.md`](../../../TODO.md) as its delivery tracker and [`docs/agentforge/plans/`](../../../docs/agentforge/plans/) for durable implementation plans.

## Inputs

Before editing the task list, read:

- the accepted AgentForge plan in `docs/agentforge/plans/`;
- the relevant Agent PRD, Agent SPEC, DWF decisions, and supporting documents;
- affected `TST-*` contracts in [`.dwf/decisions/TESTING.md`](../../../.dwf/decisions/TESTING.md); and
- the current `TODO.md`, repository scripts, tests, and task conventions.

If the plan is missing, unresolved, or inconsistent with the DWF, stop and surface the issue. Return to `planning` rather than guessing.

## Breakdown workflow

1. Confirm the plan's scope, assumptions, constraints, and acceptance direction.
2. Build the dependency graph. Put foundations and high-risk prerequisites before consumers. Mark genuinely independent work as parallel only when shared interfaces are already defined.
3. Slice each work package into vertical delivery tasks. Prefer a small complete user or system outcome over separate database, API, and UI layers that cannot be verified on their own.
4. Define each task as a fresh-review unit. A task should fit one focused session, touch a coherent set of files, and leave the repository in a verifiable state.
5. Add tasks to `TODO.md` in dependency order. Preserve the repository's task IDs, status markers, testing-contract references, and recommended AgentForge skills.
6. Add checkpoints after meaningful groups of work. Each checkpoint has concrete tests, builds, runtime checks, or review conditions.
7. Self-review the task list against the accepted plan and DWF before handing it to implementation.

## Task contract

Every implementation task should identify:

- a stable task ID and a short outcome-focused title;
- the files to create, modify, test, or intentionally leave untouched;
- interfaces it consumes and produces, including names and types when known;
- explicit, observable acceptance criteria;
- affected `TST-*` contracts and the evidence expected in this slice;
- exact verification commands or manual/runtime checks and their expected results;
- dependencies, prerequisites, unblock conditions, and estimated scope; and
- a **Recommended AgentForge skills** subsection naming the skills needed for the task.

Make each step one action with enough detail for an implementer who has not read the conversation. Use exact paths, commands, selectors, function names, or data shapes when they are known. Do not write placeholders such as "implement later," "add appropriate validation," or "write tests for the above."

For behavior-changing code, the task should hand implementation to the normal AgentForge sequence: `testing-first-class`, the relevant implementation skills, and `test-driven-development`. The task breakdown records that sequence; it does not replace those skills.

## Verification and evidence

Task verification must distinguish:

- a check that can run in the current slice;
- a check that is required but blocked by an unavailable prerequisite; and
- a future obligation that is specified but intentionally deferred.

Do not replace an integration, infrastructure, browser, or end-to-end obligation with a weaker unit check without recording the limitation against its `TST-*` contract.

Before implementation starts, confirm:

- the task order satisfies the dependency graph;
- every task has acceptance criteria, verification, and affected test contracts;
- interfaces and file ownership are consistent across neighboring tasks;
- no task is too large for one focused session;
- checkpoints cover the important risk transitions; and
- `TODO.md` is the only delivery task-list target for this repository.

## Boundaries

- Do not edit application source, tests, dependencies, or design decisions during task breakdown.
- Do not create `tasks/plan.md` or `tasks/todo.md` for this repository.
- Do not invoke or require user-scoped Superpowers skills, plans, or conventions.
- Do not start implementation until the plan and task list are available and the task's prerequisites are understood.
