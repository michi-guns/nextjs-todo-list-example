import { MagicLinkForm } from "@/components/auth/magic-link-form"
import {
  getAuthErrorMessage,
  getSafeAuthRedirect,
} from "@/src/modules/auth/presentation/auth-flow"

export const metadata = {
  title: "Magic link | Focus Rail",
  description: "Get a passwordless sign-in link for Focus Rail.",
}

export default async function MagicLinkPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; error?: string | string[] }>
}) {
  const params = await searchParams
  const errorCode = typeof params.error === "string" ? params.error : null

  return (
    <MagicLinkForm
      next={getSafeAuthRedirect(params.next)}
      initialError={errorCode ? getAuthErrorMessage(errorCode) : null}
    />
  )
}
