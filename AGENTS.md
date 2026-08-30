<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Agent operating notes

## Product intent

- Read [`.dwf/README.md`](.dwf/README.md), [`.dwf/RULES.md`](.dwf/RULES.md), [`.dwf/CONTEXT.md`](.dwf/CONTEXT.md), and [`docs/documentation-protocol.md`](docs/documentation-protocol.md) before meaningful changes.
- Read the generated [Agent PRD](.dwf/output/agent/PRD.md) and [Agent SPEC](.dwf/output/agent/SPEC.md) before implementing product, domain, architecture, persistence, or integration behavior.
- Read relevant ledgers under [`.dwf/decisions/`](.dwf/decisions/) and supporting architecture/data/domain documents.
- Read the [project glossary](docs/glossary.md) when a project-specific term is unclear. It defines vocabulary used by this repository and its agents.
- Treat `.dwf/` as the canonical product/technical design authority. Delivery artifacts live outside `.dwf/` and must reference, not redefine, it.
- This repo is a standalone public, opinionated Next.js starter implemented through a complete todo reference application. Derived apps should be able to replace mostly domain and UI code while retaining or adapting the cross-cutting foundations.
- Use current stable best practices and the simplest genuinely robust design. Add complexity only when it has a clear reusable payoff in safety, correctness, operability, maintainability, or avoided rework. Do not turn the starter into a configurable multi-stack framework.
- Prefer generic, reusable artifacts when they remain clear and genuinely useful. Keep repository-specific details in thin adapters or documentation, and do not generalize merely for abstraction's sake.
- Do not invent links to other products or private projects.

## Engineering posture and scope

- Use balanced commercial engineering. Deliver the accepted behavior, make the primary path reliable, handle common failures and realistic high-impact edge cases, preserve unrelated behavior, and stop when the required checks support the result.
- Apply risk-proportional scope. Prioritize the task acceptance criteria and required verification, then the happy path, common failures, and plausible high-impact edge cases. Defer speculative abstractions, exhaustive theoretical testing, and unrelated cleanup.
- Preserve the current scaffold and its accepted extension points. Do not broaden a focused task into dependency upgrades, architecture migrations, repository-wide cleanup, or speculative hardening.
- If the requested behavior requires a change outside the task or the accepted DWF contracts, pause before expanding scope. Explain what must change, why it is required, the smallest recommended expansion, and what remains unchanged.
- Do not reopen an accepted product or technical decision because another design appears cleaner. Raise a Design Gap only when the accepted contracts are missing, contradictory, or no longer fit the requested behavior.

## AgentForge

This repository uses **AgentForge**, its project-local software development framework. AgentForge is rooted at `.agents/skills/` and uses the installed `using-agent-skills` skill as its routing layer for software-engineering work.

Use only AgentForge for work in this repository. Do not use user-scoped Superpowers skills, Superpowers plans, or Superpowers conventions here. If a user-scoped skill conflicts with AgentForge, follow AgentForge and the repository's DWF instructions. If an applicable capability is missing from AgentForge, stop and surface the gap rather than silently switching frameworks.

For multi-step work, use AgentForge `planning` in read-only mode first and save the accepted approach under `docs/agentforge/plans/`. Then use `task-breakdown` to turn that plan into ordered tasks in `TODO.md`. Do not begin implementation until both outputs and their prerequisites are understood.

Before starting any non-trivial engineering task:

1. Consult `using-agent-skills` to determine which installed skills apply.
2. Automatically invoke and follow the relevant skills.
3. Chain multiple skills when appropriate.
4. Do not require the user to explicitly name or invoke skills.
5. Follow each selected skill's workflow and verification requirements.

Existing project requirements, specifications, acceptance criteria, and architectural decisions are authoritative. Do not create competing requirements or redefine established scope.

Use the smallest set of skills appropriate for the task. Do not add process or ceremony when a simpler workflow is sufficient.

For any implementation or behavior-changing task in this repository, use the project-local `testing-first-class` skill before coding and chain it with `test-driven-development` when executable behavior or tests are changed. The testing skill owns contract discovery and evidence reconciliation; TDD owns the red/green implementation loop.

## Investigation and planning

- Before establishing a repository convention, inspect the relevant source, manifest, tests, scripts, and documentation. Treat files as evidence of a current convention only when they are actually wired or used.
- This repository is a greenfield starter, so do not require existing analogues where none exist. Distinguish current code from generated files, examples, and abandoned experiments. When no local pattern exists, follow the DWF contracts and the installed framework documentation.
- For multi-step work, keep the AgentForge plan concise and code-aware, mapping acceptance criteria to files, tests, and commands. Do not create overlapping plans or use planning to rewrite accepted product design.
- Work task by task against the accepted plan. Keep changes coherent, preserve scope-out boundaries, and stop investigating once the evidence supports a safe implementation decision.

## Task prerequisites and preflight

- Before editing code or running verification, identify only the prerequisites needed for the current slice. Classify each as required to implement, required only for a named verification step, or optional.
- Run a cheap, read-only preflight for required prerequisites such as pnpm dependencies, Docker/Testcontainers, a local database, a non-default Neon branch, Sanity configuration, Playwright browsers, or a running Next.js server.
- If a required prerequisite is unavailable, report the failed check, the smallest user or environment action needed, and what will resume afterward. Do not begin a partial implementation or switch to another slice to avoid the blocker.
- Do not silently install packages, change environment or credentials, start external services, switch database targets, substitute mocks for required integrations, weaken checks, or skip required verification.
- Database-backed tests and destructive setup must target only the repository's disposable local PostgreSQL environment. Schema-changing Neon work must follow the branch-first rule in the DWF decisions.

## Testing and verification

- Use focused behavioral tests while changing meaningful behavior. Cover the happy path, common failures, and plausible high-impact regressions without building combinatorial tests for speculative states.
- At completion, run every explicitly required verification clause plus one proportionate final gate for the changed surface. Reuse valid evidence for unchanged areas when the contract allows it.
- Never claim a check passed when it was skipped or replaced with a weaker check. Report task-caused failures, pre-existing failures, unexecuted verification, blockers, and optional observations separately.
- For meaningful Next.js runtime changes, use the repository's browser/runtime verification workflow when its prerequisites are available. A typecheck or lint pass alone does not prove visible behavior.

## Git and destructive-action safety

- Preserve existing dirty or untracked work and use the repository's simple branch strategy unless the user says otherwise.
- Ask for explicit confirmation before deleting or overwriting files, removing directories, clearing generated or cached data, resetting databases, or using destructive Git operations such as reset, clean, restore, checkout that overwrites paths, rebase, amend, branch deletion, force-push, or history rewriting.

## Completion reporting

- Report the files changed, the behavior delivered, the exact checks run and their results, anything intentionally omitted, and any remaining concrete risk or prerequisite.

## Git strategy (simple / flexible)

- **No PR requirement.** No protected-branch ceremony is required for this repository's current workflow.
- Agents and humans may:
  - commit and **push directly to `main`**, or
  - use short-lived branches and merge locally / on GitHub however is convenient.
- Keep commits coherent and messages clear enough to skim history.
- Do not force-push `main` unless the operator explicitly asks.
- Do not rewrite shared history casually.
- Secrets stay out of git (`.env*`, tokens, credentials).

## Local quality

- Package manager: pnpm (see `packageManager` / lockfile if present).
- Husky + lint-staged run on commit when configured.
- Prefer `pnpm typecheck`, `pnpm lint`, `pnpm test`, and Playwright scripts from `package.json` / SPEC before calling work done.
