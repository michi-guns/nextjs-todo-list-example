---
name: testing-first-class
description: Track and implement the repository's durable TST-* test contracts during behavior changes. Use before implementation, while writing tests, and when reconciling evidence; not for unrelated prose-only edits.
---

# Testing First-Class

## Purpose

This repository treats testing as a design concern, not a final cleanup step. The canonical model, identifiers, statuses, and current test obligations live in [`.dwf/decisions/TESTING.md`](../../../.dwf/decisions/TESTING.md).

This skill answers **which behavior must be proven and what evidence is still missing**. The existing `test-driven-development` skill answers **how to write and evolve executable tests**.

The ledger uses `TSD-*` for accepted testing policy decisions and `TST-*` for stable behavior/risk contracts. A `TST-*` ID may correspond to several executable tests at different evidence layers.

## Before implementation

1. Read the relevant Product Decisions, Technical Decisions, Agent PRD/SPEC sections, and `TST-*` contracts.
2. Identify every contract affected by the task. Check its required evidence, dependencies, current status, and owning delivery task.
3. Add the affected `TST-*` IDs to the task plan or `TODO.md` entry. If the task introduces important behavior without a contract, create or update the contract before coding.
4. Decide which evidence is possible in this slice. A future integration or end-to-end dependency is not permission to forget the contract or to claim a weaker test proves it.

## During implementation

- Use `test-driven-development` for executable behavior: write a focused failing test when the required dependency is available, implement the smallest behavior, and verify it.
- Prefer behavior and outcomes over implementation-detail assertions.
- Use real boundaries for the evidence they are meant to prove. Use fakes or unit tests for framework-independent rules, not as silent substitutes for required database, browser, CMS, or hosted evidence.
- If the required dependency is unavailable, keep the contract visible and record the exact blocker, unblock condition, and follow-up task. Do not silently skip, disable, or downgrade the obligation.
- Keep `TST-*` IDs stable when test files, functions, frameworks, or source locations change.

## Status reconciliation

Use only the statuses defined by the ledger:

- `specified`: designed, with no verified evidence recorded yet;
- `in_progress`: evidence implementation or verification is active;
- `partial`: some required evidence is verified, but the contract is incomplete;
- `verified`: all required baseline evidence has passed and is recorded;
- `blocked`: a named prerequisite prevents the next required evidence;
- `deferred`: intentionally outside the current baseline or slice, with a reason and future scope;
- `retired`: the owning behavior or decision was superseded.

Normal task dependencies are not automatically blockers. Use `specified` for expected future work. Use `blocked` only when the current work has reached an unavailable prerequisite.

## Completion gate

Before declaring the task complete:

1. Reconcile every affected `TST-*` contract.
2. Record the exact commands and results for verified evidence.
3. Record the blocker and linked follow-up for partial, blocked, or deferred evidence.
4. Ensure no passing lower-level test is presented as proof of an unimplemented higher-level contract.
5. Include the contract IDs and evidence summary in the PR description.

Do not create a coverage-percentage gate. The obligation is suitable, honest evidence for the behavior and risk described by each contract.
