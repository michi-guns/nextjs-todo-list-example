# T-23 Production release evidence

Date: 2026-09-16. This records real Production operations and their observed
results. Local checks and independent implementation review are recorded in
the [implementation evidence](2026-09-16-production-release-implementation.md).

## Authorization and revision

The owner explicitly approved release of
`d639dfeeeca2932606c652cf5305ca3e0cd87a89`, the two reviewed migrations on the
previously empty Production database, agent approval of the protected job,
one controlled magic-link journey to the owner's Gmail, and an identical-content
republish of Sanity `landingPage` to exercise its signed webhook.

[PR #38](https://github.com/michi-guns/nextjs-todo-list-example/pull/38) merged
the independently approved implementation. Its merge tree equals reviewed
commit `7c9f1a923467389e9bd59a64117b440df2b1e701`. Exact main-push CI
[35111932584](https://github.com/michi-guns/nextjs-todo-list-example/actions/runs/35111932584)
passed Quality and Harness before release.

## First protected release

Command:

```sh
gh workflow run deploy-production.yml --ref main \
  -f ref=d639dfeeeca2932606c652cf5305ca3e0cd87a89 \
  -F rollback-compatible=true
```

[Run 35112456687](https://github.com/michi-guns/nextjs-todo-list-example/actions/runs/35112456687)
waited for GitHub Environment `production`, id `21297499656`. The agent approved
it under the owner's explicit delegation, without administrator bypass.
GitHub deployment id is `6483879503`.

The safe artifact reports `succeeded` for preflight, migration, deployment and
smoke, from `2026-09-16T15:02:57.589Z` to `2026-09-16T15:03:51.654Z`.

- Neon project `jolly-dew-32309276`, branch `br-purple-sea-a53v962l` / `main`,
  database `neondb` received the reviewed forward migration chain through its
  direct endpoint. No seed or reset ran.
- Vercel deployment `dpl_5TqabFbNNZ6y9gL7qkL4LgH5cGCF` reached READY Production
  on project `prj_v45MdKyM0g9PVTXUQB1PznfgyMI6`, with the exact approved commit
  metadata and canonical alias `nextjs-todo-list-example.vercel.app`.
- The runner verified landing/sign-in HTTP 200, anonymous session HTTP 200
  with `null`, private lists HTTP 401, and the real Sanity read/validation path.
- The prior deployment `dpl_GRpcAgtr9BZ7QcsUNHX259WAvLin` is recorded as a
  schema-independent static maintenance fallback. It is not a previous working
  application. No rollback or database down-migration was attempted.

A subsequent `BEGIN READ ONLY` catalog inspection found exactly `account`,
`lists`, `session`, `tasks`, `users`, and `verification`, plus two entries in
`drizzle.__drizzle_migrations`. It did not inspect account records or tokens.

## Real Sanity webhook

An optimistic-concurrency patch set the published singleton's headline to its
existing value. The complete content hash, excluding revision/update metadata,
remained `f8c69e8686b920ea6f8c750db4f8163ca5c4d3baec5330aff27bec2b12f4347e`.
Revision changed from `RPB9O31CsK2kNfM1d6loze` to `vwEX4HmEqiRBvtkw178dF0`.

Sanity hook `2rW5R84M7YqsOaw7` delivered attempt
`atm-3JPmRI2RJHyFNpC93aLuz4p6vMT` at `2026-09-16T15:04:23.710Z` to the canonical
Production webhook route. The provider reports HTTP `200`, `isFailure: false`.
This is actual provider delivery, alongside the existing local signature,
relevance, duplicate and manual-recovery tests. No visible content was changed.

## Live authentication diagnosis

The first browser magic-link request returned HTTP 500 at
`2026-09-16T15:05:53.680Z`. Vercel logged the adapter's safe generic
`Resend auth email delivery failed`; Gmail had no matching message, and this
Resend account had no corresponding send log. The protected key's update date
was 2026-09-05, while the previously proven local key belonged to the expected
current account. A read-only Resend domain request using that existing local
key returned HTTP 200 and confirmed `auth.dim-stamatakis.dev` was verified
with sending enabled.

GitHub does not return secret values for comparison. The old credential's
precise failure cannot be established from the generic application error.
The existing verified key was securely supplied through stdin to update only
GitHub `production` secret `RESEND_API_KEY`; no key was created, logged or
committed. The same approved application revision was dispatched again in
[run 35114013699](https://github.com/michi-guns/nextjs-todo-list-example/actions/runs/35114013699),
and its protected job was approved under the same owner delegation. The
existing migration journal is preserved. The secret update metadata records
`2026-09-16T15:14:43Z`.

The first workflow's HTTP smoke did not include sending mail. Its successful
result must not be presented as successful deployed authentication.

## Successful repeat and browser journey

Run `35114013699` passed all four stages from `2026-09-16T15:16:46.525Z` to
`2026-09-16T15:17:39.098Z`. GitHub deployment `6484168487` produced Vercel
deployment `dpl_ERxkjWHpMbQakgKTVM81rPT5KuWf`. Independent provider inspection
confirmed READY, target `production`, the intended project and the same approved
SHA. Its rollback reference is the prior application deployment at that same
SHA; no schema changed between them. The migration journal still has exactly
two entries. The previous deployment retains its broken mail configuration,
so restoring it would require the same credential correction before mail can
be considered working.

The browser request after redeployment reached `Check your inbox`. The single
matching `Your sign-in link` message appeared in Gmail Inbox at 18:18 Athens
time. No manual folder move was made for this message. Opening its original
canonical-origin Better Auth URL established the owner's session and reached
`/dashboard`, displaying the initial empty `Inbox` list. Sign-out returned to
the public landing; a subsequent `/dashboard` navigation redirected to
`/sign-in?next=%2Fdashboard`. No synthetic tasks/lists, database seed, account
cleanup, or failure injection was performed. The owner's new account and its
default Inbox remain as the normal result of the approved authentication flow.

The only configuration repair between the failed and successful mail attempts
was the protected Resend key. This supports credential/configuration mismatch
as the cause, while the old key's precise provider error remains unknown. The
application code and mail security behavior were unchanged. One successful
Inbox receipt does not guarantee future deliverability.

The identical-content Sanity publish was repeated for the final deployment.
The content hash above remained unchanged; revision became
`R9kdRmSqLnbBvMEpinxMTt`. Provider attempt `atm-3JPoK9DYctGZPssOOuAIotTmau8`
at `2026-09-16T15:19:54.571Z` returned HTTP 200, `isFailure: false`.

## Durable records and contract reconciliation

The safe workflow artifacts are retained here because Actions artifacts expire:

- [First release record](t23-production-release-35112456687.json).
- [Final release record](t23-production-release-35114013699.json).

`TST-RELEASE-001` and `TST-LANDING-003` now have their required real deployed
evidence and are `verified`. Existing migration/auth/browser contracts retain
their verified local evidence, supplemented by the catalog and deployed
magic-link journey above. `TST-ENV-001` and `TST-PIPELINE-001` remain `partial`
pending T-24's final cross-environment evidence reconciliation. That task can
reuse the actual Preview lifecycle and this release; it must identify any
remaining required proof without injecting failures into Production.

The implementation's full checks remain valid because this closeout changes
only evidence and operational documentation. Independent review and hosted CI
gate the closeout PR. T-24 is now unblocked; final T-25/T-29 documentation still
depends on its review. T-26, broader T-27 and T-28 retain their product-scope
and prerequisite boundaries.
