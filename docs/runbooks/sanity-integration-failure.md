# Runbook: Sanity Integration Failure

## Trigger

The landing page cannot fetch, validate, or map the configured Sanity document.

## Impact

Public editorial content may be unavailable. Private PostgreSQL-backed todo behavior should remain independent.

## Procedure

1. Check the Sanity project, dataset, API version, and server environment variables.
2. Confirm the expected document exists and is published.
3. Inspect the GROQ query and validation error without exposing tokens.
4. Check `POST /api/sanity/webhook` delivery and signature-verification evidence without logging secrets.
5. If published content is valid but the cache is stale, call `POST /api/sanity/recover` with the protected `SANITY_MANUAL_RECOVERY_SECRET` and verify a fresh landing read.
6. Determine whether the failure is a provider outage, configuration issue, schema change, mapping bug, or invalidation failure.
7. Use the explicitly marked local fallback only while Sanity is not wired; do not fabricate transactional data.

## Editorial preview

Editorial preview only affects Studio editors; published traffic is
independent. See [editorial preview setup](../data/sanity.md#editorial-preview-setup).

| Symptom                                           | Meaning and action                                                                                                             |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| No **Presentation** tool in Studio                | The flag is not `true` at build time or the dataset is not `production`; fix the variable and rebuild.                         |
| `/api/draft-mode/enable` answers `404`            | Preview is disabled or refused for this profile (Preview deployments always refuse it).                                        |
| Entry answers `401`                               | The Studio secret is missing, expired (one hour) or malformed; reopen Presentation from Studio.                                |
| Entry answers `503`; `sanity.preview.unavailable` | The Viewer token or Sanity API failed; check the token is valid with the Viewer role, rotate it if needed, then redeploy.      |
| Preview shows an error instead of the draft       | The draft fails landing validation (event `landing.preview` failed); fix the draft in Studio. Published traffic is unaffected. |
| Overlays or live refresh missing                  | Check the origin is allowed under Sanity CORS with credentials and the page is inside Presentation or has Draft Mode on.       |

## Escalation

Record repeated failures in an ADR or update the data availability documentation if the recovery strategy changes.
