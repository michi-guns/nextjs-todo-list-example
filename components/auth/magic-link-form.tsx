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

type MagicLinkStatus = "idle" | "submitting" | "success"

export interface MagicLinkFormProps {
  readonly next: string
  readonly initialError?: string | null
}

export function MagicLinkForm({ next, initialError }: MagicLinkFormProps) {
  const safeNext = getSafeAuthRedirect(next)
  const [status, setStatus] = useState<MagicLinkStatus>("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(
    initialError ? getAuthErrorMessage(initialError) : null
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setStatus("submitting")

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get("email") ?? "").trim()

    try {
      const { error } = await authClient.signIn.magicLink({
        email,
        callbackURL: safeNext,
        errorCallbackURL: buildAuthHref("/magic-link", safeNext),
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
        eyebrow="Magic link sent"
        title="Check your inbox"
        description="Use the link in the email to open your private task space. It expires shortly and can only be used once."
      >
        <div className="space-y-5">
          <AuthNotice kind="success">
            We sent a sign-in link if this address can use the magic-link flow.
          </AuthNotice>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Link
              href={buildAuthHref("/sign-in", safeNext)}
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Use a password
            </Link>
            <Link
              href="/"
              className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Return home
            </Link>
          </div>
        </div>
      </AuthCard>
    )
  }

  const isSubmitting = status === "submitting"

  return (
    <AuthCard
      eyebrow="Passwordless sign in"
      title="Use a magic link"
      description="Enter your email and we will send a short-lived link. New addresses can use the link to create an account."
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
          <Label htmlFor="magic-link-email">Email</Label>
          <Input
            id="magic-link-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={isSubmitting}
            placeholder="you@example.com"
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Sending link…" : "Email me a link"}
        </Button>

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <Link
            href={buildAuthHref("/sign-up", safeNext)}
            className="font-medium text-foreground underline underline-offset-4"
          >
            Create an account
          </Link>
          <Link
            href={buildAuthHref("/sign-in", safeNext)}
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Sign in with password
          </Link>
        </div>
      </form>
    </AuthCard>
  )
}
