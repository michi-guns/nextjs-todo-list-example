# Project Rules

Mandatory project-specific constraints. Framework rules live in [`.framework/PROTOCOL.md`](.framework/PROTOCOL.md) and its Skills; this file contains only this repository's constraints.

<a id="rule-001"></a>

## RULE-001 — Standalone public example

Keep this repository a standalone public example. Do not invent links to unrelated or private products.

<a id="rule-002"></a>

## RULE-002 — Intentionally small personal domain

Keep the domain to authenticated personal lists and tasks plus editorial landing content. Do not introduce teams, organizations, shared lists, or a parallel tenant model without an explicit Product Decision.

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

Use pnpm. Preserve the repository's typecheck, lint, test, Playwright, Husky, and lint-staged conventions. CI is not required for spike completion.

<a id="rule-009"></a>

## RULE-009 — Keep secrets out of the repository

Do not commit `.env*` values, tokens, credentials, or provider secrets.
