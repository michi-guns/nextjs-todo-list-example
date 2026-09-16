# T-21.5 owner-domain and controlled delivery evidence

Date: 2026-09-16. Application adapter revision:
`25295361703c6ef8219d2fc9551ee381c94207d8` on `main`.
The adapter and runtime configuration files were not changed during the run.

The owner authorized the sending subdomain, its addition to Resend, the three
named DNS records, verification, one real test email to their own Gmail, and
inspection of that message. After the initial receipt, the owner separately
approved marking that message as not spam. This record omits the private
recipient address, credentials and full message content.

## Provider and DNS result

- Registrar and DNS host: Namecheap, using BasicDNS for the existing
  `dim-stamatakis.dev` domain. No domain purchase was needed.
- Resend sending domain: `auth.dim-stamatakis.dev`, Ireland `eu-west-1`.
- Resend domain status reached `Verified`; all three required records were
  verified. Sending was enabled, receiving disabled and tracking not enabled.
- Sender used for this approved test: `noreply@auth.dim-stamatakis.dev`.
  This creates no user mailbox for receiving replies.

The following records were added with Automatic TTL. Hosts in the table are
relative to `dim-stamatakis.dev` in the Namecheap editor.

| Type  | Host                     | Value/result                                                                                                                       |
| ----- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| TXT   | `resend._domainkey.auth` | Public DKIM key matched the Resend dashboard and public DNS. Full key omitted; use the current dashboard for future configuration. |
| CNAME | `rsend.auth`             | `rsend-euw1.forge.rmta.net`                                                                                                        |
| CNAME | `send.auth`              | `send.forge.rmta.net`                                                                                                              |

The existing root GitHub Pages A records, `www` CNAME and root Email Forwarding
SPF record were preserved. No DMARC record was added in this session.

Public DNS was checked independently through Cloudflare's resolver during
setup and again while preparing this record:

```powershell
Resolve-DnsName -Name resend._domainkey.auth.dim-stamatakis.dev -Type TXT -Server 1.1.1.1
Resolve-DnsName -Name rsend.auth.dim-stamatakis.dev -Type CNAME -Server 1.1.1.1
Resolve-DnsName -Name send.auth.dim-stamatakis.dev -Type CNAME -Server 1.1.1.1
```

Exact-value comparisons reported `MatchesApprovedValue=true` for all three
records. TXT chunks were joined before comparison; CNAME trailing dots were
ignored. DNS verification does not test email receipt.

These CNAMEs support the provider's sending/SPF configuration, not click or
open tracking. Resend documents that newer domains may receive CNAMEs instead
of the older TXT/MX combination. The DKIM TXT publishes a public verification
key; Resend signs the message with its private key. The public key is not the
application's secret API credential. See [Managing domains](https://resend.com/docs/dashboard/domains/manage-domains).

## One real adapter send

An ephemeral `node --import tsx --input-type=module` invocation loaded the
existing `readResendConfig` and `sendResendAuthEmail` exports from
[`resend-mail.ts`](../../../src/modules/auth/infrastructure/resend-mail.ts).
It used an already available local Resend credential without printing it.
The validated configuration object selected the Production mail policy and
the sender above. It did not change the application's environment, write an
environment file, or configure a deployed Production environment.

The message used `metadata.kind=email-verification`, subject `Verify your
email`, and a harmless synthetic `example.com` URL. No real auth token or
account was generated. The actual adapter called Resend's fixed HTTPS endpoint
and reported success after accepting the provider response. It returns no
message identifier to its caller, so no provider message ID was retained.

Redacted invocation result:

```json
{
  "result": "provider_accepted",
  "attempts": 1,
  "sentAt": "2026-09-16T12:19:36.566Z",
  "realAuthToken": false,
  "inboxReceipt": "awaiting_owner_confirmation"
}
```

The last field describes the state at send time. The subsequent authorized
Gmail inspection established receipt as recorded below. Do not rerun this
send as a documentation check or treat its isolated Production-policy object
as proof that a deployed app has the protected configuration.

## Gmail receipt and observation

A focused search across all folders found the one matching message at 15:19
Europe/Athens. Sender, subject and synthetic link matched the approved test.

- Initial folder: **Spam**. Gmail said the message resembled messages
  previously classified as spam; it did not provide a more specific cause.
- Message details displayed `mailed-by: rsend.auth.dim-stamatakis.dev`,
  `Signed by: auth.dim-stamatakis.dev` and standard TLS encryption.
- Raw message headers were not inspected. This record makes no separate
  SPF/DMARC pass assertion from those summary fields.
- After explicit owner approval, `Report as not spam` produced Gmail's
  confirmation that it moved the conversation to Inbox. The message then
  displayed the Inbox label and was left open for the owner.

This establishes actual receipt followed by a manual classification change.
It does not prove automatic inbox placement for a new recipient. The cause
of the initial classification remains unknown beyond Gmail's explanation.
No second message, allow-list filter, new DNS policy or deliverability change
was made. See [Gmail spam handling](https://support.google.com/mail/answer/1366858?hl=en).

## Acceptance boundaries and next work

T-21.5's owner-domain and controlled provider-delivery slice is complete. The
parent remains open for protected Production sender configuration and its
verification. No GitHub/Vercel Production settings, API-key permissions,
deployment, database target or application code were changed in this session.

The test invoked the mail adapter directly. It did not exercise
`deliverAuthEmail` in a deployed process, a real signup, verification-link
consumption, or a remote magic-link request. Earlier integration and browser
evidence remains separate; those suites were not rerun for this documentation
update.

| Contract         | Evidence impact                                                                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TST-AUTH-001/002 | Existing local lifecycle evidence stays `verified`. This test adds receipt evidence for a synthetic verification message, not a remote auth lifecycle or magic-link test. |
| TST-ENV-001      | Remains `partial`; protected Production configuration/secret-scope evidence is still missing.                                                                             |
| TST-PIPELINE-001 | Remains `partial`; the protected release path is still pending.                                                                                                           |
| TST-RELEASE-001  | Remains `specified`; a provider smoke is not a release rehearsal.                                                                                                         |

Resume with the [remaining T-21.5 acceptance](../../runbooks/auth-mail.md#remaining-t-215-acceptance),
then recompute T-23 readiness using [TODO](../../../TODO.md#t-23-add-manually-approved-exact-ref-production-release).
T-22's hosted Preview and cleanup are already complete. No accepted product or
technical decision changed in this session.

## Documentation verification

Changed-file Prettier, relative-file/heading link checks and `git diff --check`
passed. The link check found no broken links in the ten Markdown files in
this checkpoint, including all 14 newly introduced link destinations. The
private recipient address is absent from those files. These are documentation
checks, not additional provider sends or deployed application tests.
