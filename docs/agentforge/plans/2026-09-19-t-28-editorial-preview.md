# Sanity editorial preview implementation plan

> AgentForge plan. Use `task-breakdown` after the consolidated approach is accepted. This document does not finalize the TODO queue.

**Status:** Proposed implementation approach. The owner accepted next-cycle scope and its editorial-session exception on 2026-09-19; implementation remains future work.

**Goal:** Existing Sanity editors preview unpublished landing changes, see live updates, click through to the corresponding Studio field, and exit to published content.

**Spec and decisions:** [D-013](../../../.dwf/decisions/PRODUCT.md#d-013), [TD-034](../../../.dwf/decisions/TECHNICAL.md#td-034), [Agent PRD](../../../.dwf/output/agent/PRD.md#54-editorial-publishing-and-preview), [SPEC §6.4](../../../.dwf/output/agent/SPEC.md#editorial-draft-preview), [TST-LANDING-004](../../../.dwf/decisions/TESTING.md#tst-landing-004), and [T-28](../../../TODO.md#t-28-add-sanity-authenticated-preview-and-live-authoring).

**Architecture:** Add an authorized editorial branch to the existing landing composition. Retain its published reader and invalidation service. Use the installed Sanity preview handshake, a read-only Viewer token, Sanity Live, and preview-only field attributes over the existing plain landing model.

**Global constraints:** No application administrator role, alternate dataset mapping, CMS runtime writes, dependency upgrade, Cache Components migration, public Live subscription or new revalidation service. Planning performs no provider, content or deployment operation. The [account plan](2026-09-19-t-27-account-recovery.md) was prepared first; this plan follows it without creating an implementation dependency between their unrelated features.

## Current state and file map

| Current file                                                                                              | Responsibility and intended change                                                                                                            |
| --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/page.tsx`                                                                                            | Node/dynamic landing route; select published or authorized editorial composition, mounting preview controls only here.                        |
| `src/modules/landing/infrastructure/sanity-landing-reader.ts`                                             | Existing published reader and local Playwright fixture; keep its published contract.                                                          |
| `src/modules/landing/infrastructure/sanity-landing-source.ts`                                             | Published client fetch with `revalidate:false` and `landing-content` tag; preserve.                                                           |
| `src/modules/landing/infrastructure/sanity-landing-repository.ts`                                         | Singleton query and unknown-payload validation/mapping; reuse for clean preview data.                                                         |
| `src/modules/landing/domain/landing-content.ts`; application read port                                    | Plain four-field view model and published repository port; no provider metadata or misleading draft implementation behind a published method. |
| `src/sanity/config.ts`; `client-factory.ts`; `client.ts`                                                  | Public identity, Node-safe published client constructor, server-only client; preserve smoke compatibility.                                    |
| `sanity.config.ts`; `sanity/env.ts`; `sanity/structure.ts`                                                | Embedded Studio and singleton structure; add the conditional Presentation plugin and root-page resolvers.                                     |
| `app/studio/[[...tool]]/page.tsx`                                                                         | Existing embedded Studio; keep Live/VisualEditing out of its shared root layout.                                                              |
| `components/landing/landing-page.tsx`                                                                     | Render optional preview field attributes alongside the existing clean content.                                                                |
| `sanity/lib/client.ts`; `sanity/lib/live.ts`                                                              | Unused scaffold, not the application read path; do not silently switch the app onto it or perform unrelated deletion.                         |
| `src/modules/landing/infrastructure/sanity-invalidation.ts`; presentation handler; webhook/recover routes | Existing shared `revalidateTag("landing-content", {expire:0})` service and protected boundaries; retain.                                      |

Add these focused owners:

| Planned file                                                          | Responsibility                                                                                                                                |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/sanity/preview-config.ts`                                        | Small Node-safe configuration parser shared by runtime and environment tooling; enablement/profile/dataset/token validation with safe output. |
| `src/sanity/preview.ts`                                               | Server-only composition of the Viewer client and `defineLive`; initialize only for an enabled editorial request.                              |
| `src/modules/landing/infrastructure/sanity-landing-preview-reader.ts` | Preview fetch and existing unknown-payload mapping; no raw document leaves this module.                                                       |
| `src/modules/landing/presentation/sanity-preview.ts`                  | Plain strings for the four editable field attributes, constructed from fixed singleton metadata.                                              |
| `sanity/presentation.ts`                                              | Root-page document/location resolvers and same-origin Presentation configuration, with no secret imports.                                     |
| `app/api/draft-mode/enable/route.ts`; `disable/route.ts`              | Environment guard plus supported enable helper; explicit exit to `/`.                                                                         |
| `components/landing/exit-preview.tsx`                                 | Small exit control; optional Presentation-aware visibility through the supported hook.                                                        |

Environment plumbing belongs in `scripts/environment/core.ts`, its safe projection/tests,
`scripts/deploy/production/runtime.ts`, its tests and `.github/workflows/deploy-production.yml`.
Preview refusal/omission belongs in its existing environment and adapter tests.
Update `docs/data/sanity.md`, environment-profile and Sanity failure runbooks with verified configuration/recovery commands.

## Supported integration and boundaries

### Environment capability and Studio guard

Propose `NEXT_PUBLIC_SANITY_EDITORIAL_PREVIEW_ENABLED` as a non-secret boolean
display/capability flag and `SANITY_API_READ_TOKEN` as the private Viewer token.
Default the flag to false. Parse exact accepted boolean values; refuse enabled
configuration with an unknown profile, wrong dataset or missing token.

The server requires `APP_ENV` in `local`, `development`, or `production`, the
existing `production` dataset, enablement and the Viewer token. The route also
requires successful framework preview authorization. A public flag alone is
never authorization. Published reads must not import an eagerly failing token
module; disabled capability needs no preview token, including ordinary CI builds.

The browser-owned Studio config reads only the public flag and public dataset
name. It adds Presentation only when the flag is true and dataset is
`production`; it imports neither server configuration nor a token. Server
guards independently reject `APP_ENV=preview` even with a forged/misconfigured
flag. The Preview workflow/adapter fix the flag false and omit the token.
This disables the added editorial capability without broadening the task into
a redesign of existing Studio sign-in or Sanity permissions.

Production's protected GitHub Environment supplies the flag as a variable and
the token as a secret. Reuse the adapter's current `--env KEY=value` and
`--build-env KEY=value` forwarding; this transport is not argument-free.
`runReleaseProcess` captures output without a shell and replaces failures with
a generic error because arguments/stderr can contain secrets. Preserve and
test that boundary on the protected runner; no deployment transport rewrite
is proposed. Inspection reports enablement/token presence only. Local/Development
retain private local configuration. No token goes in `NEXT_PUBLIC_`, committed
files, displayed command examples or diagnostic output.

### Studio and preview entry/exit

Use these installed public imports and configuration shapes:

```ts
import {
  defineDocuments,
  defineLocations,
  presentationTool,
} from "sanity/presentation"

presentationTool({
  previewUrl: {
    initial: "/",
    previewMode: { enable: "/api/draft-mode/enable", shareAccess: false },
  },
  allowOrigins: ({ origin }) => [origin],
  resolve: {
    mainDocuments: defineDocuments([
      { route: "/", filter: '_id == "landingPage" && _type == "landingPage"' },
    ]),
    locations: {
      landingPage: defineLocations({
        locations: [{ title: "Landing page", href: "/" }],
      }),
    },
  },
})
```

The Studio and frontend share an origin; retain that narrow trust model.
Sanity CORS must allow the demonstrated origin. A hosted target's protection
or framing restriction is a concrete prerequisite, not permission to add a bypass.

The enable handler imports `defineEnableDraftMode` from `next-sanity/draft-mode`
and delegates to `defineEnableDraftMode({client: viewerClient}).GET(request)`
after its profile/configuration guard. Before calling the helper, quietly
reject an absent secret and malformed `sanity-preview-pathname` URL syntax.
Use a narrow `URL` syntax check with a fixed local base; leave authorization
and relative redirect normalization to the helper. The installed dependency's
development parse-error diagnostic otherwise prints the request URL even when
a secret is present. Do not log the rejected URL, error input or client.
Preserve the helper's validation, relative redirect normalization, async cookie
handling and supported secure/partitioned-cookie behavior. Do not catch and
convert Next.js's successful redirect into an integration failure.

The disable handler uses `await draftMode()` from `next/headers`, calls
`disable()`, then `redirect("/")` from `next/navigation`. An ordinary anchor
or `Link prefetch={false}` triggers exit without speculative prefetch. The
installed Studio `previewMode.disable` option is deprecated and not invoked;
an explicit control is required. Any remaining perspective cookie conveys no
access when Draft Mode is off. Test the actual same-origin exit lifecycle.

### Read authorization and credential lifetime

Studio creates the secret with the editor's existing Sanity permission.
Viewer validation only reads it; the helper checks bearer-secret possession,
not Better Auth or current editor membership on every request.

Installed private secrets expire after one hour. The Draft Mode browser session
has its own lifecycle and may outlive that secret. Studio membership removal
does not immediately revoke an issued session or an extracted Viewer token.
Document exit behavior and token revocation/rotation accurately, including its
shared scope; do not add a custom editor-session service or promise per-editor
revocation. Shared-access secrets lack that private-secret TTL. Disable sharing
and verify no earlier active shared secret before hosted acceptance; hiding the
Studio sharing control alone does not change what the helper validates.

### Draft reader, Live and editing metadata

In the server-only preview composition, use the following supported APIs:

```ts
import { defineLive } from "next-sanity/live"
import { VisualEditing } from "next-sanity/visual-editing"

const { sanityFetch, SanityLive } = defineLive({
  client: viewerClient,
  serverToken: viewerToken,
  browserToken: viewerToken,
})
// Within the server-authorized landing preview branch:
const { data } = await sanityFetch({ query: LANDING_PAGE_QUERY, stega: false })
// Validate/map data in landing infrastructure, then render clean content.
// Render <SanityLive includeDrafts action="refresh" /> and <VisualEditing />.
```

The helper resolves the Studio perspective cookie inside authorized Draft Mode,
preserving draft/published selection. Its `drafts` default normalizes the ID to
`landingPage`; reuse the query/mapper without raw-ID or release/variant features.

Keep `stega:false` and generate four preview-only `data-sanity` values using
`createDataAttribute` from `next-sanity`. For each fixed field, use
`createDataAttribute({id:"landingPage", type:"landingPage", path:field,
baseUrl:"/studio"}).toString()`. Pass optional attribute strings separately
from `LandingContent`; no Sanity types or raw document enter domain/application
code. This also lets the optional CTA's fallback text point to its source field.
Public markup gets no editing attributes. Clean strings retain current Zod
validation without invisible stega metadata changing blank-string semantics.

Only server-confirmed allowed Draft Mode mounts Live/VisualEditing on the landing;
exclude root `app/layout.tsx` and `/studio`. The Viewer browser token in this
authorized response is intended; write credentials and an unproven
`browserToken:false` refresh shortcut are excluded.

Next bypasses the Data Cache in Draft Mode; preserve this and separate the draft
reader from the public cache tag. `action="refresh"` refreshes only the editor.
Keep the existing webhook filter and invalidation service without a Sanity
Function, generic tag endpoint or Cache Components migration.

## Dependencies and work order

Group work into configuration/authorization, landing/Studio composition and
verification/documentation. Establish refusal/token boundaries before the UI;
prove real behavior before closeout while preserving published-path evidence.

- Required to implement: existing installed dependencies/source, accepted
  decisions and this plan's acceptance followed by task breakdown. No new
  database schema, packages or provider resources are required.
- Required for local automated runtime proof: the existing browser harness,
  its disposable PostgreSQL prerequisites and matching browsers. Keep ordinary
  tests provider-independent; do not weaken the production fixture guard.
- Required only for real Studio/hosted proof: an allowed target with Viewer
  credentials, existing authorized editor access, configured exact origins/CORS,
  disabled sharing and authorization for the demonstrated draft edit. Missing
  prerequisites leave that evidence explicitly outstanding.
- Required only for Production activation: protected configuration and normal
  release approval/exact-ref gates. This plan performs neither provisioning
  nor deployment, and it does not authorize content cleanup or publishing.

## Verification strategy

`TST-LANDING-004` owns new evidence; preserve `TST-LANDING-001`–`003` statuses
and their recorded scope. Exercise `TST-ENV-001`, `TST-PREVIEW-001` and
`TST-RELEASE-001` boundaries when environment/delivery wiring changes.

Use focused colocated tests for configuration, missing/invalid/expired secret
refusal and a present synthetic secret with malformed redirect syntax under
development mode. Prove those refusals never invoke the helper or print the
secret-bearing URL. Also cover safe redirects, token isolation, preview/public selection, clean
mapping and four field attributes. Verify disabled/missing credentials do not
break the public route/build; Preview refuses activation even with a true
display flag. Assert the Preview adapter never injects the token and Production
passes it only through its protected settings with redacted inspection.

Real browser proof uses separate editor and anonymous contexts. Through Studio,
make an authorized unpublished edit; observe automatic editor refresh, correct
field navigation and return to published content on exit. The anonymous context
must retain published content and receive no token, editing markup or draft
subscription. Record the intended dataset and relevant network/cache behavior
without token-bearing URLs, storage state or draft text in public evidence.

Keep `pnpm sanity:smoke` read-only. Existing fixture Playwright cannot prove
provider access, Live or overlays; obtain actual Studio/browser evidence. A
deployment presented as release evidence still needs the real signed webhook
delivery under `TST-LANDING-003`; this plan does not infer it from historical
deployment proof. Use the installed browser workflow and record failures and
unavailable prerequisites rather than substituting mocks for required proof.

Run focused tests, `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`,
changed-file Prettier and `git diff --check`; run `pnpm test:pipeline` for changed
environment/delivery behavior and affected browser journeys. Persistence tests
are needed only if harness/persistence behavior changes. Obtain fresh independent
review, repair actionable findings and reconcile evidence before completion.

## Risks, sources and handoff

Guard token leakage, public draft reads, stale sharing, incorrect Preview
activation and misleading fixture-only claims through the boundaries above.
No additional product or dataset choice is open within D-013/TD-034.

Grounding: Next **16.3.5** bundled Draft Mode docs/fetch source; next-sanity
**13.3.4** preview/live/visual-editing source/types; Sanity **6.15.0** Presentation
types; preview-url-secret **4.1.5**. Retain non-Cache-Components behavior and
recheck these surfaces if dependencies change before implementation.

Official references: [Next.js visual editing](https://www.sanity.io/docs/visual-editing/visual-editing-with-next-js-app-router),
[Presentation configuration](https://www.sanity.io/docs/visual-editing/configuring-the-presentation-tool),
[draft authorization](https://www.sanity.io/docs/visual-editing/implementing-draft-mode),
[Live integration](https://www.sanity.io/docs/nextjs/live-content-guide), and
[field attributes](https://www.sanity.io/docs/visual-editing/visual-editing-overlays).
Installed types take precedence over stale snippets, including deprecated
`previewMode.disable`, old `draftMode` configuration and removed Live props.

After approach acceptance, task breakdown should produce coherent verified
outcomes for the configuration/authorization seam, preview/Studio composition,
and evidence/runbook closeout. No final task sizing or TODO subtask sequence is
created here. Planning itself has no application or hosted verification claim.
