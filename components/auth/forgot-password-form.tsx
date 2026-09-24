"use client"

import type { FormEvent } from "react"
import { useState } from "react"
import Link from "next/link"

import { AuthCard } from "@/components/auth/auth-card"
import { AuthNotice } from "@/components/auth/auth-notice"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/auth-client"
import {
  RESET_PASSWORD_CALLBACK,
  buildAuthHref,
  getAuthErrorMessage,
} from "@/src/modules/auth/presentation/auth-flow"

export interface ForgotPasswordFormProps {
  readonly next: string
}

export function ForgotPasswordForm({ next }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function request(address: string) {
    setErrorMessage(null)
    setSending(true)
    try {
      const { error } = await authClient.requestPasswordReset({
        email: address,
        redirectTo: RESET_PASSWORD_CALLBACK,
      })
      if (error) setErrorMessage(getAuthErrorMessage(error))
      else setEmail(address)
    } catch {
      setErrorMessage(getAuthErrorMessage(null))
    } finally {
      setSending(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    void request(String(formData.get("email") ?? "").trim())
  }

  const signInHref = buildAuthHref("/sign-in", next)

  if (email) {
    return (
      <AuthCard
        eyebrow="Password reset"
        title="Check your inbox"
        description="Follow the link in the email to choose a new password."
      >
        <div className="space-y-5" aria-busy={sending}>
          <AuthNotice kind="success">
            If an account exists for that email, we sent a password reset link.
            It works once and expires in 30 minutes. Recent requests may need a
            short wait before another email.
          </AuthNotice>
          {errorMessage ? (
            <AuthNotice kind="error">{errorMessage}</AuthNotice>
          ) : null}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Button
              type="button"
              variant="outline"
              disabled={sending}
              onClick={() => void request(email)}
            >
              {sending ? "Sending…" : "Send another link"}
            </Button>
            <Link
              href={signInHref}
              className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      eyebrow="Password reset"
      title="Forgot your password?"
      description="Enter your email and we will send a link to choose a new password."
    >
      <form className="space-y-5" onSubmit={handleSubmit} aria-busy={sending}>
        {errorMessage ? (
          <AuthNotice kind="error">{errorMessage}</AuthNotice>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="forgot-password-email">Email</Label>
          <Input
            id="forgot-password-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={sending}
            placeholder="you@example.com"
          />
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={sending}>
          {sending ? "Sending…" : "Send reset link"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link
            href={signInHref}
            className="font-medium text-foreground underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      </form>
    </AuthCard>
  )
}
