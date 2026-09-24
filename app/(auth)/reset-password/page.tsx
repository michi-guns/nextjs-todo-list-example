import { ResetPasswordForm } from "@/components/auth/reset-password-form"
import { getRecoveryLinkError } from "@/src/modules/auth/presentation/auth-flow"

export const metadata = {
  title: "Choose a new password | Focus Rail",
  description: "Choose a new password for your Focus Rail account.",
  // The reset token arrives in this page's URL; never send it onward.
  referrer: "no-referrer",
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{
    token?: string | string[]
    error?: string | string[]
  }>
}) {
  const params = await searchParams
  const token = typeof params.token === "string" ? params.token : null

  return (
    <ResetPasswordForm
      token={token}
      error={getRecoveryLinkError(params.error)}
    />
  )
}
