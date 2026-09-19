import { captureMagicLink, type MagicLinkMessage } from "./local-mailbox"
import { readResendConfig, sendResendAuthEmail } from "./resend-mail"
import { observeOperation } from "../../../shared/logging/operation"

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
