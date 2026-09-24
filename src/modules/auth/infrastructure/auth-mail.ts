import { captureMagicLink, type MagicLinkMessage } from "./local-mailbox"
import { readResendConfig, sendResendAuthEmail } from "./resend-mail"
import { observeOperation } from "../../../shared/logging/operation"
import type { RecipientAdmission } from "./auth-rate-limit"
import type { AuthMailScheduler } from "./mail-scheduler"

export async function deliverAuthEmail(
  message: MagicLinkMessage
): Promise<void> {
  const transport =
    process.env.APP_ENV === "production"
      ? "resend"
      : process.env.APP_ENV === "preview"
        ? "suppressed"
        : "mailbox"
  return observeOperation(
    "auth.mail",
    "auth.mail.delivery",
    () => deliver(message),
    {
      level: "info",
      metadata: {
        transport,
        outcome: transport === "suppressed" ? "suppressed" : "completed",
      },
    }
  )
}

async function deliver(message: MagicLinkMessage): Promise<void> {
  if (process.env.APP_ENV === "production") {
    await sendResendAuthEmail(readResendConfig(process.env), message)
    return
  }
  if (
    process.env.APP_MAIL_TRANSPORT === "remote" ||
    process.env.APP_MAIL_PROVIDER
  ) {
    throw new Error("Remote mail is unavailable outside Production")
  }
  if (process.env.APP_ENV === "preview") {
    if (process.env.BETTER_AUTH_LOCAL_MAILBOX === "true") {
      throw new Error("Local mailbox is unavailable on Preview")
    }
    return
  }
  await captureMagicLink(message)
}

type DeniedReason = Extract<RecipientAdmission, { allowed: false }>["reason"]

/**
 * The single auth-mail boundary Better Auth callbacks use. Every message,
 * automatic or requested, is charged to the recipient's actual-send budget
 * and delivered outside the auth response. A denied or failed send is
 * suppressed without throwing, so callers cannot learn whether an account
 * exists; the reason goes to sanitized diagnostics only.
 */
export function createAuthMailer(options: {
  admission: {
    consumeRecipient(kind: "send", email: string): Promise<RecipientAdmission>
  }
  scheduler: () => AuthMailScheduler
  deliver?: (message: MagicLinkMessage) => Promise<void>
  onDenied?: (reason: DeniedReason) => void
}) {
  const deliver = options.deliver ?? deliverAuthEmail
  return {
    send(message: MagicLinkMessage): void {
      options.scheduler().schedule(async () => {
        try {
          const admission = await options.admission.consumeRecipient(
            "send",
            message.email
          )
          if (!admission.allowed) {
            options.onDenied?.(admission.reason)
            return
          }
          await deliver(message)
        } catch {
          // Delivery already reported its sanitized failure; nothing carrying
          // mail content may reach the caller.
        }
      })
    },
  }
}
