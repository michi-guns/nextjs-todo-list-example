import { SignInForm } from "@/components/auth/sign-in-form"
import { getSafeAuthRedirect } from "@/src/modules/auth/presentation/auth-flow"

export const metadata = {
  title: "Sign in | Focus Rail",
  description: "Sign in to your private Focus Rail task space.",
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>
}) {
  const params = await searchParams

  return <SignInForm next={getSafeAuthRedirect(params.next)} />
}
