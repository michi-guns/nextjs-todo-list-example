# Deriving another application

This starter keeps one accepted stack while making the todo domain replaceable.
Start with your application's accepted requirements, then use the existing
[module structure](module-structure.md) and [dependency rules](dependency-rules.md).
Keep [DWF](../../.dwf/README.md) as the design authority for the derived project.

## Retain and replace

| Area                  | Replace or adapt                                                                                                                           | Retain and verify                                                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Todo behavior         | `src/modules/lists/`, `src/modules/tasks/`, their routes under `app/api/` and presentation adapters                                        | Ownership checks, validated inputs, error mapping, pagination rules required by the new domain; keep framework/provider code out of domain and application layers     |
| UI                    | `components/dashboard/`, dashboard composition under `app/(app)/`, branding and public copy                                                | Accessible labels, keyboard/focus behavior, loading/error feedback and auth gating; update browser assertions to the new accepted UI                                  |
| Schema and migrations | `db/schema/lists.ts`, `db/schema/tasks.ts`, related exports and generated migrations                                                       | Shared `db/db.ts`, Better Auth schema and migration discipline; classify existing history before changing it                                                          |
| Seed data             | `scripts/local-postgres/seed.ts`, `scripts/neon-development/seed.ts`, `scripts/deploy/preview/seed.ts`, `scripts/playwright-local/seed.ts` | Disposable-test guards, deterministic browser scenarios and environment-specific seed ownership; no public Production seed credentials                                |
| Auth and mail         | Auth UI/copy, origins and protected sender settings                                                                                        | Better Auth adapter/session/token lifecycle in `lib/auth.ts`, `deliverAuthEmail` selection, local mailbox restrictions and [mail readiness](../runbooks/auth-mail.md) |
| CMS                   | `src/modules/landing/`, `src/sanity/` schemas and published landing data                                                                   | Validated read/invalidation boundary, read-only non-Production policy and [data ownership](../data/ownership.md); PostgreSQL remains transactional truth              |
| Environment identity  | Application origins, Neon/Vercel/Sanity project identities and protected settings                                                          | [Profile validation](../runbooks/environment-profiles.md), pooled/runtime versus direct/migration roles, non-default branch and cross-target refusal                  |
| Delivery and tests    | Provider configuration in manual workflows, domain smoke assertions and fixtures                                                           | CI's no-deployment boundary, immutable-ref checks, scoped cleanup and local Testcontainers; a fork must establish its own hosted evidence                             |

Do not mechanically rename every occurrence of “task” or “list”. Some are
framework terminology or migration history. Replace one accepted behavior at a
time and keep the tests that protect shared foundations.

## Ordered adaptation

1. Record the new domain, permissions and acceptance in the derived project's
   DWF. Use AgentForge planning and TODO before implementation.
2. Map one complete user journey to its domain/application/presentation,
   repository, schema and UI files. Keep auth identity and ownership explicit.
3. Classify migration history with the
   [migration-history workflow](../../.agents/skills/migration-history-workflow/SKILL.md).
   Shared/applied history needs forward migrations. A safely disposable,
   pre-release history may be consolidated only under that workflow.
4. Update each affected seed and fixture deliberately. Local, hosted
   Development, controlled Preview and browser scenarios have different roles.
5. Set the new origins, CMS identity and mail settings. Retarget Neon and
   delivery together as described below. Never copy `.env.local` secrets.
6. Prove local behavior and negative target guards, then obtain the separately
   required hosted Preview and protected release evidence for the new project.

## Coordinated Neon retargeting

Setting `DATABASE_PROJECT_ID` or replacing a URL alone is insufficient. The
delivery tooling intentionally pins the allowed project and branch family.

| Location                                                                               | Coordinated responsibility                                                                                                                            |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`scripts/neon-development/constants.ts`](../../scripts/neon-development/constants.ts) | Set the new Development project identity, branch and parent policy deliberately                                                                       |
| [`scripts/neon-development/core.ts`](../../scripts/neon-development/core.ts)           | Inspect the comparisons and provider observations that enforce those constants; preserve refusal rather than weakening it to accept arbitrary targets |
| [`scripts/deploy/preview/constants.ts`](../../scripts/deploy/preview/constants.ts)     | Inherits project and durable parent from Development; keep the `preview-` identity and expiry policy coherent                                         |
| [`.github/workflows/deploy-preview.yml`](../../.github/workflows/deploy-preview.yml)   | Coordinate its repeated `DATABASE_PROJECT_ID` and the GitHub Preview environment's Neon/Vercel secrets and Sanity variable                            |
| Local/profile settings and supporting docs                                             | Match project, branch, pooled/direct endpoints and approved origin; update example identities and tests that intentionally assert them                |

Search for the old project ID before and after editing:

```powershell
rg -n 'curly-dust-60603928' scripts .github docs README.md .dwf
```

Historical evidence may retain the old ID when clearly labelled; runnable
configuration and current instructions must agree on the new identity. Do not
rewrite past evidence to make it appear that the new target was tested.

Before any migration, perform a provider identity inspection and correlate the
new project, non-default durable Development branch and direct endpoint. The
current script form is `pnpm neon:development inspect` after configuring the
new profile. Preserve tests that reject the old project, main/default branches,
pooled migration URLs and mismatched cleanup IDs. Run the existing suites:

```powershell
pnpm exec vitest run src/test/environment src/test/pipeline scripts/neon-development/core.test.ts scripts/deploy/preview/core.test.ts
```

This is a local guard check, not hosted proof. Consult the
[Preview delivery runbook](../runbooks/preview-delivery.md) before provisioning
or deploying a new Vercel project. Vercel assigns a new project's first
deployment to Production, and the Preview adapter refuses to run until a
Production deployment exists; bootstrap the project deliberately, as this
repository did with a placeholder page. Production remains a separately
provisioned protected target under TD-026.

## Adaptation smoke example

For a reading tracker, a small first journey could let a signed-in user create
a shelf and add a book. That example is illustrative; no separate application
is maintained or claimed to have been run here.

Replace the corresponding todo domain/UI assertions and deterministic fixtures,
then prove that one user can create/read/update their records and another user
cannot read or mutate them. Preserve signup verification, password sign-in,
magic-link and sign-out checks. Run:

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
```

The integration/browser commands use their own disposable local PostgreSQL
database. A passing local run does not establish the new provider identity,
sender domain, Preview lifecycle or Production release. Record those separately
under the existing [testing contracts](../../.dwf/decisions/TESTING.md), with
actual target/ref/smoke/cleanup evidence and no secrets.
