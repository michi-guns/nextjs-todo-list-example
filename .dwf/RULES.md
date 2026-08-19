# Project Rules

Mandatory project-specific constraints. Framework rules live in [`.framework/PROTOCOL.md`](.framework/PROTOCOL.md) and its Skills; this file contains only this repository's constraints.

<a id="rule-001"></a>

## RULE-001 — Standalone public starter and reference implementation

Keep this repository a standalone public, opinionated Next.js starter implemented through a complete todo reference application. Do not invent links to unrelated or private products.

<a id="rule-002"></a>

## RULE-002 — Intentionally small, replaceable reference domain

Keep this repository's reference domain to authenticated personal lists and tasks plus editorial landing content. Do not introduce teams, organizations, shared lists, or a parallel tenant model without an explicit Product Decision. These limits scope the todo reference, not applications derived from the starter.

<a id="rule-003"></a>

## RULE-003 — PostgreSQL owns transactional truth

PostgreSQL/Drizzle owns Better Auth records, lists, tasks, ownership, status, timestamps, and relational integrity. Do not store todo data in Sanity or create a parallel user table outside the Better Auth adapter schema.

<a id="rule-004"></a>

## RULE-004 — Sanity owns landing editorial content only

Sanity may own editable landing headline, blurb, and CTA content. Todos never live in Sanity.

<a id="rule-005"></a>

## RULE-005 — Framework-independent domain

Keep domain rules independent of Next.js, React, Drizzle, Sanity, HTTP, and browser APIs.

<a id="rule-006"></a>

## RULE-006 — Validate and isolate untrusted boundaries

Validate untrusted server inputs with Zod. Keep framework/provider details behind infrastructure adapters. Server Actions and Route Handlers must share the authenticated application path.

<a id="rule-007"></a>

## RULE-007 — Prefer existing repository extension points

Do not reshape source code merely to mirror conceptual design nouns. Add structure only when a real responsibility or accepted technical contract requires it.

<a id="rule-008"></a>

## RULE-008 — Local quality baseline

Use pnpm. Preserve the repository's typecheck, lint, test, Playwright, Husky, and lint-staged conventions. CI is not required for starter-baseline completion unless a later decision adds it.

<a id="rule-009"></a>

## RULE-009 — Keep secrets out of the repository

Do not commit `.env*` values, tokens, credentials, or provider secrets.

<a id="rule-010"></a>

## RULE-010 — Preserve reusable, opinionated foundations

Keep cross-cutting foundations reusable beyond the todo domain, and keep todo-specific behavior inside its owning capabilities. A derived application should mainly replace or reshape domain and UI code. Prefer one well-supported path over configuration layers for interchangeable frameworks, databases, authentication systems, content platforms, or architectural styles.

<a id="rule-011"></a>

## RULE-011 — Maximize quality per implementation effort

Use current stable APIs, recommended practices, secure defaults, and production-minded failure handling. Choose the simplest implementation that is genuinely robust. Accept modest extra complexity when it clearly prevents meaningful rework or improves reusable safety, correctness, operability, or maintainability. Reject speculative abstractions, low-leverage polish, and time-heavy machinery whose value is not part of the accepted baseline.
