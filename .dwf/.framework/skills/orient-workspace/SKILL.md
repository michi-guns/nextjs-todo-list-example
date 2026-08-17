---
name: orient-workspace
description: Use when entering or reloading a DWF project and you need to understand the project state without changing it.
metadata:
  version: "0.1.0-proposal.1"
  maturity: "proposal"
---

# Orient Workspace

## Goal

Build a reliable current-state mental model without activating design mutation.

## Procedure

1. Read `.framework/VERSION` and `.framework/PROTOCOL.md` enough to know the installed contract.
2. Read `.dwf/README.md`, `RULES.md`, and `CONTEXT.md`.
3. Inspect the five `decisions/` ledgers.
4. Read Agent PRD/SPEC when they contain a generated contract.
5. Read Human outputs only for comprehension, never as higher authority.
6. Load `GLOSSARY.md`, `COLLABORATION.md`, and Concepts only when relevant.
7. Identify unresolved blocking `OQ-*` / `OD-*` items.
8. Report the current design state and available next actions without modifying files.

## Authority order

For the type of information in question, prefer the owning durable Workspace artifact. Current-chat explicit user statements may supersede what you believed previously, but do not silently persist them without write authority.

## Do not

- edit `.framework/**`;
- invent missing decisions;
- infer project truth from generated Human prose when the durable owners disagree;
- treat code reality as permission to change product requirements;
- require historical chats/sessions for orientation.
