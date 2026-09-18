---
name: context-engineering
description: Select and refresh task context for an agent session. Use when starting or switching tasks, recovering from context loss, or diagnosing missing context; route durable instruction changes and context audits to documentation-and-adrs.
---

# Context engineering

Load enough evidence to make the current decision. Prefer the repository's
actual instructions and installed-version documentation over generic examples.

## Start or resume a task

1. Read applicable `AGENTS.md` instructions and the local preferences they
   reference. `CLAUDE.md` imports the same owner; do not create a second ruleset.
2. Identify the current authorized task, its plan, status and dependencies in
   `TODO.md`. On resumption, distinguish completed work from remaining work.
3. Follow [the documentation protocol](../../../docs/documentation-protocol.md)
   to the governing DWF sections and affected `TST-*` contracts. Use the
   [glossary](../../../docs/glossary.md) when a project term is unclear.
4. Inspect the owning code, manifest, scripts and focused tests. An unwired
   example is not evidence of a repository convention. For Next.js changes,
   read the relevant installed guide required by `AGENTS.md`.
5. Carry forward concrete decisions, current Git state, verification results
   with their scope, and any blocker. Avoid copying full transcripts or secrets.

## Keep context focused

Search for the relevant owner, read it in context, then follow only the links
needed for the current slice. Load a large reference progressively. A fixed
line or token quota does not establish whether the necessary evidence is present.

Refresh context when the task changes, evidence contradicts the current model,
or a resumed session lacks a decision. Do not restart completed investigations
or repeat valid checks solely because the context was compacted.

Missing information and contradictory instructions require different responses:
find missing evidence locally where possible; surface a consequential unresolved
contract conflict rather than silently choosing a convenient interpretation.

## Durable guidance and audits

Use [documentation-and-adrs](../documentation-and-adrs/SKILL.md) to maintain
rules files or audit them for repetition, stale claims and conflicting behavior.
That skill owns the documentation specialist and its delegation/review modes.
This skill owns context selection for the current session, not a parallel audit
procedure or another copy of the repository's workflow.
