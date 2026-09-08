import { z } from "zod"

import type { MagicLinkMessage } from "./local-mailbox"

const productionMail = z.object({
  APP_ENV: z.literal("production"),
  NODE_ENV: z.literal("production"),
  APP_MAIL_TRANSPORT: z.literal("remote"),
  APP_MAIL_PROVIDER: z.literal("resend"),
  SECRET_NAMESPACE: z.literal("production"),
  BETTER_AUTH_LOCAL_MAILBOX: z.enum(["false", ""]).optional(),
  RESEND_API_KEY: z
    .string()
    .trim()
    .regex(/^re_[A-Za-z0-9_-]+$/),
  APP_MAIL_FROM: z.email().refine((value) => {
    const domain = value.slice(value.lastIndexOf("@") + 1).toLowerCase()
    return domain !== "resend.dev" && !domain.endsWith(".resend.dev")
  }),
})

export interface ResendConfig {
  readonly apiKey: string
  readonly from: string
}

export function readResendConfig(
  environment: Readonly<Record<string, string | undefined>>
): ResendConfig {
  const result = productionMail.safeParse(environment)
  if (!result.success) {
    // Zod issues can contain rejected configuration values. Do not expose them.
    throw new Error("Invalid Production Resend configuration")
  }
  return { apiKey: result.data.RESEND_API_KEY, from: result.data.APP_MAIL_FROM }
}

export async function sendResendAuthEmail(
  config: ResendConfig,
  message: MagicLinkMessage
): Promise<void> {
  const verification = message.metadata?.kind === "email-verification"
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({
        from: config.from,
        to: [message.email],
        subject: verification ? "Verify your email" : "Your sign-in link",
        text: `${verification ? "Verify your email" : "Sign in"} using this link:\n\n${message.url}\n\nIf you did not request this, you can ignore this email.`,
      }),
    })
    if (!response.ok) throw new Error("Provider rejected request")
    const result = z
      .object({ id: z.string().min(1) })
      .safeParse(await response.json())
    if (!result.success) throw new Error("Invalid provider response")
  } catch {
    // Provider bodies and network errors may include message content or secrets.
    throw new Error("Resend auth email delivery failed")
  }
}
