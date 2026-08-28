---
name: planning
description: Create a repository-grounded implementation plan before task breakdown or code. Use for multi-file features, architectural changes, or work with unclear implementation order.
---

# Planning

## Purpose

Planning answers: "What approach should we take?" It records the intended architecture, boundaries, dependencies, risks, and verification strategy. It does not turn the approach into delivery tasks and it does not implement code.

After the plan is accepted, use `task-breakdown` to create the ordered task list in `TODO.md`.

## Read first

Read only the context needed for the requested slice, starting with:

- [`docs/index.md`](../../../docs/index.md), [`docs/documentation-protocol.md`](../../../docs/documentation-protocol.md), and the [project glossary](../../../docs/glossary.md);
- [`.dwf/README.md`](../../../.dwf/README.md), [`.dwf/RULES.md`](../../../.dwf/RULES.md), and [`.dwf/CONTEXT.md`](../../../.dwf/CONTEXT.md);
- the relevant Agent PRD, Agent SPEC, decision ledgers, architecture/data/domain documents, and open-state records; and
- the current source, tests, scripts, package manifest, and framework documentation for the affected area.

Read the testing ledger and identify affected `TST-*` contracts. The plan records test obligations and available evidence; `testing-first-class` and `test-driven-development` govern their implementation.

## Planning workflow

1. Enter read-only planning mode for source code, task tracking, and design ledgers. State the scope and assumptions before filling gaps.
2. Map the current system. List the files or modules that own each responsibility, the boundaries between them, and the existing interfaces that must remain stable.
3. Map dependencies and prerequisites. Mark work as sequential or parallel only when the repository evidence supports that choice. Surface unavailable infrastructure and unresolved decisions.
4. Define coarse work packages. Group related responsibilities into coherent, testable outcomes, and leave task-level slicing, sizing, and delivery order to `task-breakdown`.
5. Define the verification strategy. Link affected `TST-*` contracts, evidence layers, focused commands, runtime checks, and known future or blocked evidence.
6. Write the plan to `docs/agentforge/plans/YYYY-MM-DD-<feature-name>.md`.
7. Self-review the plan before handoff. Check specification coverage, file responsibility, dependency order, interface consistency, risk treatment, test traceability, and placeholder-free instructions.

Do not silently resolve a contradiction in the DWF or invent a product or technical decision. Record the conflict as an open question and stop if it changes the implementation direction.

## Plan structure

Every plan should contain these sections, adapted to the slice:

```markdown
# <Feature> implementation plan

> AgentForge plan. Use `task-breakdown` after this plan is accepted.

**Status:** Proposed | Accepted | Completed | Superseded

**Goal:** <one sentence describing the observable outcome>

**Spec and decisions:** <links to the governing PRD, SPEC, and decisions>

**Architecture:** <the approach and why it fits the existing boundaries>

**Global constraints:** <version floors, dependency limits, data ownership, and other fixed rules>

## Current state and file map

<What exists, which files own it, and what each planned change is responsible for>

## Dependencies and work order

<Sequential and parallel work, prerequisites, and unblock conditions>

## Verification strategy

<Affected TST-* contracts, evidence layers, commands, runtime checks, and deferred evidence>

## Risks and assumptions

<Concrete risks, assumptions, mitigations, and open questions>

## Handoff to task breakdown

<The work packages and boundaries that task-breakdown should turn into TODO.md tasks>
```

The completed plan must replace every placeholder with project-specific content. Use links instead of copying authoritative requirements into the plan.

## Boundaries

- Do not edit application source, tests, dependencies, or `TODO.md` while planning.
- Do not create a second product or technical authority. Link to `.dwf/` decisions instead.
- Do not write implementation tasks before the plan's approach is accepted or explicitly authorized by the human.
- Do not prescribe an external framework or Superpowers skill. Use AgentForge skills and repository rules only.

## Verification

Before handing the plan to `task-breakdown`, confirm:

- every relevant specification area maps to a work package or an explicit scope exclusion;
- each planned file has one clear responsibility;
- dependencies, parallelization, risks, and prerequisites are concrete;
- affected `TST-*` contracts and evidence limits are named;
- no placeholder or vague instruction remains; and
- the plan is saved under `docs/agentforge/plans/` and is suitable for a fresh implementer.
