import Link from "next/link"
import { redirect } from "next/navigation"

import { AuthCard } from "@/components/auth/auth-card"
import { AuthNotice } from "@/components/auth/auth-notice"
import { VerificationResend } from "@/components/auth/verification-resend"
import { buttonVariants } from "@/components/ui/button"
import {
  buildAuthHref,
  getAuthErrorMessage,
  getRecoveryLinkError,
  getSafeAuthRedirect,
} from "@/src/modules/auth/presentation/auth-flow"
import { getCurrentUser } from "@/src/modules/auth/presentation/current-user"

export const metadata = {
  title: "Verify email | Focus Rail",
  description: "Finish verifying your Focus Rail email address.",
}

/**
 * Every verification link returns here. Private content opens only with the
 * real session Better Auth created; failures get a fresh-link path.
 */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; error?: string | string[] }>
}) {
  const params = await searchParams
  const next = getSafeAuthRedirect(params.next)
  const linkError = getRecoveryLinkError(params.error)

  if (linkError) {
    return (
      <AuthCard
        eyebrow="Email verification"
        title="This link cannot be used"
        description="Verification links expire. Request a new one below."
      >
        <div className="space-y-5">
          <AuthNotice kind="error">{getAuthErrorMessage(linkError)}</AuthNotice>
          <VerificationResend next={next} />
          <p className="text-center text-sm text-muted-foreground">
            Already verified?{" "}
            <Link
              href={buildAuthHref("/sign-in", next)}
              className="font-medium text-foreground underline underline-offset-4"
            >
              Sign in
            </Link>
          </p>
        </div>
      </AuthCard>
    )
  }

  if (await getCurrentUser()) redirect(next)

  return (
    <AuthCard
      eyebrow="Email verification"
      title="Sign in to continue"
      description="If your email is verified, sign in to open your task space."
    >
      <Link
        href={buildAuthHref("/sign-in", next)}
        className={buttonVariants({ size: "lg", className: "w-full" })}
      >
        Continue to sign in
      </Link>
    </AuthCard>
  )
}
