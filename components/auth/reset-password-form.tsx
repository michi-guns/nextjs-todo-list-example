"use client"

import type { FormEvent } from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { AuthCard } from "@/components/auth/auth-card"
import { AuthNotice } from "@/components/auth/auth-notice"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/auth-client"
import {
  RESET_PASSWORD_CALLBACK,
  getAuthErrorMessage,
  type RecoveryLinkError,
} from "@/src/modules/auth/presentation/auth-flow"

export interface ResetPasswordFormProps {
  readonly token: string | null
  readonly error: RecoveryLinkError | null
}

export function ResetPasswordForm({ token, error }: ResetPasswordFormProps) {
  const router = useRouter()
  const [linkError, setLinkError] = useState<RecoveryLinkError | null>(
    token ? error : (error ?? "INVALID_TOKEN")
  )
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // The token stays in memory only: drop it from the address bar and history.
  useEffect(() => {
    if (window.location.search)
      window.history.replaceState(null, "", RESET_PASSWORD_CALLBACK)
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    const formData = new FormData(event.currentTarget)
    const newPassword = String(formData.get("password") ?? "")
    if (newPassword !== String(formData.get("confirm-password") ?? "")) {
      setErrorMessage("The passwords do not match.")
      return
    }
    setSaving(true)
    try {
      const result = await authClient.resetPassword({
        newPassword,
        token: token!,
      })
      if (!result.error) {
        router.replace("/sign-in?reset=success")
        return
      }
      if (result.error.code === "INVALID_TOKEN") setLinkError("INVALID_TOKEN")
      else setErrorMessage(getAuthErrorMessage(result.error))
    } catch {
      setErrorMessage(getAuthErrorMessage(null))
    }
    setSaving(false)
  }

  if (linkError) {
    return (
      <AuthCard
        eyebrow="Password reset"
        title="This link cannot be used"
        description="Reset links work once and expire after 30 minutes."
      >
        <div className="space-y-5">
          <AuthNotice kind="error">{getAuthErrorMessage(linkError)}</AuthNotice>
          <Link
            href="/forgot-password"
            className={buttonVariants({ size: "lg", className: "w-full" })}
          >
            Request a new link
          </Link>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      eyebrow="Password reset"
      title="Choose a new password"
      description="Saving it signs you out everywhere. Then sign in with the new password."
    >
      <form className="space-y-5" onSubmit={handleSubmit} aria-busy={saving}>
        {errorMessage ? (
          <AuthNotice kind="error">{errorMessage}</AuthNotice>
        ) : null}

        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <Label htmlFor="reset-new-password">New password</Label>
            <span className="text-xs text-muted-foreground">
              8–128 characters
            </span>
          </div>
          <Input
            id="reset-new-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
            disabled={saving}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reset-confirm-password">Confirm new password</Label>
          <Input
            id="reset-confirm-password"
            name="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
            disabled={saving}
          />
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={saving}>
          {saving ? "Saving…" : "Save new password"}
        </Button>
      </form>
    </AuthCard>
  )
}
