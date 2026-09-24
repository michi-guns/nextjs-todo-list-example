"use client"

import type { FormEvent } from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { AuthCard } from "@/components/auth/auth-card"
import { AuthNotice } from "@/components/auth/auth-notice"
import { VerificationResend } from "@/components/auth/verification-resend"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/auth-client"
import {
  buildAuthHref,
  buildVerificationCallback,
  getAuthErrorMessage,
  getSafeAuthRedirect,
} from "@/src/modules/auth/presentation/auth-flow"

type SignInStatus = "idle" | "submitting" | "redirecting"

export interface SignInFormProps {
  readonly next: string
  /** Shown once after a successful password reset. */
  readonly passwordReset?: boolean
}

export function SignInForm({ next, passwordReset = false }: SignInFormProps) {
  const router = useRouter()
  const safeNext = getSafeAuthRedirect(next)
  const [status, setStatus] = useState<SignInStatus>("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  // Set when the account exists but is still waiting for verification.
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setUnverifiedEmail(null)
    setStatus("submitting")

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get("email") ?? "").trim()
    const password = String(formData.get("password") ?? "")
    const rememberMe = formData.get("remember-me") === "on"

    try {
      const { error } = await authClient.signIn.email({
        email,
        password,
        rememberMe,
        // Used only for the verification email an unverified sign-in sends.
        callbackURL: buildVerificationCallback(safeNext),
      })

      if (error) {
        setStatus("idle")
        setErrorMessage(getAuthErrorMessage(error))
        if (error.code === "EMAIL_NOT_VERIFIED") setUnverifiedEmail(email)
        return
      }

      setStatus("redirecting")
      router.replace(safeNext)
    } catch {
      setStatus("idle")
      setErrorMessage(getAuthErrorMessage(null))
    }
  }

  const isSubmitting = status === "submitting" || status === "redirecting"

  return (
    <AuthCard
      eyebrow="Welcome back"
      title="Return to your focus"
      description="Sign in to pick up your private lists and tasks where you left them."
    >
      <form
        className="space-y-5"
        onSubmit={handleSubmit}
        aria-busy={isSubmitting}
      >
        {passwordReset && !errorMessage ? (
          <AuthNotice kind="success">
            Your password was changed and every session was signed out. Sign in
            with your new password.
          </AuthNotice>
        ) : null}
        {errorMessage ? (
          <AuthNotice kind="error">{errorMessage}</AuthNotice>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="sign-in-email">Email</Label>
          <Input
            id="sign-in-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={isSubmitting}
            placeholder="you@example.com"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <Label htmlFor="sign-in-password">Password</Label>
            <Link
              href={buildAuthHref("/forgot-password", safeNext)}
              className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="sign-in-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            maxLength={128}
            disabled={isSubmitting}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            name="remember-me"
            defaultChecked
            disabled={isSubmitting}
            className="size-4 rounded border-input accent-primary focus-visible:ring-3 focus-visible:ring-ring/30"
          />
          Keep me signed in on this device
        </label>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={isSubmitting}
        >
          {status === "redirecting"
            ? "Opening your task space…"
            : isSubmitting
              ? "Signing in…"
              : "Sign in"}
        </Button>

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <Link
            href={buildAuthHref("/sign-up", safeNext)}
            className="font-medium text-foreground underline underline-offset-4"
          >
            Create an account
          </Link>
          <Link
            href={buildAuthHref("/magic-link", safeNext)}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Use a magic link
          </Link>
        </div>
      </form>
      {unverifiedEmail ? (
        <div className="mt-5">
          <VerificationResend email={unverifiedEmail} next={safeNext} />
        </div>
      ) : null}
    </AuthCard>
  )
}
