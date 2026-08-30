"use client"

import type { FormEvent } from "react"
import { useState } from "react"
import Link from "next/link"

import { AuthCard } from "@/components/auth/auth-card"
import { AuthNotice } from "@/components/auth/auth-notice"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/auth-client"
import {
  buildAuthHref,
  getAuthErrorMessage,
  getSafeAuthRedirect,
} from "@/src/modules/auth/presentation/auth-flow"

type SignUpStatus = "idle" | "submitting" | "success"

export interface SignUpFormProps {
  readonly next: string
}

export function SignUpForm({ next }: SignUpFormProps) {
  const safeNext = getSafeAuthRedirect(next)
  const [status, setStatus] = useState<SignUpStatus>("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)

    const formData = new FormData(event.currentTarget)
    const name = String(formData.get("name") ?? "").trim()
    const email = String(formData.get("email") ?? "").trim()
    const password = String(formData.get("password") ?? "")

    if (!name) {
      setErrorMessage("Enter your name.")
      return
    }

    setStatus("submitting")

    try {
      const { error } = await authClient.signUp.email({
        name,
        email,
        password,
        callbackURL: safeNext,
      })

      if (error) {
        setStatus("idle")
        setErrorMessage(getAuthErrorMessage(error))
        return
      }

      setStatus("success")
    } catch {
      setStatus("idle")
      setErrorMessage(getAuthErrorMessage(null))
    }
  }

  if (status === "success") {
    return (
      <AuthCard
        eyebrow="Email verification"
        title="Check your inbox"
        description="If this address can be registered, we sent a verification link. Follow it to finish creating your account."
      >
        <div className="space-y-5">
          <AuthNotice kind="success">
            Your account is waiting for email verification. The link will take
            you to your private task space.
          </AuthNotice>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Link
              href={buildAuthHref("/sign-in", safeNext)}
              className={buttonVariants({ size: "lg" })}
            >
              Continue to sign in
            </Link>
            <Link
              href={buildAuthHref("/magic-link", safeNext)}
              className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Use a magic link instead
            </Link>
          </div>
        </div>
      </AuthCard>
    )
  }

  const isSubmitting = status === "submitting"

  return (
    <AuthCard
      eyebrow="Create an account"
      title="Make room for the next step"
      description="Start a private task space with email and password. You will verify your email before signing in."
    >
      <form
        className="space-y-5"
        onSubmit={handleSubmit}
        aria-busy={isSubmitting}
      >
        {errorMessage ? (
          <AuthNotice kind="error">{errorMessage}</AuthNotice>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="sign-up-name">Name</Label>
          <Input
            id="sign-up-name"
            name="name"
            type="text"
            autoComplete="name"
            required
            disabled={isSubmitting}
            placeholder="Alex Morgan"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sign-up-email">Email</Label>
          <Input
            id="sign-up-email"
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
            <Label htmlFor="sign-up-password">Password</Label>
            <span className="text-xs text-muted-foreground">
              8–128 characters
            </span>
          </div>
          <Input
            id="sign-up-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
            disabled={isSubmitting}
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating account…" : "Create account"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href={buildAuthHref("/sign-in", safeNext)}
            className="font-medium text-foreground underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      </form>
    </AuthCard>
  )
}
