---
name: initialize-workspace
description: Use when creating a fresh project-local .dwf Workspace from an installed DWF Framework distribution.
metadata:
  version: "0.1.0-proposal.1"
  maturity: "proposal"
---

# Initialize Workspace

## Preconditions

- `.dwf/.framework/` is already supplied by a known DWF distribution, or the caller explicitly authorizes installation from one.
- Do not fabricate `.framework/` from memory.

## Procedure

1. Copy the required Workspace skeleton from `.framework/templates/workspace/` into `.dwf/` without overwriting `.framework/`.
2. Keep required core files even when empty; use explicit "none yet" content.
3. Create optional `GLOSSARY.md`, `COLLABORATION.md`, or `concepts/` only when useful.
4. Replace the bootstrap README with project-specific orientation.
5. Populate verified facts/rules first.
6. Record accepted Product/Technical Decisions only when evidence or user authority supports them.
7. Keep unresolved facts/choices in their open ledgers.
8. Generate Agent PRD/SPEC only after durable state is coherent; derive Human outputs afterward.
9. Run `validate-workspace`.

## Hard boundary

Initialization may create Workspace files. It may not edit Framework files.
