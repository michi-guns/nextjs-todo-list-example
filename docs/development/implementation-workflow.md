# Implementation Workflow

1. Read the documentation index and protocol.
2. Identify the owning module and current-state documents.
3. Check the product contract, assumptions, open questions, and related ADRs.
4. Read the affected `TST-*` contracts and decide which evidence is possible in the current slice.
5. For multi-step work, complete the AgentForge `planning` and `task-breakdown` phases before implementation.
6. Implement one thin vertical slice through domain, application, infrastructure, and presentation as needed.
7. Add focused tests using the required evidence layer; preserve blocked or future obligations explicitly.
8. Update documentation when behavior, architecture, or test design changes.
9. Reconcile the test-contract status and run the relevant quality gates, reporting skipped checks.
10. For a non-trivial task, spawn the independent closeout reviewer required by [`AGENTS.md`](../../AGENTS.md): a fresh sub-agent on this harness's most capable model, at Grok `high`, Codex or Claude Code `xhigh`, or the highest available effort on GLM, Kimi, Qwen, and similar harnesses.

Start with the smallest complete user journey rather than scaffolding abstractions for hypothetical features.
