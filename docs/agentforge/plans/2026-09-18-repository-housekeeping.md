# Repository housekeeping plan and audit

> AgentForge plan. Use `task-breakdown` after this plan is accepted.

**Status:** Completed on 2026-09-18. The owner approved the exact cleanup and documentation scope, with a fresh stash usefulness review before execution. Final inspection confirms that the later manual disk cleanup resolved the initial tool-policy blocker.

**Goal:** Return the working checkout to current `main`, remove completed Git branches and obsolete local artifacts, and correct current documentation without discarding unique work.

**Spec and decisions:** [AGENTS.md](../../../AGENTS.md), [documentation protocol](../../documentation-protocol.md), [DWF rules](../../../.dwf/RULES.md), [current context](../../../.dwf/CONTEXT.md), [testing ledger](../../../.dwf/decisions/TESTING.md), and [delivery tracker](../../../TODO.md).

**Architecture:** Git metadata and documentation maintenance only. Application behavior, dependencies, databases, provider resources, deployments, design decisions, and historical evidence are outside this change.

**Global constraints:** Preserve unique local work. Require explicit approval for the exact deletion commands below. Do not force-push `main`, reset, clean, rebase, amend, delete tags, or clear the primary checkout caches.

## Initial audit and file map

- Audited GitHub `main`: `960e7cad2d09381d393f80e105311008a9b2a89f`.
- Current checkout: `task/T-29-guide-closeout` at `96920bc6e2043694ad8c88d0c33af949bba681e4`. Its tree is identical to GitHub `main`; PR #42 is merged.
- Local `main` is 17 commits behind GitHub. No tracked working-tree changes were present during the audit.
- 43 non-main local branches and 32 non-main GitHub branches. 42 local tips are ancestors of `main`. The remaining `task/t-04-lists-tasks-schema` tip has the exact same tree as squash-merged PR #6, commit `9370094d734a65ce54075dcd281723ae5207e309`.
- All 32 live remote branch tips match their audited local counterparts. All 42 PRs are merged; there are zero open PRs or issues.
- Five remote-tracking refs refer to branches already absent on GitHub. They are listed explicitly in the command appendix.
- Secondary worktree: `C:/Users/jimzord12/.codex/worktrees/4cbc/nextjs-todo-list-example` at `386e9e06a609d52a38ae207d7fd40ecc9aa76e7f`, already in `main`. No tracked edits or non-ignored untracked files. Ignored content is `.next`, `node_modules`, `.husky/_`, `next-env.d.ts`, and `tsconfig.tsbuildinfo`. No ignored `.env`, `.local`, `.vercel`, custom editor, or browser-evidence files were found. No process command line naming this worktree was observed. Removal includes these generated files and dependencies.
- `stash@{0}` at `4bdde804085b722a00264eee9ce0943271c146ad` contains old T-27 tracker/evidence edits plus two untracked files. All four files are superseded by the completed browser slice in `main`, including its later token-redaction fix. Remove this snapshot.
- `stash@{1}` at `ae0af7f5f1e79246b6b77e12ccf395103265d6d6` contains unmerged dependency upgrades in `package.json` and `pnpm-lock.yaml`. Preserve it. Its eight version edits cover Better Auth, Lucide, shadcn, Zod, Node/React DOM types, lint-staged, and tsx. Do not apply or declare these obsolete.
- Two untracked disabled reviewer skill files have expired instructions and a bridge to a nonexistent active skill. The current review rules are already in `AGENTS.md` and the active review skill. Remove only the two named files and their listed empty directories. Preserve the unrelated empty Trello skill directories.

### Documentation corrections prepared

An unapplied patch is stored in the ignored local audit folder at `.local/housekeeping-2026-09-18/documentation-proposal.patch`. `git apply --check` passes. It changes six files:

