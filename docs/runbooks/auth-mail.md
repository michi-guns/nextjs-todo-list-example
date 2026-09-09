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

The owner has no domain as of 2026-09-09. T-21.5 therefore remains incomplete.
The authorized test-account check used `onboarding@resend.dev` and
`delivered@resend.dev`, with synthetic content only. Resend reported simulated
delivery for the readiness message; the new adapter's synthetic send was also
accepted. Neither result proves real inbox delivery or Production readiness.

References: [Resend send API](https://resend.com/docs/api-reference/emails/send-email),
[Resend test addresses](https://resend.com/docs/dashboard/emails/send-test-emails),
[TD-027](../../.dwf/decisions/TECHNICAL.md#td-027).
