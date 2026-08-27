# UI Direction Explorer

A portable Agent Skill for researching and prototyping competing UI/UX directions before committing to one production design.

## What the developer needs to remember

Almost nothing.

Use natural language, for example:

- `Explore our transaction history UI.`
- `Give me 3 very different approaches to onboarding.`
- `Prototype several dashboard directions and keep the current sidebar.`
- `I like B, but use the filtering idea from A.`
- `Push C further.`
- `Make the direction we picked production-ready.`

The skill is designed to inspect the repository, infer sensible defaults, research when tools are available, create comparable directions, and guide the next decision without requiring the developer to learn its internal workflow.

## Install

The bundle follows the Agent Skills directory convention: the skill directory contains `SKILL.md` at its root plus optional `references/`, `assets/`, `scripts/`, and `evals/`.

Common installation patterns include placing the directory in a coding agent's project or personal skills folder, or uploading the zip to an Agent Skills-compatible client.

## External inspiration

The skill includes guidance for:

- Mobbin
- Refero
- Page Flows
- 21st.dev
- React Bits

External access is optional. The skill checks available capabilities and falls back to project context plus bundled design guidance when a source is unavailable.

## Validation

Run:

```bash
python3 scripts/validate-directions.py path/to/.ui-explorations/<exploration>
```

The validator uses only the Python standard library.

For Agent Skills format validation, use the current `skills-ref` validator when available in your environment.