| File                                                   | Correction                                                                                                                                                             |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.dwf/README.md`                                       | Replace the stale T-20-onward remaining-work statement with the owning delivery tracker link.                                                                          |
| `.dwf/decisions/OPEN-QUESTIONS.md`                     | Date historical Sanity/database answers and point current answers to completed hosted evidence. Preserve historical facts.                                             |
| `.dwf/output/agent/SPEC.md`                            | Reconcile two stale unchecked migration/performance checklist items against the verified ledger. Preserve original evidence attribution; no new hosted run is claimed. |
| `.agents/skills/using-agent-skills/SKILL.md`           | Replace the nonexistent Definition of Done reference with the existing quality-gates document.                                                                         |
| `.agents/skills/code-review-and-quality/SKILL.md`      | Point the two missing checklist references to the existing security and performance skills.                                                                            |
| `.agents/skills/vercel-react-best-practices/AGENTS.md` | Correct three relative rule links to the existing `rules/` files.                                                                                                      |

At the initial audit, the proposed plan was the only new tracked-location file and no existing tracked file had been edited. The raw branch inventory, link scan and proposed patch are local ignored audit artifacts. Delivery is tracked as T-30 in `TODO.md`.

The requested follow-up stash review inspected tracked, index, and untracked contents. The T-27 snapshot contains no useful missing work: its browser test and plan are already merged with a later token-reporting repair, and its pending evidence statements are superseded. The dependency snapshot contains eight version edits and their generated lockfile resolution, with no application-code changes or changed metadata for unchanged package versions. Those edits are absent from `main`; retain the concrete upgrade proposal for a separate dependency review. Retention does not approve the upgrades or claim their compatibility.

## Dependencies and work order

1. Obtain explicit approval for the command appendix and proposed documentation corrections. Approval is required by the repository safety checkpoint; the audit itself is authorized.
2. Recheck the exact current refs, stash object IDs, file hashes, worktree contents, process use, open PRs, and primary checkout status. Stop if any target changed or new unique work is present. A new `main` tip requires renewed ancestry/tree checks before proceeding.
3. Safely switch to `main` and fast-forward. Save the accepted plan, use AgentForge `task-breakdown` for one documentation task in `TODO.md`, and use its task branch/PR protocol for the six-file correction. Do not combine unique dependency upgrades with it.
4. Execute only the approved Git/local-artifact cleanup. Remote deletion uses explicit expected-SHA leases for each named ref; a changed remote tip causes refusal. Resolve the secondary worktree path and confirm it is exactly the named directory before removal. Before every `Remove-Item`, verify the file hash or directory emptiness and resolved target path.
5. Apply the documentation patch, check the updated links/anchors, formatting and diff, and complete the independent exact-tip review, CI and PR workflow required by `AGENTS.md`. Return to updated `main`. Any new housekeeping task branch created for this work is not part of this fixed deletion approval and must not be silently deleted.
6. Verify the final Git inventory. Expect the pre-existing completed branches gone, the old worktree removed, the unique dependency stash retained with the same object ID, no unrelated file changes, and no new unresolved PR. Preserve legitimate backlog tasks T-26, broader T-27 and T-28.

## Verification strategy

Read-only prerequisite checks found Node `v24.18.0`, pnpm `11.25.0`, and the installed TypeScript/ESLint/Vitest entry points. Docker, browser, provider and deployment prerequisites are not needed for this audit or documentation-only patch.

| Check                                | Result on 2026-09-18                                                                                                                                                                                                                                                                                            |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm test`                          | 42 files, 415 tests passed.                                                                                                                                                                                                                                                                                     |
| `pnpm typecheck --incremental false` | Passed. Disabled incremental output to avoid updating the existing cache.                                                                                                                                                                                                                                       |
| `pnpm lint`                          | Exit 0. One pre-existing unused `Geist` warning in `app/layout.tsx:1`.                                                                                                                                                                                                                                          |
| `git diff --check`                   | Passed before documentation edits.                                                                                                                                                                                                                                                                              |
| GitHub current-main CI               | [Run 35118609753](https://github.com/michi-guns/nextjs-todo-list-example/actions/runs/35118609753) succeeded for `960e7cad2d09381d393f80e105311008a9b2a89f`. Historical hosted evidence, not a new local build/browser run.                                                                                     |
| Local Markdown path scan             | 247 selected current documentation/skill Markdown files, 339 relative Markdown links inspected; three missing rule links, addressed in the patch. Three additional missing backtick references found manually and addressed. Fenced examples and fragment validation were excluded from this initial path scan. |
| Proposed documentation patch         | `git apply --check .local/housekeeping-2026-09-18/documentation-proposal.patch` passed. Patch is not applied.                                                                                                                                                                                                   |

No application behavior or `TST-*` obligation changes. Documentation reconciliation references `TST-MIGRATION-001`, `TST-PERFORMANCE-001`, `TST-LANDING-002`, and `TST-LANDING-003`; their owning ledger is already verified. `TST-HARNESS-001` remains partial because a live Docker-daemon outage has not been observed. This audit does not close that evidence gap.

Fresh local build, database integration, browser and hosted checks were not run because there is no runtime change. Documentation completion requires changed-file Prettier, link/anchor checks, diff validation, fresh independent review and the normal hosted CI gate. Do not claim this quick audit is a full code/security/dependency-vulnerability audit.

## Risks and assumptions

- Git branches can advance and stashes can be reindexed. Verify object IDs immediately before each action; approval is for the listed objects, not a future branch tip or newly created stash.
- The old T-04 branch needs `-D` only because its work entered through a squash merge. Its full tree equality with merged commit `9370094` is the deletion evidence.
- Worktree removal deletes its ignored dependencies and generated build state. Recheck for user files and active use first. Never use a recursive deletion of a computed path without confirming the resolved exact target.
- The dependency stash contains unique work and remains pending. A later decision may approve a reviewed upgrade or explicit discard.
- The resolved legacy entries in `OPEN-DECISIONS.md` and dated plans/evidence are preserved. Their age alone does not make them disposable.
- Optional pre-existing items: unused Geist import, historical baseline test-count snapshots, and the partial live-Docker-outage evidence. They are not silently fixed or marked complete.

## Handoff to task breakdown

After acceptance, create one focused housekeeping documentation task in `TODO.md`, covering the six-file patch, links/format checks, independent review, CI and merge. The Git cleanup appendix is an owner-approved operational action and does not redefine product requirements. Recommended skills: `planning`, `task-breakdown`, `documentation-and-adrs`, `git-workflow-and-versioning`, `code-review-and-quality`, `unslop`; consult `testing-first-class` for evidence reconciliation without changing its statuses.

## Initial execution evidence, 2026-09-18

This records the first execution checkpoint. The directory-removal blocker described here was subsequently resolved, as verified in the final closeout below.

- Fresh preflight matched every approved local and remote object ID, both stash IDs, disabled-file hashes, and the clean worktree. No open PR or process command line naming the worktree was observed.
- Updated local `main` to `960e7cad2d09381d393f80e105311008a9b2a89f` and created `task/T-30-repository-housekeeping` for the documentation changes.
- Removed all 43 approved local branches, all 32 approved GitHub branches with expected-SHA leases, and all five stale remote-tracking refs. GitHub then contained only `main`; the new documentation task branch had not yet been pushed.
- Dropped the superseded T-27 stash after the requested usefulness review. The retained dependency snapshot is now `stash@{0}`, still object `ae0af7f5f1e79246b6b77e12ccf395103265d6d6`.
- Removed the two approved disabled skill files with exact-path file patches. Their empty directories remain because the shell rejected the directory-removal command.
- `git worktree remove --force` unregistered the secondary worktree but returned `Directory not empty` after partially removing its checkout. Git now lists only the primary worktree. The residual directory at the exact approved path still exists. A guarded native PowerShell removal and the separate empty-directory cleanup were rejected by the execution policy with `blocked by policy`; no more specific reason was supplied. The owner was asked about the explicit residual-directory command. Do not report that disk cleanup as complete.
- Applied the six-file documentation patch. Standard Prettier also normalized the imported Vercel guide's code examples. An exact comparison confirmed that file equals the original with only three link replacements followed by the configured Prettier output.
- Changed-file Prettier and `git diff --check` passed. The current-documentation path scan checked 247 files and 343 local Markdown destinations with zero missing paths. Seventeen links and anchors introduced by the original patch and six plan links were checked separately. Initial same-session unit/type/lint results above remain valid because application code, tests, dependencies, and configuration are unchanged.
- Commit review and PR CI still gate the documentation merge. The remaining local directory cleanup is a recorded execution-policy blocker, not an application or documentation failure. T-26, broader T-27, and T-28 retain their existing product-decision prerequisites; this task does not unblock them.

## Final closeout, 2026-09-18

Read-only inspection confirmed that the residual directory and all four approved empty reviewer-skill directories no longer exist. The main repository and its installed dependencies remain present. Git showed clean synchronized `main` at `8bf38235f3fb29e25682f3d85a6b1c8058dd1df8`, only one local and one GitHub branch, no open PRs, and only the primary worktree. The sole retained stash is still `ae0af7f5f1e79246b6b77e12ccf395103265d6d6`.

[PR #43](https://github.com/michi-guns/nextjs-todo-list-example/pull/43) merged after fresh independent review of exact commit `c77c8b9202d817f519b662b6de2a5e6ee27abb62` and passing Quality/Harness checks. The [subsequent main CI](https://github.com/michi-guns/nextjs-todo-list-example/actions/runs/35344566757) passed too. The owner separately approved deletion of the housekeeping branch after merge; both its local and remote refs were removed. This follow-up corrects only the two closeout records and follows the same review/CI workflow.

There is no remaining housekeeping prerequisite. The preserved dependency proposal is a separate review item. T-26, broader T-27, T-28, and the partial live-Docker-outage evidence retain their existing scope and decision requirements.

## Exact approval scope and command appendix

The owner approved the commands below on 2026-09-18. Run from `C:/Users/jimzord12/Documents/GitHub/michi-guns/nextjs-todo-list-example`. Stop on any command failure. Preflight checks above are mandatory; execution results are recorded separately from this approved scope.

### Return to current main

```powershell
git fetch --no-prune origin
git switch main
git merge --ff-only origin/main
```

### Remove the named completed worktree

This deletes the secondary checkout and its generated/dependency files, and unregisters it from Git. It does not delete the primary checkout.

```powershell
git worktree remove --force 'C:/Users/jimzord12/.codex/worktrees/4cbc/nextjs-todo-list-example'
```

### Delete the 43 named local branches

This removes branch pointers and their branch reflogs. Merged project history remains on `main`.

```powershell
git branch -d 'chore/harness-reviewer-subagent'
git branch -d 'task/T-01-neon-development-branch'
git branch -d 'task/T-02-sanity-resource'
git branch -d 'task/T-03-database-runtime'
git branch -d 'task/T-12A-ui-audit'
git branch -d 'task/T-15-playwright-harness'
git branch -d 'task/T-18.1-environment-contract-reconciliation'
git branch -d 'task/T-18.2-profile-secret-command-contracts'
git branch -d 'task/T-18.3-target-classification-guards'
git branch -d 'task/T-18.4-environment-contract-tests'
git branch -d 'task/T-19-local-docker-postgres'
git branch -d 'task/T-20-durable-neon-development'
git branch -d 'task/T-21-ci-quality-gates'
git branch -d 'task/T-21.5-mail-closeout'
git branch -d 'task/T-21.5-protected-mail'
git branch -d 'task/T-21.5-resend-foundation'
git branch -d 'task/T-22-hosted-preview-proof'
git branch -d 'task/T-22-preview-delivery'
git branch -d 'task/T-22-preview-exact-revision'
git branch -d 'task/T-23-exact-ref'
git branch -d 'task/T-23-production-release'
git branch -d 'task/T-23-release-evidence'
git branch -d 'task/T-23-release-runner'
git branch -d 'task/T-24-local-pipeline-evidence'
git branch -d 'task/T-24-pipeline-closeout'
git branch -d 'task/T-25-delivery-docs-closeout'
git branch -d 'task/T-25-delivery-documentation'
git branch -d 'task/T-27-email-verification-browser'
git branch -d 'task/T-29-derived-application-guide'
git branch -d 'task/T-29-guide-closeout'
git branch -d 'task/agentforge-glossary'
git branch -D 'task/t-04-lists-tasks-schema'
git branch -d 'task/t-05-better-auth-boundary'
git branch -d 'task/t-06-lists-capability'
git branch -d 'task/t-07-tasks-capability'
git branch -d 'task/t-08-pagination-errors'
git branch -d 'task/t-09-server-entry-paths'
git branch -d 'task/t-09a-ui-direction-exploration'
git branch -d 'task/t-12-sanity-landing-read-path'
git branch -d 'task/t-13-sanity-freshness-recovery'
git branch -d 'task/t-14-postgresql-harness'
git branch -d 'task/t-16-neon-performance-evidence'
git branch -d 'task/testing-first-class-design'
```

### Delete the 32 named GitHub branches

Each deletion is conditional on the exact audited remote SHA. These leases affect only the named branch deletion; they do not authorize rewriting another ref. Merged PR records remain available.

```powershell
git push '--force-with-lease=refs/heads/task/T-12A-ui-audit:2473f888762f9f787374086ba439a0cb7a67f418' origin ':refs/heads/task/T-12A-ui-audit'
git push '--force-with-lease=refs/heads/task/T-15-playwright-harness:f73223c3d8fbfb094c8c419407666922443fb84f' origin ':refs/heads/task/T-15-playwright-harness'
git push '--force-with-lease=refs/heads/task/T-18.1-environment-contract-reconciliation:f132cf45b69403d72d3e3c1bdfc24a3b28f492f6' origin ':refs/heads/task/T-18.1-environment-contract-reconciliation'
git push '--force-with-lease=refs/heads/task/T-18.2-profile-secret-command-contracts:171525d14cb32e7a304f382336874d3d8a1ce5f5' origin ':refs/heads/task/T-18.2-profile-secret-command-contracts'
git push '--force-with-lease=refs/heads/task/T-18.3-target-classification-guards:f50bc24194bd59da8e9d8d92f25ceab515556b28' origin ':refs/heads/task/T-18.3-target-classification-guards'
git push '--force-with-lease=refs/heads/task/T-21.5-mail-closeout:93e280b5a79f95b90b880422f1db26b1ba6dff9d' origin ':refs/heads/task/T-21.5-mail-closeout'
git push '--force-with-lease=refs/heads/task/T-21.5-protected-mail:d5a7abebe29aa441c622f0af99c5b139702e5907' origin ':refs/heads/task/T-21.5-protected-mail'
git push '--force-with-lease=refs/heads/task/T-21.5-resend-foundation:7a05e981c53d1a963a99f14c4f2767f2fa2678fe' origin ':refs/heads/task/T-21.5-resend-foundation'
git push '--force-with-lease=refs/heads/task/T-22-hosted-preview-proof:0e7fa6ae0287ea9c2f199ab10230cdf648d8c7ea' origin ':refs/heads/task/T-22-hosted-preview-proof'
git push '--force-with-lease=refs/heads/task/T-22-preview-exact-revision:386e9e06a609d52a38ae207d7fd40ecc9aa76e7f' origin ':refs/heads/task/T-22-preview-exact-revision'
git push '--force-with-lease=refs/heads/task/T-23-production-release:30ec035aa6752ee4b5f38df055db07049d624ea2' origin ':refs/heads/task/T-23-production-release'
git push '--force-with-lease=refs/heads/task/T-23-release-evidence:8405d8d2204f8f47ae30c58ff75c088b4a3653b4' origin ':refs/heads/task/T-23-release-evidence'
git push '--force-with-lease=refs/heads/task/T-23-release-runner:7c9f1a923467389e9bd59a64117b440df2b1e701' origin ':refs/heads/task/T-23-release-runner'
git push '--force-with-lease=refs/heads/task/T-24-local-pipeline-evidence:b896d98e4890418d1554b00c107926a3cd112f9e' origin ':refs/heads/task/T-24-local-pipeline-evidence'
git push '--force-with-lease=refs/heads/task/T-24-pipeline-closeout:ec9711141620ccb7d776c7d103dd0e2af12da230' origin ':refs/heads/task/T-24-pipeline-closeout'
git push '--force-with-lease=refs/heads/task/T-25-delivery-docs-closeout:e4d82f3cdbb72dcefc363fe23021048b440f15b7' origin ':refs/heads/task/T-25-delivery-docs-closeout'
git push '--force-with-lease=refs/heads/task/T-25-delivery-documentation:f14f81d59157510f3b24cbd09ad138419c7313a1' origin ':refs/heads/task/T-25-delivery-documentation'
git push '--force-with-lease=refs/heads/task/T-27-email-verification-browser:096b38d7d92574454a9480a1531b94bf2034175d' origin ':refs/heads/task/T-27-email-verification-browser'
git push '--force-with-lease=refs/heads/task/T-29-derived-application-guide:8c9e6a37a96a5fc4880d275980479829be8fe889' origin ':refs/heads/task/T-29-derived-application-guide'
git push '--force-with-lease=refs/heads/task/T-29-guide-closeout:96920bc6e2043694ad8c88d0c33af949bba681e4' origin ':refs/heads/task/T-29-guide-closeout'
git push '--force-with-lease=refs/heads/task/agentforge-glossary:7f5a2bce7d279d654c83ddff4b0d71cb2a0daa5e' origin ':refs/heads/task/agentforge-glossary'
git push '--force-with-lease=refs/heads/task/t-04-lists-tasks-schema:24233b466a14b65b92a8593b52399f641f6a4396' origin ':refs/heads/task/t-04-lists-tasks-schema'
git push '--force-with-lease=refs/heads/task/t-05-better-auth-boundary:d241a7583e362e72e6c42a4e539ceed0fa6c8a49' origin ':refs/heads/task/t-05-better-auth-boundary'
git push '--force-with-lease=refs/heads/task/t-06-lists-capability:2eccfcc36c40c85397eb8f670644e422de048c4a' origin ':refs/heads/task/t-06-lists-capability'
git push '--force-with-lease=refs/heads/task/t-07-tasks-capability:fc83f5ad267d124f858a1a3169ca225de47ce49c' origin ':refs/heads/task/t-07-tasks-capability'
git push '--force-with-lease=refs/heads/task/t-08-pagination-errors:72e999e1a0a67004b15101a9634195e026a1caac' origin ':refs/heads/task/t-08-pagination-errors'
git push '--force-with-lease=refs/heads/task/t-09-server-entry-paths:5e45396d0b9b234ff4d8bbe5e033d1bf8e1597e2' origin ':refs/heads/task/t-09-server-entry-paths'
git push '--force-with-lease=refs/heads/task/t-09a-ui-direction-exploration:23d27e9ca365ddbdaf6cd7f1d6a61662a0a505a7' origin ':refs/heads/task/t-09a-ui-direction-exploration'
git push '--force-with-lease=refs/heads/task/t-12-sanity-landing-read-path:50dd566de6c51f43fb3568a7fa94cbcf38cfa5df' origin ':refs/heads/task/t-12-sanity-landing-read-path'
git push '--force-with-lease=refs/heads/task/t-13-sanity-freshness-recovery:032b8a9725394791b87d8ee7c01ff11cabfff9a9' origin ':refs/heads/task/t-13-sanity-freshness-recovery'
git push '--force-with-lease=refs/heads/task/t-14-postgresql-harness:dadcd68af7abcdf579cfbcc7b504aa2360438185' origin ':refs/heads/task/t-14-postgresql-harness'
git push '--force-with-lease=refs/heads/task/t-16-neon-performance-evidence:85d3998f4e817afc4384ff5f23782e088a8d847a' origin ':refs/heads/task/t-16-neon-performance-evidence'
```

### Delete five already-stale remote-tracking refs

```powershell
git branch -dr 'origin/task/T-18.4-environment-contract-tests'
git branch -dr 'origin/task/T-19-local-docker-postgres'
git branch -dr 'origin/task/T-20-durable-neon-development'
git branch -dr 'origin/task/T-21-ci-quality-gates'
git branch -dr 'origin/task/T-22-preview-delivery'
```

### Drop only the superseded T-27 stash

Immediately before dropping, verify `git rev-parse "stash@{0}"` equals `4bdde804085b722a00264eee9ce0943271c146ad`. Otherwise locate that exact stash again and request an updated command if its selector changed. Afterward the retained dependency stash normally becomes `stash@{0}`; verify its object ID remains `ae0af7f5f1e79246b6b77e12ccf395103265d6d6`.

```powershell
git stash drop 'stash@{0}'
```

### Remove only expired disabled reviewer artifacts

| File                                                      | Expected SHA-256                                                   |
| --------------------------------------------------------- | ------------------------------------------------------------------ |
| `.agents/disabled_skills/reviewer-followthrough/SKILL.md` | `a923af4c6010eea9cc3aa770a13a32030b8de3f0d7d2c51a11c2c4cf3cff1bd7` |
| `.claude/disabled_skills/reviewer-followthrough/SKILL.md` | `3d11f80cec0ea22701c16e432ef4cca60ab3d83a03ca6dd00dfa15c7375b1a12` |

Delete these files, then only the explicitly listed empty directories. Preserve `.agents/disabled_skills/` and the unrelated Trello directories.

```powershell
Remove-Item -LiteralPath 'C:/Users/jimzord12/Documents/GitHub/michi-guns/nextjs-todo-list-example/.agents/disabled_skills/reviewer-followthrough/SKILL.md'
Remove-Item -LiteralPath 'C:/Users/jimzord12/Documents/GitHub/michi-guns/nextjs-todo-list-example/.claude/disabled_skills/reviewer-followthrough/SKILL.md'
Remove-Item -LiteralPath 'C:/Users/jimzord12/Documents/GitHub/michi-guns/nextjs-todo-list-example/.claude/disabled_skills/reviewer-followthrough/reviewer-followthrough'
Remove-Item -LiteralPath 'C:/Users/jimzord12/Documents/GitHub/michi-guns/nextjs-todo-list-example/.claude/disabled_skills/reviewer-followthrough'
Remove-Item -LiteralPath 'C:/Users/jimzord12/Documents/GitHub/michi-guns/nextjs-todo-list-example/.claude/disabled_skills'
Remove-Item -LiteralPath 'C:/Users/jimzord12/Documents/GitHub/michi-guns/nextjs-todo-list-example/.agents/disabled_skills/reviewer-followthrough'
```

### Apply the reviewed documentation patch after acceptance and task setup

The patch edits only the six files listed above. The plan and `TODO.md` task/evidence will also be maintained as required by AgentForge.

```powershell
git apply --check '.local/housekeeping-2026-09-18/documentation-proposal.patch'
git apply '.local/housekeeping-2026-09-18/documentation-proposal.patch'
```
