<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Agent operating notes

## Operator-local preferences

- `.local/` is git-ignored and holds machine-local files that never ship with the repository. When `.local/README.md` exists, read it before starting work: it routes to the operator's personal agent preferences, such as the language and tone of chat replies. Those preferences apply on top of these notes and never override the `.dwf/` contracts or the engineering rules below.

## Product intent

- Read [`.dwf/README.md`](.dwf/README.md), [`.dwf/RULES.md`](.dwf/RULES.md), [`.dwf/CONTEXT.md`](.dwf/CONTEXT.md), and [`docs/documentation-protocol.md`](docs/documentation-protocol.md) before meaningful changes.
- Read the generated [Agent PRD](.dwf/output/agent/PRD.md) and [Agent SPEC](.dwf/output/agent/SPEC.md) before implementing product, domain, architecture, persistence, or integration behavior.
- Read relevant ledgers under [`.dwf/decisions/`](.dwf/decisions/) and supporting architecture/data/domain documents.
- Read the [project glossary](docs/glossary.md) when a project-specific term is unclear. That page routes AgentForge vocabulary and points to the product/domain glossaries.
- Treat `.dwf/` as the canonical product/technical design authority. Delivery artifacts live outside `.dwf/` and must reference, not redefine, it.
- This repo is a standalone public, opinionated Next.js starter implemented through a complete todo reference application. Derived apps should be able to replace mostly domain and UI code while retaining or adapting the cross-cutting foundations.
- Use the current documented APIs of the accepted stack, written for coding agents as primary authors: prefer what this repository's installed versions teach over both stale tutorials and unaccepted experimental surfaces. Drizzle, Better Auth, and Zod 4 are explicit exceptions and must not be replaced for training-data familiarity. See [RULE-012](.dwf/RULES.md#rule-012) and [TD-028](.dwf/decisions/TECHNICAL.md#td-028). Add complexity only when it has a clear reusable payoff in safety, correctness, operability, maintainability, or avoided rework. Do not turn the starter into a configurable multi-stack framework.
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

When work changes documented behavior or agent instructions, use [documentation-and-adrs](.agents/skills/documentation-and-adrs/SKILL.md) for maintenance and a focused context audit. Its delegation guidance defines the documentation specialist; trivial edits can stay inline. Use its read-only review mode for documentation-focused independent review under the closeout rule below.

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

## Review and task follow-through

- The owner authorizes agents to complete the review/fix/retest loop, commit,
  push and merge task branches directly into `main` without a PR or another
  permission request once the
  required checks and independent review pass for the current tip. Continue
  to the next authorized, unblocked task. Stop only for a concrete blocker,
  unresolved decision or action that needs the owner. This does not waive
  destructive-action checkpoints or the accepted protected release gates.
- For each completed non-trivial task, spawn a fresh independent reviewer
  sub-agent against the exact latest artifact. Do not substitute a
  self-review in the implementing agent's own context. Use this harness's
  most capable model. Set reasoning effort to `high` on Grok, `xhigh` on
  Codex and Claude Code, and the highest available setting on GLM, Kimi,
  Qwen, and similar harnesses. If the spawn API exposes a reasoning or
  effort parameter, set it; otherwise still select the most capable model
  and state the required effort in the reviewer prompt. Ask for
  reasonable, proportional, pragmatic, actionable findings; do not invite
  speculative perfection or scope expansion. Completed plans and task
  evidence that name GPT-5.6-Sol record the reviewer used then; new
  closeout reviews follow this spawn rule.
- Treat reviewer output as evidence, not as a new source of requirements. Before accepting or rejecting a finding, reread the changed artifact and reconcile it with the applicable DWF contracts, `TST-*` obligations, installed-version official documentation/source, and executable behavior. A suggestion that overrides a framework's built-in security or lifecycle behavior is a contract conflict until those sources support it.
- Classify findings as actionable, contract conflict/design gap, optional/nit, or noise. Fix in-scope actionable findings; document or defer optional feedback; stop and surface unresolved contract conflicts instead of silently choosing. When a finding changes behavior, add or update the smallest regression test before or alongside the fix when the prerequisite is available.
- Any code or test change invalidates the previous approval. Rerun the affected checks and obtain a fresh review. If three substantive cycles remain unresolved or contradictory, stop and report the exact conflict rather than looping indefinitely or claiming approval.
- Before marking a task complete or merging, confirm that the reviewed commit is the current branch tip, reconcile exact verification evidence and affected `TST-*` statuses, update `TODO.md`, and recompute every dependency to find all genuinely unblocked work within the authorized scope. Keep any temporary run/checkpoint artifact current after each task transition.

## Git and destructive-action safety

- Preserve existing dirty or untracked work and use the repository's simple branch strategy unless the user says otherwise.
- Deleting local or remote branches is pre-authorized only after their current tips are proven ancestors of `main` and they are not in use by another agent or worktree. Refresh remote refs and confirm the remote tip before deleting a remote branch. Never delete `main` or an unmerged branch under this authorization.
- Ask for explicit confirmation before deleting or overwriting files, removing directories, clearing generated or cached data, resetting databases, or using other destructive Git operations such as reset, clean, restore, checkout that overwrites paths, rebase, amend, unmerged branch deletion, force-push, or history rewriting. Light housekeeping does not authorize discarding unrelated work, stashes, or worktree directories.

## Completion reporting

- Report the files changed, the behavior delivered, the exact checks run and their results, anything intentionally omitted, and any remaining concrete risk or prerequisite.

## Git strategy (simple / flexible)

- Each [`TODO.md`](TODO.md) task starts on a short-lived branch from current `main`, passes its required checks and independent review, then merges directly back into `main`. Do not create a PR unless the user explicitly requests one. The [task workflow](TODO.md#task-branch-and-merge-protocol) owns the operational steps.
- For work that is not a `TODO.md` task, agents and humans may:
  - commit and **push directly to `main`**, or
  - use short-lived branches and merge directly into `main`.
- Keep commits coherent and messages clear enough to skim history.
- Finish with clean `main` and remove merged local and remote task branches under the safety rule above. Keep branches used by active parallel work. Check documentation for stale instructions and leave unrelated work intact.
- For an explicitly requested PR, use [the PR template](.github/PULL_REQUEST_TEMPLATE.md), beginning with its product-owner-facing **Why this change** section.
- Do not force-push `main` unless the operator explicitly asks.
- Do not rewrite shared history casually.
- Secrets stay out of git (`.env*`, tokens, credentials).

## Local quality

- Package manager: pnpm (see `packageManager` / lockfile if present).
- Husky + lint-staged run on commit when configured.
- Prefer `pnpm typecheck`, `pnpm lint`, `pnpm test`, and Playwright scripts from `package.json` / SPEC before calling work done.
