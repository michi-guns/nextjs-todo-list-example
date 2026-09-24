import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"
import { getSafeAuthRedirect } from "@/src/modules/auth/presentation/auth-flow"

export const metadata = {
  title: "Forgot password | Focus Rail",
  description: "Request a link to choose a new Focus Rail password.",
}

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>
}) {
  const params = await searchParams

  return <ForgotPasswordForm next={getSafeAuthRedirect(params.next)} />
}
