# Protected Production release

## Boundary

Production delivery is manual. Ordinary CI and Preview never receive the
`production` Environment's credentials. The release workflow resolves a tag or
full commit SHA in reviewed `main` history, checks successful main-push CI for
that exact SHA, then waits for protected Environment approval. It never seeds,
resets, or automatically rolls back a database.

The accepted targets are Neon project `jolly-dew-32309276`, branch
`br-purple-sea-a53v962l` (`main`), database `neondb`, and Vercel project
`prj_v45MdKyM0g9PVTXUQB1PznfgyMI6` in team `team_6D5hN9OejSRMxW95pXPiDFI2`.
The canonical origin is <https://nextjs-todo-list-example.vercel.app>.
Provider observations must match these repository-specific identities before
any migration. Runtime uses the matching pooled endpoint; migration uses the
direct URL. Application deployments do not receive provider API tokens or the
direct migration URL.

See the [accepted plan](../agentforge/plans/2026-09-16-t-23-production-release.md),
[prerequisite evidence](../agentforge/evidence/2026-09-16-production-release-preflight.md),
[environment profiles](environment-profiles.md), and
[TST-RELEASE-001](../../.dwf/decisions/TESTING.md#tst-release-001).

## Select and approve a release

1. Merge the reviewed change and wait for the main-push `CI` run at its exact
   commit. Both `Quality` and `Harness` must succeed. A successful PR run alone
   is insufficient. The candidate must contain the release tooling.
2. Inspect the committed migration SQL and the current Production deployment.
   Confirm that the previous application still works with the forward schema.
   Record this compatibility assessment in the release evidence before
   selecting `rollback-compatible`. If compatibility is unknown, do not release.
3. Dispatch `Production release` from `main` with a full 40-character SHA or
   explicit tag and the compatibility acknowledgement. For example:

   ```sh
   gh workflow run deploy-production.yml --ref main \
     -f ref=<reviewed-full-SHA> -F rollback-compatible=true
   ```

4. The unprivileged `Resolve exact ref and CI` job publishes the selected SHA,
   requested ref, CI run id and attempt. The protected job's name contains that
   SHA. Check it before approving the `production` Environment gate. A moved
   tag cannot change this job's checkout. If a newer CI attempt appears while
   approval is pending, dispatch again after it succeeds.
5. The protected job installs pinned tooling before exposing credentials to the
   release consumer. It rechecks clean checkout, main ancestry, CI attempt,
   profile, provider identities and rollback reference; applies committed
   migrations; deploys Production; verifies deployment metadata and canonical
   alias; then checks landing, sign-in, anonymous session/list boundaries and
   the real Sanity read path.
6. Review the safe JSON in the job summary and the
   `production-release-<SHA>-<attempt>` artifact. Record the workflow approval,
   SHA, CI run, migration outcome, deployment id, rollback reference and smoke
   result in delivery evidence. Confirm deployed browser/authentication behavior
   and one actual signed Sanity webhook delivery before claiming complete
   release evidence. HTTP and unit checks do not prove these boundaries.

The protected Environment settings are described in the prerequisite evidence.
The current required reviewer is `jimzord12`, only `main` can deploy, and admin
bypass is disabled. The owner has delegated reviewed PR merges; that delegation
does not remove the release approval gate. Do not copy secret values into
workflow inputs, PRs, artifacts, logs or runbooks.

## Recovery

The record distinguishes `preflight`, `migration`, `deployment` and `smoke` as
`not_started`, `succeeded` or `failed`. A failed migration may have committed
earlier migrations in the chain. Inspect the migration journal and provider
state before retrying; do not infer an untouched database from a failure.

If migration succeeded and deployment failed, the database remains on the
forward schema. The record retains the previous deployment and its immutable
application commit when available. Verify which deployment currently serves
the canonical origin, since a provider timeout can leave an operation completed
without its response. Fix the release or restore the recorded compatible
application through the Vercel rollback operation with the same project/team
scope and explicit operator authorization. Then repeat canonical HTTP, browser
and Sanity checks. Never run a database down-migration or reset as an automatic
reaction to application failure.

If smoke fails, the record retains the newly deployed id and marks deployment
successful separately. Check the alias assignment, Vercel deployment/runtime
logs, mail configuration and Sanity delivery log. Treat the application as
unverified until the failing boundary passes.

The initial rollback reference is placeholder deployment
`dpl_GRpcAgtr9BZ7QcsUNHX259WAvLin`. It has no application commit and is explicitly
classified `maintenance-placeholder`. Its static page is independent of the
database schema; restoring it offers a maintenance fallback, not a working todo
application. Subsequent releases require immutable commit metadata on their
previous application deployment.

Cancellation or runner loss can prevent the final record from being written.
Missing artifacts are not evidence that migration or deployment did not happen.
Inspect GitHub step timing, the Neon migration journal, Vercel deployment
metadata and canonical alias before deciding how to recover. Do not retry a
state-changing provider operation blindly. Workflow concurrency avoids
cancelling an active release; do not manually cancel one during migration.

## Verification without Production mutation

`pnpm release -- resolve --ref <tag-or-full-SHA>` performs only Git and GitHub CI
reads. Supply the repository name and a read-only `GITHUB_TOKEN` through the
process environment; do not put token values in command arguments. The full
`release` command refuses execution outside an Actions `main` run and consumes
the protected job's immutable selection metadata.

Run `pnpm test:pipeline` for deterministic refusal, ordering, failure and workflow
boundaries. `pnpm test:integration` applies the committed migrations to disposable
local PostgreSQL. `pnpm test:e2e:cross-browser` covers the local browser journey
across Chromium, Firefox and WebKit. These are local evidence; the real protected
release, deployed browser and Sanity webhook evidence remain separate.

## Source references

- [Git revision precedence](https://git-scm.com/docs/gitrevisions#_specifying_revisions): use explicit tag and remote-tracking namespaces.
- [Neon branch](https://api-docs.neon.tech/reference/getprojectbranch), [endpoints](https://api-docs.neon.tech/reference/listprojectendpoints) and [databases](https://api-docs.neon.tech/reference/listprojectbranchdatabases): read observed identities before migration.
- [Vercel deploy CLI](https://vercel.com/docs/cli/deploy) and [alias lookup](https://vercel.com/docs/rest-api/aliases/get-an-alias): deploy structured metadata and verify canonical routing.
