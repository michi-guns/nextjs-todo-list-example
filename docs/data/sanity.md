---
status: active
owner: content-and-engineering
related-decisions:
  - D-008
  - TD-023
  - TD-018
---

# Sanity

Sanity is the CMS adapter for the public landing page.

This repository uses a dedicated Sanity project and dataset with one singleton landing document. Exact provider IDs, dataset naming, document type naming, and document ID remain setup choices.

## Suitable data

- Headline and blurb
- Primary and secondary CTA labels
- Future editorial marketing fields

## Integration rule

Fetch and validate Sanity documents in infrastructure, then map them to a landing view model. Raw GROQ and CMS document types must not cross into domain or application code.

## Freshness and delivery phases

Published landing reads use one stable cache identity. A signature-verified Sanity webhook automatically calls the server-only invalidation service for relevant published singleton changes. A separately authorized manual recovery mechanism calls that same idempotent service when automatic delivery or cache state needs intervention.

The webhook endpoint is `POST /api/sanity/webhook`. It requires the server-only `SANITY_REVALIDATE_SECRET` and the current `sanity-webhook-signature` produced by Sanity. Configure the Sanity document webhook to filter the published singleton (`_id == "landingPage" && _type == "landingPage"`) and project `_id` and `_type`; the application checks those identities again before invalidating the `landing-content` tag. The manual recovery endpoint is `POST /api/sanity/recover` and requires `Authorization: Bearer <SANITY_MANUAL_RECOVERY_SECRET>`. Neither secret is exposed to client bundles.

Local boundary tests exercise generated signed requests, invalid signatures, irrelevant and draft events, duplicate delivery, and manual authorization. A real deployed Sanity delivery remains release evidence for a deployment, not a substitute for these deterministic tests.

Authenticated Draft Mode, Sanity Presentation and Visual Editing, and Sanity Live provide draft reads, click-to-edit overlays, and live draft updates for authorized editors (T-28.1/T-28.2; real provider proof is T-28.3). They do not replace webhook invalidation for published traffic.

Draft Mode entry and exit exist since T-28.1: `GET /api/draft-mode/enable`
(Studio's Presentation preview URL) and `GET /api/draft-mode/disable`
(returns to `/`). Entry answers `404` unless
`NEXT_PUBLIC_SANITY_EDITORIAL_PREVIEW_ENABLED=true` and the server-only
`SANITY_API_READ_TOKEN` are configured for Local, Development or Production on
the `production` dataset; Preview deployments are refused. The Studio-issued
secret is validated by `next-sanity`'s native helper (one-hour secret TTL). See
the [evidence](../agentforge/evidence/2026-09-25-preview-authorization.md).

With the capability enabled, the embedded Studio gains the Presentation tool
(same-origin only, shared access disabled) that frames `/` and maps the
`landingPage` singleton to it. In an authorized Draft Mode session the landing
page reads the draft through `defineLive`, validates it like published content,
refreshes on draft changes (`SanityLive includeDrafts`), shows click-to-edit
overlays for the headline, blurb and both CTAs, and shows an "Exit preview"
banner. Everyone else gets the published page with none of this. See the
[composition evidence](../agentforge/evidence/2026-09-25-studio-preview.md).

<a id="editorial-preview-setup"></a>

### Editorial preview setup

Editorial preview stays off until an operator enables it for Local,
Development or Production (never Preview). Keep the token out of chat, logs,
commits and command examples.

1. In Sanity Manage, create an API token with the **Viewer** role for the
   dedicated project. Never use an Editor or write token.
2. In Sanity Manage, allow the exact application origin under **API → CORS
   origins** with credentials (for example `http://localhost:3000` locally).
3. Set `NEXT_PUBLIC_SANITY_EDITORIAL_PREVIEW_ENABLED=true` and the server-only
   `SANITY_API_READ_TOKEN` for the profile, with
   `NEXT_PUBLIC_SANITY_DATASET=production`. Production takes them from the
   protected GitHub `production` Environment (variable and secret); see the
   [environment profiles](../runbooks/environment-profiles.md).
4. Restart or redeploy. The flag is read at build time by the Studio.
5. Open `/studio`, choose **Presentation**, confirm the landing page loads
   in Draft Mode (the "Draft preview" banner shows), edit an unpublished
   field and watch it refresh, then click a field to open it in the editor.
6. In a separate browser without Studio access, confirm `/` shows published
   content only.
7. Use **Exit preview** to leave Draft Mode.

Lifetimes, as installed: a Studio-issued preview secret is valid for one
hour, and Next's Draft Mode cookie has no expiry, so it lasts until the
browser session ends or the editor exits. Removing an editor's Sanity access
stops them issuing new secrets, but an already issued secret and an open
Draft Mode session keep working; revoking the Viewer token stops draft reads
for every session until a new token is deployed. There is no immediate
per-editor revocation.

## Verification

Use local fixtures to test unknown-payload validation, view-model mapping, optional fields, and missing or invalid required-content failures. Boundary tests cover webhook signatures and relevance, duplicate delivery, manual authorization, and shared invalidation behavior. Local acceptance may submit generated signed requests directly; deployed release evidence additionally requires one real Sanity webhook delivery. Routine Playwright uses deterministic test-only landing content through the application-facing contract and does not call Sanity. That source is unavailable in deployed runtime modes and cannot become a production fallback.

Before starter-baseline completion and before a deployment counts as release evidence, run one separate read-only smoke against the dedicated project and dataset. It fetches the published singleton through the real client and query, validates it, and maps it to the landing view model. Missing configuration or content and query, validation, or mapping failures fail clearly; the smoke never creates or edits content.

## Not authoritative for

Users, sessions, lists, tasks, ownership, task status, or any transactional history.

Live draft preview and visual editing are deferred until after the webhook and manual-recovery baseline.
