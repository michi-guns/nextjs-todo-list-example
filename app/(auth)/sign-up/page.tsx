import { SignUpForm } from "@/components/auth/sign-up-form"
import { getSafeAuthRedirect } from "@/src/modules/auth/presentation/auth-flow"

export const metadata = {
  title: "Create an account | Focus Rail",
  description: "Create a private Focus Rail task space.",
}

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>
}) {
  const params = await searchParams

  return <SignUpForm next={getSafeAuthRedirect(params.next)} />
}
