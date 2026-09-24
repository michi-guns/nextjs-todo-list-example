# T-28.2 Studio preview, Live and field navigation evidence

The owner's instruction of 2026-09-24 authorizes this local review unit under
the [editorial preview plan](../plans/2026-09-19-t-28-editorial-preview.md)
and [T-28.2](../../../TODO.md#t-282). No Sanity credential, dataset, Studio,
CORS setting, GitHub Environment or deployment was used or changed; real
Studio, Live and overlay proof is T-28.3.

## Preflight

Clean `main` at `a2b0818` (main CI passed) before creating
`codex/t-28.2-studio-preview`. Installed sources read: `next-sanity` 13.3.4
(`defineLive`, `next-sanity/visual-editing`, `createDataAttribute`),
`sanity` 6.15.0 `presentationTool` options (`previewUrl.previewMode`,
`allowOrigins`, `resolve.mainDocuments`, `resolve.locations`) and Next
16.3.5's `draftMode` guide. No new package was added. The app sets no framing
or CSP header, so the same-origin Studio can frame `/`.

## Delivered behavior

- Studio: `sanity/presentation.ts` adds `presentationTool` only when
  `NEXT_PUBLIC_SANITY_EDITORIAL_PREVIEW_ENABLED` is exactly `true` and the
  dataset is `production`; otherwise the Studio is unchanged. The options
  (`sanity/presentation-options.ts`) import no server module or token:
  - `previewUrl.initial` is `/`; Draft Mode entry is
    `/api/draft-mode/enable` with shared access disabled
    (`shareAccess: false`).
  - `allowOrigins` trusts only the Studio's own origin.
  - The singleton `landingPage` resolves to `/` in both directions.
- Landing page (`app/page.tsx`): a request is an editorial session only when
  Draft Mode is on **and** the capability is enabled for this profile
  (`isEditorialPreviewSession`). A leftover Draft Mode cookie on a disabled
  deployment still gets published content. The session:
  - reads the draft through `readLandingPreview`, which uses `defineLive`'s
    `sanityFetch` without stega and maps it through the published validator,
    so an invalid draft fails instead of rendering raw data (event
    `landing.preview`);
  - renders `SanityLive includeDrafts`, `VisualEditing` and an "Exit
    preview" banner;
  - adds four `data-sanity` field links (headline, blurb, both CTAs)
    pointing to the singleton in `/studio`.
- `src/sanity/preview.ts` (server-only) builds `defineLive` from the Viewer
  token, lazily imported by the preview branch only. The published path, its
  cache tag and webhook/manual recovery are untouched, so draft content never
  enters the published cache.
- Exit is a plain anchor to `/api/draft-mode/disable`, so nothing prefetches
  it; it turns Draft Mode off and returns to `/`.
- Deferred from the T-28.1 review:
  - The browser harness pins
    `NEXT_PUBLIC_SANITY_EDITORIAL_PREVIEW_ENABLED=false`, so a developer's
    `.env.local` cannot enable preview during Playwright.
  - The entry's quiet `503` now emits the fixed warning
    `sanity.preview.unavailable` (outcome only; no URL, secret, token or
    provider error), so an expired Viewer token is visible to operators.

## Checks

| Command                                                             | Result                                    |
| ------------------------------------------------------------------- | ----------------------------------------- |
| `pnpm exec vitest run src/sanity src/modules/landing`               | 10 files, 57 tests passed                 |
| `pnpm test`                                                         | 75 files, 727 tests passed                |
| `pnpm test:pipeline`                                                | 17 files, 275 tests passed                |
| `pnpm test:e2e`                                                     | 17 Chromium journeys passed               |
| `pnpm test:e2e` with the Sanity public variables cleared (as in CI) | 17 passed                                 |
| `pnpm typecheck`, `pnpm build`                                      | Passed                                    |
| `pnpm lint`                                                         | Passed; only the existing `Geist` warning |
| Changed-file Prettier, `git diff --check`                           | Passed                                    |

### Boundary evidence

- Markup: the public landing page renders no `data-sanity` attribute; the
  preview render carries exactly four, including the fallback "Sign in"
  label's field. An optional attribute is spread only when present, because
  an `undefined` prop on the client `Link` otherwise serialized
  `"data-sanity":"$undefined"` into public HTML.
- The running Next server's public `/` HTML contains the published headline
  and none of `data-sanity`, `/api/draft-mode/disable` or `includeDrafts`.
- Preview reader: fetches with `stega: false`, uses the singleton query and
  rejects an invalid draft through the published validator.
- Session selection: only Draft Mode plus enabled capability previews.
- Presentation options: same-origin trust, no shared access, singleton to
  `/`, and no token or secret anywhere in the options.
- Entry `503`: the route test asserts the fixed event fires and a failing
  diagnostics callback never replaces the quiet answer.

## Limits

These are local composition checks. Real Studio draft authorization, Live
refresh, overlay clicks opening the right field and exit inside Presentation
need the Viewer token, an editor and allowed CORS origins; they are T-28.3's
[hosted proof](../../data/sanity.md#editorial-preview-setup). The Viewer
token reaches the editor's browser by design (`defineLive`'s
`browserToken`), only inside an authorized Draft Mode session. The
`next dev` request log caveat from T-28.1 still applies to entry URLs.

## Contract reconciliation

`TST-LANDING-004` stays `partial`: this adds the local composition portion.
`TST-LANDING-001`–`003`, `TST-E2E-*` and `TST-ENV-001` pass unchanged.

**Operational consequence:** none now. The capability stays off in every
environment until the owner provisions the Production variable and Viewer
token (T-28.3).

## Review

Independent review (`f8a82a9`, opus, xhigh): approved, no blockers. It
reproduced 57 focused, 727 unit, 275 pipeline and 17 browser checks, the
build, typecheck and lint, and confirmed against installed sources that Draft
Mode bypasses Next's Data Cache (so drafts never reach the published cache),
that `defineLive` reads the `drafts` perspective from the cookie, and that
the Presentation options match `sanity` 6.15.0. Its should-fix is applied:
the logging catalogue now lists `landing.preview` and
`sanity.preview.unavailable`. Its setup nit is applied (the steps name the
required `APP_ENV`). Deferred as optional follow-ups: await
`logging.flush()` for the `503` event so serverless provider export is not
dropped; import the logger lazily so a broken profile keeps entry's quiet
`404` instead of `500` (the whole app already refuses that state); and a
page-level render test for Draft Mode on with the capability off.
