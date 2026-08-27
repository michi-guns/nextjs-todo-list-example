# Exploration Continuity

Repository-backed continuity lets the developer resume work without remembering the skill's internal state.

## Default location

When project write access exists, store lightweight exploration metadata under:

```text
.ui-explorations/
  <exploration-slug>/
    exploration.json
    fixture.json
    research-ledger.json
    directions/
      <direction-id>.json
    report.md
```

Prototype source code may live elsewhere according to the project's preview/dev-route conventions. The metadata should point to it rather than forcing code under `.ui-explorations/`.

Do not create this directory when the developer explicitly asks for no repository artifacts or when the environment is read-only.

## What to persist

Persist facts useful for resuming:

- target surface
- status
- developer-requested count/depth
- locked/free constraints
- assumptions
- fixture
- direction IDs/names/hypotheses
- implementation locations
- research evidence
- selection/rejection state
- developer feedback
- latest next step

Do not persist unnecessary conversation transcripts or secrets.

## Status model

Useful states:

- `framing`
- `researching`
- `prototyping`
- `comparing`
- `selected`
- `productionizing`
- `archived`

A direction can independently be:

- `candidate`
- `implemented`
- `favored`
- `selected`
- `rejected`
- `archived`

## Resuming

When the developer says "continue," "the one I liked," or similar:

1. Search relevant exploration state.
2. Prefer explicitly selected/favored directions.
3. Consider recent developer feedback.
4. Resolve ordinary references such as name, letter, or descriptive phrase.
5. Continue from the latest meaningful next step.

Do not ask the developer to reconstruct state that the repository already contains.

## Branching

If the developer wants to push a direction without losing the original, create a new direction ID with `parent_direction` metadata.

Example:

```json
{
  "id": "operations-console-b",
  "parent_direction": "operations-console",
  "change_intent": "Preserve dense table model; replace persistent filters with command-search."
}
```

## Selection

When a direction is selected, persist the selection and the reasons/remaining requested modifications. That enables later instructions such as "make the direction we chose production-ready."

## Cleanup

Do not automatically delete rejected prototypes. Mark them rejected/archived unless the developer asks for cleanup or productionization clearly requires removing them.
