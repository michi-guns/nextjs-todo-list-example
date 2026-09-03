import { captureMagicLink, type MagicLinkMessage } from "./local-mailbox"

export async function deliverAuthEmail(
  message: MagicLinkMessage
): Promise<void> {
  if (process.env.APP_ENV === "preview") return
  await captureMagicLink(message)
}
