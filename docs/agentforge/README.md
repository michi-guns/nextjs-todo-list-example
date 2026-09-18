# AgentForge documentation

AgentForge is this repository's project-local software development framework. Its skills live under [`.agents/skills/`](../../.agents/skills/) and its router is [`using-agent-skills`](../../.agents/skills/using-agent-skills/SKILL.md).

[`skills-lock.json`](../../skills-lock.json) records externally sourced skills installed from Git providers. Project-owned AgentForge skills are maintained directly under `.agents/skills/` and are intentionally not listed in that lock file.

The [documentation specialist](../../.agents/skills/documentation-and-adrs/SKILL.md)
maintains project documentation and checks affected agent instructions. Codex
and Claude Code use that shared skill through the router; no separate profile
copy is required. [Context engineering](../../.agents/skills/context-engineering/SKILL.md)
handles evidence selection for the current session.

Use the [`planning`](../../.agents/skills/planning/SKILL.md) skill to decide and document an implementation approach. After that plan is accepted, use [`task-breakdown`](../../.agents/skills/task-breakdown/SKILL.md) to create ordered delivery tasks in [`TODO.md`](../../TODO.md).

## Plans

Durable AgentForge plans live under [`plans/`](./plans/). They record approach, file responsibilities, interfaces, dependencies, risks, and verification strategy. They do not replace the DWF design authority or the delivery task list.

- [Testing first-class design plan](./plans/2026-08-28-testing-first-class-design.md)
- [Project glossary](../glossary.md)
