# Eval Fixtures

These JSONL files are lightweight, harness-agnostic regression fixtures for maintaining the skill.

They are not part of the Agent Skills specification and do not assume a particular evaluation runner.

Suggested use:

- `triggering.jsonl`: test whether the skill activates for exploration tasks and stays out of routine UI edits.
- `direction-quality.jsonl`: test count, divergence, fair comparison, DX, and handoff behavior.
- `edge-cases.jsonl`: test capability failures, locked constraints, large counts, continuity, and productionization transitions.

Each line contains a prompt plus human-readable expectations. Adapt them to your agent/eval framework.
