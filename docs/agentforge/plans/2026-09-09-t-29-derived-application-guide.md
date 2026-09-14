# T-29 derived application guide plan

**Status:** Accepted within the owner's overnight authorization for the guide without a maintained example application.

**Goal:** Show which concrete files a derived app replaces and how it preserves and verifies shared foundations, including coordinated Neon retargeting.

**Spec and decisions:** [T-29](../../../TODO.md#t-29-publish-the-derived-application-extension-and-replacement-guide), [PRD](../../../.dwf/output/agent/PRD.md), [TD-026](../../../.dwf/decisions/TECHNICAL.md#td-026), TST-ENV-001 and TST-PIPELINE-001.

**Architecture:** One supporting guide under `docs/architecture/`, linked from the overview and documentation index. It references the existing module, data, migration and environment instructions rather than redefining them.

**Global constraints:** No new app, schema migration, provider abstraction, shared-config refactor or live target mutation. The full T-29 dependency gate remains pending hosted pipeline completion.

## Current state and file map

Todo domain/use cases/repositories/presentation live in `src/modules/lists` and `src/modules/tasks`; dashboard UI lives in `components/dashboard` and routes compose it. Auth/mail and CMS already have boundaries. Seeds exist separately for Local, Development, Preview and Playwright.

Neon project identity is defined in `scripts/neon-development/constants.ts`, enforced by `core.ts`, inherited by Preview constants and repeated in the manual workflow. Environment values alone cannot retarget these commands. The guide must identify that coordinated change and the negative tests a fork retains.

## Dependencies and work order

The read-only source and accepted environment docs suffice. Write a retain/replace table, ordered adaptation checklist, Neon retarget map and a small verification example. Check every file link and command shape, format and obtain independent review. Hosted Preview/release proof is unavailable and stays a derived app's required boundary evidence after prerequisites are resolved.

## Verification strategy

Relative link/anchor check, source/command review, changed-file Prettier and diff checks. The adaptation example is instructional, not an executed fork or a claim that another application works. No new test contract is needed because the guide reuses the existing environment/pipeline safety obligations.

## Risks and assumptions

Renaming a database variable must not disable identity guards or silently select the original project. Applied migration history may already be shared; require the existing history-classification workflow before consolidation. Auth ownership/privacy tests must survive domain replacement. Never inherit synthetic seed credentials into a public Production account.

## Handoff to task breakdown

Complete the two explicit T-29 guide acceptances and their documentation checks. Keep the parent task conditional on the reviewed, proven delivery pipeline and do not create a maintained example application.
