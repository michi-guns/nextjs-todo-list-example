# Project glossary

This glossary defines terms that have a project-specific meaning. Use these terms consistently in source code, documentation, task descriptions, pull requests, and agent instructions.

The glossary explains vocabulary. It does not replace the design authority in [`.dwf/`](../.dwf/) or override accepted product and technical decisions.

## AgentForge

**AgentForge** is this repository's project-local software development framework for working with coding agents. It includes:

- the skill collection under [`.agents/skills/`](../.agents/skills/);
- the [`using-agent-skills`](../.agents/skills/using-agent-skills/SKILL.md) router skill;
- the repository rules in [`AGENTS.md`](../AGENTS.md); and
- the lifecycle guidance that connects planning, implementation, testing, review, and delivery.

AgentForge is built on the Agent Skills format. **Agent Skills** names the underlying skill mechanism, while **AgentForge** names this repository's curated framework and rules for using those skills together.

For repository work, use only AgentForge. Do not use user-scoped Superpowers skills, Superpowers plans, or Superpowers conventions in this repository. If a capability is missing from AgentForge, surface that gap instead of silently switching frameworks.

### Usage

- **AgentForge skill** means a skill stored in this repository's `.agents/skills/` directory.
- **AgentForge router** means the `using-agent-skills` skill that selects and sequences applicable skills.
- **AgentForge plan** means a repository-grounded implementation approach stored under `docs/agentforge/plans/`.
- **AgentForge workflow** means the project-specific sequence and rules an agent follows for a task.
