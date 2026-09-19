# Remaining runtime safety and operational alerts plan

> Accepted AgentForge approach. TODO.md adds T-26.8–T-26.14 to the existing logger/diagnostics tasks.

**Status:** Accepted for consolidated task definition on 2026-09-19. Native uptime uses Better Stack Free, Production diagnostics initially use Sentry Free with native new/regressed-group Email, and protected release failures use the NotificationPort's Resend Email adapter from GitHub Actions. OD-027 is resolved. No runtime implementation, provider setup, paid service or email send is authorized by this document.

**Goal:** Detect unsafe runtime targets and operational failures, distinguish affected dependencies, verify the running release, and deliver actionable alerts even during total application outage.

**Spec and decisions:** [TD-026](../../../.dwf/decisions/TECHNICAL.md#td-026), [D-012](../../../.dwf/decisions/PRODUCT.md#d-012), [TD-033](../../../.dwf/decisions/TECHNICAL.md#td-033), [TD-035](../../../.dwf/decisions/TECHNICAL.md#td-035), [runtime health contract](../../../.dwf/output/agent/SPEC.md#runtime-health-safety), [operational notification boundary](../../../.dwf/output/agent/SPEC.md#operational-alerts), and [T-26](../../../TODO.md#t-26-add-runtime-safety-and-observability-hardening).

**Architecture:** Share pure environment-validation rules with tooling, add runtime-specific configuration and bounded dependency probes, and bind deployed smoke to safe release identity. Better Stack Uptime and Sentry send their respective native notifications outside the TypeScript port. A provider-neutral OperationalAlert/NotificationPort and Resend Email adapter report failed releases directly from the protected runner, independent of application/database availability.

**Global constraints:** Preserve [the logger plan](2026-09-18-t-26-shared-logger.md), [diagnostics plan](2026-09-18-t-26-diagnostics.md), TD-029–031 and their seven unchecked slices. Do not rebuild logging, add metrics/tracing/browser telemetry, provision a service/queue, expose credentials, or depend on the monitored app/database for outage detection or delivery. This plan covers only the remaining T-26 responsibilities.

## Current state and file map

| Existing seam                                                                                                             | Planned responsibility                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `scripts/environment/core.ts`; new small shared/runtime validation modules                                                | Extract reusable pure profile/target rules while preserving the tooling command contract; validate runtime inputs separately from migration/operator inputs. |
| `db/db.ts`, `lib/auth.ts`, `src/sanity/config.ts`, `src/sanity/client-factory.ts`                                         | Compose clients only after coherent runtime target/policy validation; preserve current pool lifecycle and auth/CMS ownership.                                |
| New `src/shared/health/*`; thin `app/api/health/[component]/route.ts`                                                     | Bounded Node-only liveness/database/CMS probes and safe response mapping. No todo entity or business use case dependency.                                    |
| `scripts/deploy/production/runtime.ts`, `scripts/deploy/preview/vercel.ts`, their smoke orchestration/tests and workflows | Supply safe provider-observed target/release identity and check actual runtime identity/readiness in addition to existing provider metadata.                 |
| New `src/shared/operational-alerts/contracts.ts`, `resend-email.ts` and `scripts/deploy/production/notify.ts`             | Safe release alert, outbound notification port, Resend adapter and protected-runner entry point. No incident database, queue or diagnostics facade.          |
| Thin monitor configuration/runbook; provisioning adapter only if actual provisioning code is accepted                     | Better Stack-specific target, interval, confirmation and channel setup outside application/health logic; preserve replacement through operational changes.   |
| Existing logging/diagnostics boundaries; new focused operations runbook                                                   | Reuse safe failure reporting and correlation; explain target mismatch, DB/CMS/mail failures, release mismatch and alert ownership.                           |
| Environment/pipeline tests, new focused runtime/health/adapter tests                                                      | Prove refused unsafe targets, bounded probes, release binding and notification boundaries; keep hosted evidence separate.                                    |

`db/db.ts` currently requires only `DATABASE_URL`; auth and Sanity configuration validate independently. The complete tooling profile requires `DATABASE_URL_UNPOOLED`, but Production deploy intentionally supplies only the pooled runtime URL to the application. Calling that tooling parser unchanged during app startup would break Production or expose migration credentials unnecessarily. Extract shared pure validation; do not solve the mismatch by giving the app additional credentials.

There are no health routes. The published landing source caches validated content until `landing-content` invalidation, so a successful cached landing request does not prove current CMS availability. Production already checks Vercel project/target, commit metadata and canonical alias; Preview already checks commit and preview identity. Preserve those checks rather than relabeling them as missing.

## Dependencies and work order

Runtime validation precedes trustworthy health reporting, then actual-runtime release smoke. The release-Email slice follows the safe release record/notification contract, not logger database availability. Sentry native alert proof follows implemented Sentry diagnostics; the independent Better Stack uptime proof follows deployed health. TODO.md owns T-26.8–T-26.14 and the cross-task order. Existing protected environment delivery remains the foundation.

The modules below are planned implementation locations. T-27 auth and T-28 editorial preview keep their own plans; consume their environment boundaries without changing product behavior. Serialized shared-file work in TODO.md avoids conflicting edits to runtime/environment/deployment composition.

### Runtime target and release identity

Use separate typed runtime and tooling input contracts backed by shared pure validators. Runtime checks cover APP_ENV/NODE_ENV, pooled/local database role, expected target identity, Better Auth origin/secret presence, Sanity dataset/read policy, and mail policy. Preserve deployment-assigned Preview origins and the distinction between build configuration and runtime initialization. Ordinary validation must not open a database or call provider control-plane APIs at import/build time.

Carry safe endpoint/project/branch identity observed by existing delivery tooling into deployment configuration. Compare the configured database host/role with that expected identity; a user-supplied branch label alone is not proof of the selected Neon target. Keep live control-plane checks in authorized tooling, not every application request. Runtime configuration must not require Vercel/Neon administrative credentials or a direct migration URL.

Expose only the resolved release SHA and a small safe environment/status vocabulary to health smoke. Supply one runtime release identity from the resolved deployment input and retain the existing provider metadata comparison. Local development may identify itself as local/unreleased; a hosted release must not silently substitute an unknown identity. Fail unsafe client initialization with a sanitized configuration error, without dumping environment objects, URLs, secrets or provider responses.

### Dependency-distinguishing health

Use `/api/health/app`, `/api/health/database` and `/api/health/cms` through one thin dynamic Route Handler and separate bounded probe functions. App liveness reports that this runtime can answer; database readiness uses a read-only `SELECT 1` through the existing bounded pool; CMS status performs a fresh published singleton read through the existing query/validation boundary with `useCdn:false` and `cache:'no-store'`. Do not route the CMS probe through the indefinite published-content cache or editorial Draft Mode.

Each successful probe returns HTTP 200 with component, safe status and resolved release identity. Failed/timed-out probes return 503 with a fixed safe code, never raw errors or target URLs. A CMS failure does not report the private todo database as unavailable. Dependency probes run independently, have a three-second initial deadline and bounded per-instance in-flight work; do not add a second database pool or an unbounded wait queue. Bound acquisition and actual query/network work, release acquired resources on all paths, and preserve the shared pool. A response-only `Promise.race` is not evidence that the underlying operation is bounded.

Keep dependency probes behind a dedicated operator/monitor secret header in remote profiles, with constant-time validation and no secret in URL/query/logs. This is an operational credential, not an application admin role or a notification-channel choice. Liveness may expose the minimal safe response publicly. Missing optional monitor configuration leaves protected probes unavailable without breaking ordinary application startup; it cannot be reported as successful monitored readiness. Local tests inject the same verifier/probe seams. Exact secret naming/header plumbing is a routine implementation detail; provisioning it to a real monitor is a separately authorized operation.

Deployment smoke retains provider-observed project/deployment/alias/ref checks, then checks the running release identity and relevant readiness endpoints on the intended deployment. Do not infer database readiness from an anonymous sign-in redirect, or deployed CMS health from a separate CLI Sanity smoke. Report safe component/ref mismatches in existing release evidence without changing protected approvals.

### Accepted external monitoring and remaining alert policy

Use Better Stack Uptime's free tier for native Production availability monitoring and direct Email notifications, following the [accepted native policy](../../../.dwf/output/agent/SPEC.md#native-uptime-policy). Native checks and delivery remain operational when this app and database are down. These notifications **do not execute our TypeScript notification port**; do not describe native routing as our adapter implementation. This uptime choice is independent of TD-030's startup-selected diagnostics provider (Sentry, Better Stack or none).

Keep stable provider-neutral HTTP liveness/readiness/status contracts and target URLs. Application/domain health logic must contain no Better Stack SDK, provider types, credentials or conditionals. Put monitor target, interval, confirmation and selected-channel configuration in a thin operational integration or runbook. Replacing the monitor provider should change that integration/configuration, not business or health logic. Add a provisioning port/adapter only if the accepted task contains actual provisioning code; do not create an unused runtime `UptimeProvider` class or configurable monitoring framework.

The [accepted application/tool conditions](../../../.dwf/output/agent/SPEC.md#application-tool-alert-policy) cover failed Production releases (migration, deployment or final post-deploy verification) and new unexpected Production error groups or recurrence after resolution. Auth-email delivery and data-persistence failures are examples. Group repeated occurrences without one Email per occurrence; expected user errors and ordinary warnings remain diagnostics. Native uptime must not generate a second application notification.

Retain a neutral `OperationalAlert` and reusable `NotificationPort.send(alert): Promise<void>`. The initial concrete implementation is a Resend Email adapter for failed releases. Sentry Free is the initial Production diagnostics provider and sends native Email for new/regressed unexpected groups. Both native paths stay outside the TypeScript port. Preserve both diagnostics adapters and startup selection under TD-030. No Better Stack incident-ingress adapter, custom relay/state machine/queue or per-request direct mail is selected.

| Condition owner                                                      | Detection/submission path                                                 | Duplicate prevention                                                                    |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| External availability monitor                                        | Provider-native app/DB/CMS monitor → incident → selected routing policy   | No second application notification for the same availability incident.                  |
| Failed Production migration/deployment/final verification            | Protected GitHub Actions runner → NotificationPort → Resend Email adapter | Stable release-attempt identity; bounded 24-hour provider idempotency, no app/DB state. |
| New unexpected Production error group or recurrence after resolution | Sentry Free native Production group-transition Email                      | One native route; suppress overlapping workflow notices and per-occurrence Email.       |

Use this accepted ownership map when wiring triggers. Individual request failures contribute to diagnostics groups and must not directly send Email; expected user errors and ordinary warnings do not trigger alerts. Adapter credentials and provider formatting stay outside the shared value; responses/failures are sanitized and bounded. The protected runner can report release failure while the app/database are down; native uptime owns total-outage notification.

The external native path, free Better Stack selection, Email-only channel and full native policy are accepted; do not reopen a separately hosted relay merely to force outage delivery through application adapters. If an implementation prerequisite conflicts with the accepted path or tier, surface the concrete conflict before expanding infrastructure or cost. No provider setup or paid commitment is authorized.

Owner policy decision, 2026-09-19: monitor Production application, database and CMS with distinguishable status; poll every three minutes, confirm failure for three further minutes after detection, and recover after three minutes of stable successful checks. Send one Email on opening and one on recovery, with no periodic reminders. Slack, Telegram and Pushover are outside initial scope. Monitor identity/notification context must distinguish CMS-only degradation from total downtime. Do not duplicate native incidents through application notifications or copy native polling/recovery timings onto error-group or release-failure events.

Operational mapping, checked 2026-09-19: the [monitor API](https://betterstack.com/docs/uptime/api/create-a-new-monitor/) documents seconds-valued `check_frequency`, `confirmation_period` and `recovery_period`; map each to `180` in any later authorized setup. The [confirmation/recovery guide](https://betterstack.com/docs/uptime/confirmation-and-recovery-period/) starts confirmation after first failure observation and resets recovery when a check fails. Polling/detection delay comes before confirmation; provider processing and mail delivery add latency, so this is not an alert-within-three-minutes guarantee from actual onset. Keep these settings in operational configuration, never an application timer.

Configure one opening and one recovery Email, disabling periodic repeats and duplicate delivery paths in the actual monitor/recipient settings. The [escalation guide](https://betterstack.com/docs/uptime/escalation-policies/) warns that simple escalation can alert the rest of the team and trigger integrations; an Email switch alone is not proof that other delivery paths are off. Verify those settings and recovery delivery during separately authorized free-tier setup/evidence. Do not assume an advanced escalation policy is included or silently add a paid feature/custom relay to satisfy the accepted behavior; surface an actual entitlement/configuration conflict if encountered.

Provider research supporting the owner choice, checked 2026-09-19: [Better Stack Uptime](https://betterstack.com/uptime) advertises 10 monitors, 10 heartbeats and one status page with three-minute checks free. Its [pricing page](https://betterstack.com/pricing) labels the $0 tier for personal projects and includes email/Slack alerts; [check-frequency documentation](https://betterstack.com/docs/uptime/check-frequency/) distinguishes free three-minute checks from paid checks as often as 30 seconds. These are dated advertised entitlements, not indefinite pricing or confirmed account eligibility. Recheck the actual free account during authorized setup without enabling paid escalation/integrations.

### Native Sentry error-group Email

Select `sentry` for Production at startup; retain `none` and the Better Stack
adapter as supported configurations without dual export. Configure a
Production-filtered native Email route for first-seen unexpected groups and
regression of resolved groups, not every event. Keep expected user errors and
ordinary warnings out of those triggers. [Sentry pricing](https://sentry.io/pricing/)
lists the $0 Developer plan with Email alerts (checked 2026-09-19); quotas and
actual account settings remain verification prerequisites, not paid-upgrade
authorization. [Native alert conditions](https://docs.sentry.io/api/monitors/create-an-alert-for-an-organization/)
document first-seen/regression triggers; using those semantics does not require
automated provisioning through a possibly restricted API.

Inspect both native issue-alert rules and [Issue Workflow regression notifications](https://www.sentry.help/en/articles/13964392-why-do-i-still-receive-regression-emails)
so a transition has one Email owner. Prove a new group, repeated occurrences,
explicit provider resolution and recurrence with real authorized synthetic
events and mailbox evidence. Do not add an application event-history table or
webhook relay. Missing/disabled ingestion or quota exhaustion is a reporting
limitation, not a reason to silently fall back to another provider.

### Release-failure Email from the protected runner

Add `src/shared/operational-alerts/contracts.ts` and `resend-email.ts` plus a
small `scripts/deploy/production/notify.ts` entry point. The shared value carries
safe alert kind, Production environment, trusted release/run identity and failed
stage context; no raw provider error, shell arguments or credentials. The
adapter uses the existing Resend account/sender and bounded HTTP conventions,
without importing auth callbacks, recipient counters, the database or app startup.
Retain the current auth mail behavior; extract only a genuinely shared small
HTTP seam if needed, not a mail framework or new SDK.

The protected workflow gives its release step a stable ID and invokes
`pnpm exec tsx scripts/deploy/production/notify.ts` only after that step actually
fails. Reuse `$RUNNER_TEMP/production-release-record.json`, validating its safe
schema and matching trusted workflow identity. If unavailable, report only a
minimal failed-step envelope from trusted workflow metadata with unknown stage;
never reconstruct secrets from logs. Success, skipped/unapproved execution and
unrelated later artifact failures must not produce a release-failure Email.
Keep sender, Resend secret and configured recipient in protected step
environment variables, never CLI arguments or committed fixtures. Recipient
is a configuration prerequisite, not another product choice.

Use repository/run ID/run attempt plus the release-failure kind as stable
idempotency identity. Retrying the same attempt uses the same immutable payload;
a new workflow attempt has a different identity. [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys)
retains keys for 24 hours, not forever. Keep retries bounded, send no periodic
reminders, and document possible duplicate delivery outside that window rather
than adding persistent incident state. Provider acceptance is not receipt proof.
An adapter timeout/refusal produces only a safe secondary notice; the original
release remains failed and its record/exit result remain intact. Workflow
failure notification cannot guarantee delivery when the runner itself never
executes; do not imply a new independent runner-monitoring service.

## Verification strategy

[TST-RUNTIME-001](../../../.dwf/decisions/TESTING.md#tst-runtime-001) owns the new runtime guard/probe/release obligations. Preserve historical `verified` evidence of [TST-ENV-001](../../../.dwf/decisions/TESTING.md#tst-env-001), [pipeline/release contracts](../../../.dwf/decisions/TESTING.md#tst-pipeline-001), and logger/diagnostics contracts. [TST-ALERTS-001](../../../.dwf/decisions/TESTING.md#tst-alerts-001) owns all three notification paths; both new extension contracts remain `specified`.

- Unit/configuration: runtime-only Production inputs work without migration credentials; unsafe profile/target/origin/dataset/mail combinations fail before client construction; safe errors omit supplied secrets; preserve Preview assigned-origin behavior.
- Health integration: successful and failing/timed-out DB/CMS probes remain distinguishable; unknown/unauthorized probes refuse safely; CMS probes bypass published cache; no client/connection leaks, mutation or credential-bearing body.
- Pipeline: expected SHA/project/alias comparisons remain; wrong runtime SHA and readiness failures block successful smoke; new operational/read tokens stay environment-scoped and out of records/command output.
- Application/tool alerts and port/adapter: prove failed Production migration/deployment/final-verification triggers, new unexpected groups and recurrence after resolution, grouped suppression of repeated occurrences, and no alerts for expected user errors/ordinary warnings or duplicate native uptime incidents. Verify safe payload mapping and bounded Resend refusal; no recursive diagnostics/notification failure loop. No direct request Email or custom incident state machine is implied. Fake transport checks do not prove provider delivery.
- Hosted evidence after authorization: correct deployed target and identity, fresh real dependency checks, and controlled external proof that detection **and Email delivery** still occur when the monitored app is unavailable and without its DB. Record actual detection, confirmed incident opening, recovery confirmation and Email times, verify no repeats or duplicate native/application delivery, and distinguish a CMS-only incident. Check the three timing settings and Production-only targets without claiming an onset-to-alert deadline. Do not cause an unapproved Production outage to obtain evidence; use an approved disposable target or provider-supported controlled exercise that proves the same dependency boundary. A test monitor used for that authorized exercise does not authorize ongoing non-Production monitoring.

Focused future commands are `pnpm exec vitest run src/shared/health src/shared/operational-alerts src/test/environment`, `pnpm test:pipeline`, and the relevant integration/browser suites when new runtime behavior changes their paths. Final implementation gates include `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, required real integration/browser checks, scoped Prettier and `git diff --check`, independent review and main CI. This planning pass runs documentation checks only; normal hooks remain enabled.

## Risks and assumptions

The critical risks are expanding runtime credential access, confusing cached content with live dependency health, coupling alerts to a failed app/database, and notifying twice for one incident. Separate input/probe boundaries and explicit external ownership address them. Do not broaden the plan into a generic monitoring framework, infrastructure platform or durable delivery system.

OD-027 is resolved; exact type/file names and safe implementation mechanics are engineering choices. Hosted accounts, sender/recipient/secret configuration and approved failure exercises are concrete execution prerequisites. A verified domain or previous mail success does not prove the new alert receipt. Actual free-tier/account restrictions must be checked before setup, without paid upgrades or weakened acceptance.

## Handoff to task breakdown

The owner authorized T-26.8–T-26.14 in TODO.md: runtime guards, dependency health, actual-release smoke, workflow release Email, native uptime evidence, native Sentry evidence and real release-Email/runbook closeout. Keep T-26.1–T-26.7 as the existing logger/diagnostics foundation. TODO.md owns order and prerequisites; no implementation or provider operation has run in this planning pass.
