# Hosted Preview run, 2026-09-14

The owner authorized this free-tier run in the session after the identity
repairs were reviewed. It is the first hosted Preview that completed
migration, seed, deployment, identity verification and functional smoke.

## Request and resolution

- Dispatch: `deploy-preview.yml` on branch `task/T-22-hosted-preview-proof`,
  inputs `action=deploy`, `ref=1c8c38c7999347c7f2734b0a421be6bc86aab61b`,
  `preview-id=t22-20260914`.
- [Run 34840457016](https://github.com/michi-guns/nextjs-todo-list-example/actions/runs/34840457016)
  checked out that exact SHA; every step succeeded, cleanup step skipped by
  design (`action=deploy`).
- Pinned Neon 2.45.0 and Vercel 59.11.2 CLIs installed on the runner PATH.

## Redacted adapter output

```text
previewId=t22-20260914
commitSha=1c8c38c7999347c7f2734b0a421be6bc86aab61b
projectId=curly-dust-60603928
branch=preview-t22-20260914
branchId=br-cold-salad-ax3vzef7
expiresAt=2026-09-21T11:53:53Z
deploymentId=dpl_3ZrVwAZrNmuwuCionGvsxv5VM7aZ
url=https://nextjs-todo-list-example-clqsjul08-jimzords-projects.vercel.app
```

The preflight passed before any Neon operation: the project already carried
the placeholder Production deployment, so the run could not be assigned
Production. The adapter's HTTP smoke (landing, controlled-account sign-in,
list creation) passed inside the run.

## Independent verification outside the run

Performed from the owner's workstation with the logged-in Neon and Vercel CLIs
and a real Chromium session; no secrets recorded.

- Neon: `preview-t22-20260914` is non-default, parent `br-super-leaf-axfwoi2e`
  (durable Development), expiry `2026-09-21T11:53:53Z`.
- Vercel API, team-scoped: deployment `dpl_3ZrVwAZrNmuwuCionGvsxv5VM7aZ` is
  `readyState=READY`, `target=null` (Preview), project
  `prj_v45MdKyM0g9PVTXUQB1PznfgyMI6`, `meta.previewId=t22-20260914`,
  `meta.commitSha=1c8c38c7…`.
- Production untouched: `https://nextjs-todo-list-example.vercel.app` still
  serves the placeholder "Not released yet." page.
- Landing over HTTP: 200 with the Sanity `preview` dataset headline
  "Make progress visible.".
- Controlled-account sign-in over HTTP: 200.
- Real browser (Playwright Chromium 1280×800): landing → `/sign-in` with the
  seeded `preview-user@example.test` → `/dashboard` shows "Preview user", the
  Inbox heading, the seed task "Try the isolated Preview branch" and the
  "Preview smoke" list created by the run's HTTP smoke → created list
  "Browser smoke 2026-09-14T11:59" through the sidebar form; the page showed
  "Created list …" and the new list appeared. Screenshot retained by the
  owner; not committed.

## What this does and does not establish

- Establishes for `TST-PREVIEW-001`: branch isolation from Development,
  direct migration and seed on the temporary branch, explicit Preview target,
  identity traceability (exact SHA and Preview id in deployment metadata),
  functional smoke over HTTP and in a real browser, and a set expiry.
- Owner check: the owner opened the Preview, signed in with the controlled
  account and exercised list and task flows, and reported that everything
  worked before cleanup was requested.
- Not a Production release.

## Cleanup, 2026-09-14

- A first cleanup dispatch, [run 34845604489](https://github.com/michi-guns/nextjs-todo-list-example/actions/runs/34845604489),
  failed at `actions/checkout` because the operator passed the abbreviated
  SHA `f2283f4` as `ref`; the checkout action needs a branch, tag or full SHA.
  It stopped before installing tools and touched nothing.
- [Run 34845688852](https://github.com/michi-guns/nextjs-todo-list-example/actions/runs/34845688852)
  with the full SHA and `action=cleanup` succeeded: the `Cleanup preview`
  step deleted `preview-t22-20260914` through the identity guard. Afterwards
  `neonctl branches get preview-t22-20260914` reports not found and the
  project lists only `development` and `main`.
- The orphaned Vercel Preview deployment was removed with
  `vercel remove <deployment-url> --yes`; the project now lists only the
  Production placeholder, which still serves "Not released yet.".
