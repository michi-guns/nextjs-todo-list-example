---
name: documentation-and-adrs
description: Maintain this repository's product, domain, architecture and operational documentation, and audit affected agent instructions for conflicts, duplication and stale context. Use after documentation-impacting changes or instruction updates, or for a requested documentation review.
---

# Documentation stewardship

Keep project documentation accurate and agent instructions small enough to use.
This skill is the shared instruction source for the documentation specialist
in Codex, Claude Code, or another harness. It has two responsibilities:

- Maintain product/domain explanations, architecture, decisions, ADRs, API and
  operational guides after accepted changes.
- Audit affected AI context for contradictory, repeated, stale, misplaced or
  needlessly broad instructions.

## Invocation and delegation

Use this skill when a task changes documented behavior, architecture, operations,
or agent instructions. A trivial wording correction can stay with the parent
agent. For a substantial documentation pass, the parent spawns one specialist
sub-agent with this file as its instructions. Do not run a repository-wide audit
on every task; start with the affected documents and their direct references.

The delegation brief supplies:

- repository root and mode: **maintain**, **audit**, or **review**;
- the owner's accepted intent, including the triggering example if useful;
- changed files or an exact diff/commit, relevant evidence and permitted edits;
- earlier findings and dispositions when this is a revision.

A delegated specialist does not spawn more agents, commit, merge, push, install
packages, change application code/tests/configuration, or perform hosted actions.
The parent owns Git, integration, required checks and the independent review
loop in [AGENTS.md](../../../AGENTS.md). A reviewer must be a fresh instance,
not the specialist approving its own edits. Do not create native agent profiles
that duplicate these instructions; a harness adapter, if needed, points here.

## Authority and scope

Read [the documentation protocol](../../../docs/documentation-protocol.md)
and the relevant entries in [the documentation index](../../../docs/index.md).
Follow their authority map rather than copying it into new files. Read governing
DWF decisions and PRD/SPEC sections only for the affected subject. Use
[the glossary](../../../docs/glossary.md) for project-specific terms.

The source code, scripts and manifests establish what currently exists; accepted
contracts establish what should exist. A disagreement is a finding, not permission
to rewrite the contract to match a defect. Incorporate an already authorized
product/technical decision in its owning ledger and projections; otherwise
surface the unresolved decision for the parent. Do not invent requirements.

Preserve accepted ADR history, dates and the scope of old verification evidence.
A changed decision follows the existing supersession convention. Current-state
corrections must not turn historical checks into fresh verification. Keep new
run evidence in the existing task/evidence system, not in timeless instructions.
The supplied `.dwf/.framework/` machinery is read-only.

## Maintain

1. Identify the document that owns the concept. Search for other statements,
   callers and links, then read the relevant sections in context. Consult code
   only as needed to verify claims, identifiers, commands and boundaries.
2. Integrate the accepted change into that owner. Amend or consolidate existing
   guidance rather than append a competing rule. Add a file only for a distinct
   responsibility that lacks an owner, and make it discoverable from its caller.
3. Update affected explanations and references. Match the surrounding language,
   structure and conventions. Keep repository artifacts in English and operator
   preferences in their existing local files.
4. Apply the focused context audit below where agent guidance was affected.
   Fix supported in-scope documentation issues within the delegated edit scope;
   report unrelated observations without expanding the task.

Documentation edits may include the relevant `docs/`, `.dwf/` project state,
root instructions and project-owned skills. They do not authorize file deletion,
renaming or destructive cleanup; use the parent's existing safety checkpoint.
Do not copy source-project policies, customer-specific exceptions or credentials
from reference material into this repository.

## Audit and review

Both modes are read-only. **Audit** checks a requested subject or affected
context; **review** checks an exact proposed change against the accepted intent.
For review, understand the intent before reading the diff. Check that the rule
covers the triggering case without creating obligations for unrelated cases.

Check the owner and directly connected instructions for:

- contradictions in authority, permissions, triggers or required behavior;
- duplicated rules that should become one owner plus links;
- outdated paths, commands, versions or claims about implemented behavior;
- instructions placed in examples, historical evidence or the wrong document;
- unnecessary always-loaded guidance, circular routing, redundant delegation,
  or process whose cost has no concrete benefit for this task;
- imported assumptions and generic examples that could mislead this repo's
  agents, including examples that conflict with its accepted stack.

Keep `CLAUDE.md` and harness bridges as pointers to canonical instructions.
Distinguish a useful scoped reminder from a second rule owner. Do not shorten
text by removing a necessary invariant, replacing a clear rule with a vague
slogan, or moving the same repetition to another file. Do not remove AgentForge.
Recommendations about framework overhead need a concrete conflict or redundant
step and its effect on an agent, not a claim that fewer words are always better.

## Verification and report

Reread edited sections with their owners and callers. Check local links/anchors,
command shapes against scripts, changed-file formatting and `git diff --check`.
Use [quality gates](../../../docs/development/quality-gates.md) proportionately.
A prose-only change needs no invented product test contract or application test;
normal commit hooks still apply. Never claim executable or hosted verification
that was not run.

Report briefly: the principle integrated or audited, changed files and why,
checks and limits, and remaining findings. Each actionable finding needs a
file:line anchor, its practical consequence, and the smallest fix. Separate
**actionable**, **contract conflict/decision needed**, and **optional** findings.
Style preferences alone do not block completion. In review mode, end with
`APPROVED` when no actionable issue or unresolved contract conflict remains,
or `FINDINGS` otherwise, and identify the artifact reviewed.
