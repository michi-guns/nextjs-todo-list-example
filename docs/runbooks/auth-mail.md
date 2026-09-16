# Authentication mail

Better Auth generates verification and magic-link URLs. Both callbacks await
`deliverAuthEmail` in `src/modules/auth/infrastructure/auth-mail.ts`.

Local and Development use the explicitly enabled local mailbox. Preview uses
the controlled verified account and sends no mail. These profiles reject a
selected remote transport/provider; an unused test key in local configuration
does not enable remote delivery.

Production selects Resend with these protected server-only settings:

```dotenv
APP_ENV=production
NODE_ENV=production
APP_MAIL_TRANSPORT=remote
APP_MAIL_PROVIDER=resend
SECRET_NAMESPACE=production
RESEND_API_KEY=<protected-provider-key>
APP_MAIL_FROM=auth@your-verified-domain.example
BETTER_AUTH_LOCAL_MAILBOX=false
```

`APP_MAIL_FROM` is a single email address without a display name. The Production
validator rejects missing/invalid settings and the `resend.dev` test domain.
`pnpm environment:inspect` validates this configuration before accepting a
Production profile and omits the API key and sender from its safe output.
The send boundary repeats that validation before any network call.

The adapter sends plain text to the fixed Resend HTTPS API, preserves Better
Auth's URL, rejects redirects, and bounds the call to ten seconds. A rejected,
malformed or failed request throws a generic error without the provider body,
recipient, auth URL, key or original exception cause. It does not log messages
or silently fall back to local capture.

## Readiness before Production

Configuration validation checks shape and environment policy. It cannot prove
that a key works or that a domain is verified. Before T-23 can release, verify
the sender domain in Resend, configure the protected Production environment,
and record a controlled delivery check. T-23 must call profile validation and
require that provider evidence before deployment. The
[protected release workflow](production-release.md) implements this boundary;
its HTTP smoke still requires a separately authorized browser/mail check.

The 2026-09-09 check used Resend's simulated test-domain delivery. On
2026-09-16 the owner supplied an existing Namecheap domain, Resend verified
the sending subdomain, and one synthetic verification message through the
existing adapter reached the owner's Gmail. It arrived in Spam and was moved
to Inbox after explicit owner approval. See the [redacted domain and delivery
record](../agentforge/evidence/2026-09-16-resend-domain-delivery.md) for the
approved sender, DNS values, command result and evidence limits.

The sending/DNS slice and protected configuration acceptance are complete.
The first approved GitHub Production mail check passed on 2026-09-16, closing
T-21.5. The isolated local adapter invocation did not
configure or test a deployed Production process. It also did not prove a real
verification or magic-link lifecycle. Initial spam classification remains a
deliverability observation; the manual move is not general inbox-placement
proof. No receiving mailbox was configured.

<a id="remaining-t-215-acceptance"></a>

## Protected mail verification

The existing GitHub `production` Environment owns `RESEND_API_KEY` and the
seven non-secret variables shown above. `APP_MAIL_FROM` uses the previously
approved `noreply@auth.dim-stamatakis.dev`. The required reviewer is `jimzord12`,
administrator bypass is disabled, and only branch `main` may use the
Environment. The owner may approve their own manual dispatch. CI and Preview
do not reference this Environment or its Resend secret. See the
[protected configuration record](../agentforge/evidence/2026-09-16-production-mail-protection.md).

The initial [protected run](https://github.com/michi-guns/nextjs-todo-list-example/actions/runs/35103297897)
passed at `03b67809944bd4e65ed9d86a1444446b5a9cc0ce`. Its approval was submitted
by the agent through the owner's account under their task/test authorization,
with that delegation recorded in the approval history.

For a later authorized configuration recheck:

1. Run `gh workflow run verify-production-mail.yml --ref main`, then approve
   the waiting `production` job in GitHub. Review its triggering SHA before
   approving. The workflow checks out that SHA and exposes the scoped mail
   settings only to `pnpm exec tsx scripts/auth-mail/inspect.ts`.
2. Record the waiting approval and successful run URL/SHA. The command reuses
   `readResendConfig` and reports only configuration-valid metadata. It makes
   no network call and sends no email. A failure blocks release readiness. Do not
   overwrite an existing credential without the owner's explicit approval.
3. Reconcile the configuration evidence. T-23 must validate the complete Production profile
   and supply the approved settings to the Vercel Production runtime. Its
   release approval, migration, deployment and auth smoke remain separate
   evidence. This mail-only check neither configures nor proves that runtime.

Configuration validation does not prove credential validity or current
deliverability. The earlier real adapter receipt is separate evidence and
must retain its limits. Any additional real email needs an owner-authorized
recipient and purpose.

## Deployed delivery and diagnosis

The [2026-09-16 live release](../agentforge/evidence/2026-09-16-production-release-live.md)
first exposed a stale or mismatched protected credential: the deployed adapter
failed although configuration shape checks passed. Updating the protected key
from the already verified credential and redeploying the same commit resolved
delivery. The controlled message arrived in Gmail Inbox, and its original link
opened the private dashboard. Sign-out restored the private-route boundary.

For `Resend auth email delivery failed`, inspect safe Vercel timing/status and
the matching Resend account's send logs, key metadata, verified domain and
sender. Do not print provider bodies, recipients, auth URLs or credentials.
GitHub secret values cannot be read back for comparison. A credential repair
requires an authorized secret update and a new deployment because the release
runner supplies configuration to each deployment. Retest the owner-approved
mail journey; a successful shape check alone cannot close the incident.

References: [Resend send API](https://resend.com/docs/api-reference/emails/send-email),
[Resend test addresses](https://resend.com/docs/dashboard/emails/send-test-emails),
[TD-027](../../.dwf/decisions/TECHNICAL.md#td-027).
