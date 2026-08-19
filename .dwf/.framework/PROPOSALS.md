# DWF Framework Proposals

This is the local enhancement ledger for generic Design Workspace Framework improvements discovered before a canonical public Framework repository and release process exist.

Proposals do not change current Framework semantics by themselves. Accepted proposals become authoritative only after they are intentionally integrated into the relevant Framework protocol, Skills, templates, glossary, schemas, or validators and included in a versioned Framework revision.

## Maintenance

- Use stable `DWF-P-*` identifiers and never reuse them.
- Append new proposals and preserve resolved proposals as history.
- Clarify or consolidate an entry when needed instead of adding duplicates.
- Keep project-specific product and technical truth outside this file.
- Record both proposal status and integration state so accepted intent is not confused with implemented Framework behavior.

<a id="dwf-p-001"></a>

## DWF-P-001 — Give Architectural Subsystems a component identity

- **Status:** ACCEPTED
- **Integration state:** PENDING
- **Scope:** Architectural Subsystem identification, Concepts, inventory, and validation guidance

### Problem

Architectural boundaries are useful for discovering and qualifying potential Architectural Subsystems, but naming the subsystem after its boundary can leave it feeling like an abstract design description rather than a cohesive architectural black box.

### Proposed framework rule

Boundary analysis may help identify where an Architectural Subsystem is needed and clarify what it owns. Once a candidate passes the Architectural Subsystem qualification requirements, represent it as a component with a clear identity and a concise component-style name.

The subsystem Concept should distinguish:

- **Identity:** what architectural component exists and what role it performs.
- **Boundary:** what the component owns, what it exposes, and what remains outside it.

Names may use terms such as `Manager`, `Service`, `Engine`, `Store`, `Registry`, `Coordinator`, or another noun that fits the component's actual role. No suffix is mandatory. Prefer a name that communicates the black box itself rather than only the line around it.

A name ending in `Boundary` should be used only when the boundary is itself intentionally modeled as a concrete architectural component, not merely because boundary analysis was used during qualification.

This clarification does not weaken or replace any Architectural Subsystem qualification condition. A strong component name cannot make an unqualified candidate into a subsystem.

### Expected integration

- Add the identity-versus-boundary distinction to the canonical Architectural Subsystem protocol.
- Add an explicit component-identity step to the subsystem-identification Skill.
- Separate Identity and Boundary guidance in the Architectural Subsystem Concept template.
- Include component identity and naming quality in review or validation guidance.
- Add or update the stable glossary definition when the newer Framework glossary is integrated.

<a id="dwf-p-002"></a>

## DWF-P-002 — Keep decision ledgers thin

- **Status:** ACCEPTED
- **Integration state:** INTEGRATED in `0.1.0-proposal.1.local.2`
- **Scope:** Product Decisions, Technical Decisions, and Open Decisions

Record accepted results directly in `PRODUCT.md` or `TECHNICAL.md`. Keep `OPEN-DECISIONS.md` for unresolved choices only, and remove an open entry after recording its result. Do not require an open-decision record for routine accepted choices. Keep reasoning or superseded entries only when current work still needs them. Git retains ordinary history.
