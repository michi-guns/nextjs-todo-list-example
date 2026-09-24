# T-28.1 editorial preview configuration and authorization evidence

The owner's instruction of 2026-09-24 authorizes this local review unit under
the [editorial preview plan](../plans/2026-09-19-t-28-editorial-preview.md)
and [T-28.1](../../../TODO.md#t-281). No Sanity credential, dataset, Studio,
CORS setting, GitHub Environment or deployment was used or changed; real
Studio and hosted proof is T-28.3.

## Preflight

Clean `main` at `57f0c56` (main CI passed) before creating
`codex/t-28.1-preview-authorization`. Installed sources read: `next-sanity`
13.3.4 `draft-mode` (`defineEnableDraftMode`), `@sanity/preview-url-secret`
(`parsePreviewUrl` logs the whole request URL in development when it cannot
parse it; `validateSecret` looks the secret up with a one-hour
`dateTime(now()) - 3600` filter) and Next 16.3.5's `draftMode` and
`unstable_rethrow` guides. No new package was added.

## Delivered behavior

- `src/sanity/preview-config.ts`: `NEXT_PUBLIC_SANITY_EDITORIAL_PREVIEW_ENABLED`
  (public flag, off unless exactly `true`) and `SANITY_API_READ_TOKEN`
  (private Viewer token). Enabled only for Local, Development and Production
  on the `production` dataset with a token. Refused: an unprofiled run, any
  other dataset, a missing token, an unknown flag value, and on Preview both
  the flag and the token. Errors name the variable, never the value.
- The runtime gate (`parseRuntimeEnvironment`) and the environment tooling
  (`parseEnvironmentProfile`) carry `editorialPreview`; safe inspection shows
  only `editorialPreviewEnabled` and `secrets.sanityViewer`.
- `src/sanity/draft-mode.ts` and `app/api/draft-mode/{enable,disable}`:
  - Entry answers `404` unless preview is enabled for this profile. A forged
    flag or token on Preview makes the runtime profile refuse to start; the
    handler alone would also answer `404`.
  - A missing or blank secret or a malformed `sanity-preview-pathname`
    answers `401` before the helper runs, so its development log never sees
    the secret.
  - Everything else is the native helper: secret validation (unknown or
    expired gives `401`), Draft Mode cookies and the relative redirect.
    Next's redirect passes through (`unstable_rethrow`); any other failure is
    a quiet `503` with no request detail.
  - Exit turns Draft Mode off and redirects to `/`.
- Delivery: the Preview adapter sets the flag to `false` and never forwards
  a token (a Preview profile given either is refused). The Production adapter
  forwards the flag, and the token only when enabled, from the protected
  Environment (`vars.NEXT_PUBLIC_SANITY_EDITORIAL_PREVIEW_ENABLED`,
  `secrets.SANITY_API_READ_TOKEN`), at build and runtime like its other
  settings.
- `vitest.config.ts` processes `next-sanity` through Vitest so the route tests
  can stand in for `next/headers` under the real helper.

## Checks

| Command                                                                    | Result                                     |
| -------------------------------------------------------------------------- | ------------------------------------------ |
| `pnpm exec vitest run src/sanity src/modules/landing src/test/environment` | 12 files, 146 tests passed                 |
| `pnpm test:pipeline`                                                       | 17 files, 275 tests passed                 |
| `pnpm test`                                                                | 74 files, 719 tests passed                 |
| `pnpm test:e2e`                                                            | 16 Chromium journeys passed                |
| `pnpm test:e2e` with the Sanity public variables cleared (as in CI)        | 16 passed                                  |
| `pnpm typecheck`, `pnpm build`                                             | Passed; build lists both Draft Mode routes |
| `pnpm lint`                                                                | Passed; only the existing `Geist` warning  |
| Changed-file Prettier, `git diff --check`                                  | Passed                                     |

### Boundary evidence

- Route tests run the real `defineEnableDraftMode` against a loopback Sanity
  API: an unknown secret gets `401` with no cookie, and the captured lookup
  carries the one-hour expiry filter; a valid secret enables Draft Mode, sets
  `__prerender_bypass` and redirects to the relative path only
  (`https://evil.example/landing?x=1` becomes `/landing?x=1`).
- In development mode, missing, blank and malformed requests answer `401`
  without creating the Viewer client and without any console output; a
  secret and token sentinel never appear in responses or logs.
- In the running Next server (preview disabled, the harness default), entry
  answers `404` with no Draft Mode cookie, and exit lands on the published
  landing page.

## Limits

Real Studio authorization, live updates, overlays and hosted activation are
T-28.2/T-28.3. As the review of T-27.3 noted, `next dev` prints incoming
request URLs to the developer's own terminal, which includes a preview secret
on entry; the harness does not print server output, and `next start` does not
log requests.

## Contract reconciliation

`TST-LANDING-004` moves from `specified` to `partial` for its boundary
portion. `TST-ENV-001`, `TST-PREVIEW-001`, `TST-RELEASE-001` and published
landing contracts pass unchanged.

**Operational consequence:** none now. The capability stays off in every
environment until the owner provisions the Production variable and Viewer
token (T-28.3).

## Review

Pending a fresh exact-tip independent review before merge.
