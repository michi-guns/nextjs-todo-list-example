# Controlled Preview attempt, 2026-09-09

T-22 remains incomplete. The owner authorized this free-tier run and cleanup.
No valid hosted Preview smoke was completed.

## Local repairs and checks

`e8385df` accepts pnpm 11's forwarded leading separator. Its three regression
cases failed before the repair. `2fa4775` installs pinned Neon 2.45.0 and Vercel
59.11.2 CLIs in an explicit runner-temporary PATH. Both checkpoints received
independent review before dispatch. The latest checkpoint passes 269 unit tests.
Typecheck and build passed at `e8385df`; the later change is workflow-only.
Changed-file lint and formatting passed. Full lint retains the existing unused
`Geist` warning. Local integration evidence is 23 passing tests.

## Hosted observations

- Runs `34290514707` and `34290873221` failed before resource creation, on the
  forwarded separator and missing CLI PATH respectively.
- [Run 34291342631](https://github.com/michi-guns/nextjs-todo-list-example/actions/runs/34291342631)
  checked out `2fa4775863fb96167179fc51cc94905fdf0909bd`.
- Neon project `curly-dust-60603928` created `preview-overnight-20260909`, branch
  `br-muddy-tree-ax7m9p22`, from durable `development`
  `br-super-leaf-axfwoi2e`. Expiry was `2026-09-15T23:36:31Z`.
  Direct migrations and controlled-account seed completed.
- Vercel created deployment `dpl_3QC5p6rDoBBToCZ4uB8zXKkekvK4` in project
  `prj_v45MdKyM0g9PVTXUQB1PznfgyMI6`. The API correlated the exact commit and
  Preview ID metadata but reported `target=production`. The application used
  the isolated Preview database and Preview configuration. No Production
  database was selected or mutated.
- The runner then failed in `vercel inspect` with `User not found`. This
  requires a team-scoped deployment lookup repair; successful deploy output
  alone does not establish Preview identity.
- No hosted browser or HTTP smoke was accepted as Preview evidence.

## Containment and remaining blocker

The scoped Vercel DELETE API returned `state=DELETED` for that deployment.
The subsequent project deployment listing returned zero deployments.
[Cleanup run 34291993986](https://github.com/michi-guns/nextjs-todo-list-example/actions/runs/34291993986)
completed successfully for only `overnight-20260909` through the existing Neon
identity guard. Durable Development and main were not cleanup targets.

[Vercel's current CLI documentation](https://vercel.com/docs/cli/deploy#prod)
states that the first deployment of a project is always Production, even
without `--prod`. This contradicts the original plan's assumption that omitting
that flag guarantees Preview. Do not retry on the empty project or count the
deleted deployment as T-23 evidence. The owner must resolve the initial
Production deployment prerequisite against TD-026 before another hosted run.

After that decision, the adapter needs a project-initialization preflight,
explicit Preview targeting, team-scoped identity lookup, and validation of the
returned project, target, commit and Preview metadata. Those repairs need
focused negative tests and a fresh controlled run. TST-PREVIEW-001,
TST-PIPELINE-001 and TST-ENV-001 retain partial evidence; TST-RELEASE-001 gains
no release evidence from this attempt.
