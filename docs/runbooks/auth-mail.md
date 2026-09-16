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
require that provider evidence before deployment. No Production release
workflow currently exists.

The 2026-09-09 check used Resend's simulated test-domain delivery. On
2026-09-16 the owner supplied an existing Namecheap domain, Resend verified
the sending subdomain, and one synthetic verification message through the
existing adapter reached the owner's Gmail. It arrived in Spam and was moved
to Inbox after explicit owner approval. See the [redacted domain and delivery
record](../agentforge/evidence/2026-09-16-resend-domain-delivery.md) for the
approved sender, DNS values, command result and evidence limits.

The sending/DNS slice is complete. Protected Production configuration remains
pending, so T-21.5 is still open. The isolated local adapter invocation did not
configure or test a deployed Production process. It also did not prove a real
verification or magic-link lifecycle. Initial spam classification remains a
deliverability observation; the manual move is not general inbox-placement
proof. No receiving mailbox was configured.

## Remaining T-21.5 acceptance

1. Inspect the intended protected GitHub/Vercel Production configuration
   without printing secret values. Identify where the server-only settings
   above will be stored and supplied; do not use repository-wide or Preview
   secrets as a substitute for Production isolation.
2. Prepare the exact proposed settings and obtain owner approval before
   changing protected configuration or credentials. Reuse the verified
   sender from the delivery record; do not recreate the domain or DNS records.
3. Verify the required settings and their scope through the intended
   protected execution path, using existing validators and redacted evidence.
   A local `.env.local` key and successful standalone send do not prove that
   scope. Any additional real email requires its own owner-authorized
   recipient and purpose.
4. Reconcile T-21.5 and its test contracts, then continue to T-23's planned
   release implementation. The workflow, approval boundary, migration and
   deployed auth smoke remain T-23/T-24 evidence and require their own
   prerequisites. Do not deploy solely to close this documentation checkpoint.

References: [Resend send API](https://resend.com/docs/api-reference/emails/send-email),
[Resend test addresses](https://resend.com/docs/dashboard/emails/send-test-emails),
[TD-027](../../.dwf/decisions/TECHNICAL.md#td-027).
