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

Authenticated Draft Mode, Sanity Presentation and Visual Editing, and Sanity Live are an accepted later phase. They will provide draft reads, click-to-edit overlays, and live draft updates for authorized editors. They do not replace webhook invalidation for published traffic.

## Verification

Use local fixtures to test unknown-payload validation, view-model mapping, optional fields, and missing or invalid required-content failures. Boundary tests cover webhook signatures and relevance, duplicate delivery, manual authorization, and shared invalidation behavior. Local acceptance may submit generated signed requests directly; deployed release evidence additionally requires one real Sanity webhook delivery. Routine Playwright uses deterministic test-only landing content through the application-facing contract and does not call Sanity. That source is unavailable in deployed runtime modes and cannot become a production fallback.

Before starter-baseline completion and before a deployment counts as release evidence, run one separate read-only smoke against the dedicated project and dataset. It fetches the published singleton through the real client and query, validates it, and maps it to the landing view model. Missing configuration or content and query, validation, or mapping failures fail clearly; the smoke never creates or edits content.

## Not authoritative for

Users, sessions, lists, tasks, ownership, task status, or any transactional history.

Live draft preview and visual editing are deferred until after the webhook and manual-recovery baseline.
