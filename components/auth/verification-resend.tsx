"use client"

import type { FormEvent } from "react"
import { useState } from "react"

import { AuthNotice } from "@/components/auth/auth-notice"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/auth-client"
import {
  buildVerificationCallback,
  getAuthErrorMessage,
} from "@/src/modules/auth/presentation/auth-flow"

type ResendState =
  | { readonly kind: "idle" | "sending" }
  | { readonly kind: "sent" }
  | { readonly kind: "error"; readonly message: string }

export interface VerificationResendProps {
  /** Known from the current screen; otherwise the visitor types it. */
  readonly email?: string
  readonly next: string
}

/**
 * Requests a fresh verification link. The answer is the same whether or not
 * the address exists or is already verified; the server bounds repeats.
 */
export function VerificationResend({ email, next }: VerificationResendProps) {
  const [state, setState] = useState<ResendState>({ kind: "idle" })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const address = (email ?? String(formData.get("email") ?? "")).trim()
    setState({ kind: "sending" })
    try {
      const { error } = await authClient.sendVerificationEmail({
        email: address,
        callbackURL: buildVerificationCallback(next),
      })
      setState(
        error
          ? { kind: "error", message: getAuthErrorMessage(error) }
          : { kind: "sent" }
      )
    } catch {
      setState({ kind: "error", message: getAuthErrorMessage(null) })
    }
  }

  const sending = state.kind === "sending"

  return (
    <form className="space-y-4" onSubmit={handleSubmit} aria-busy={sending}>
      {state.kind === "sent" ? (
        <AuthNotice kind="success">
          If this address is waiting for verification, we sent a new link. It
          can take a minute to arrive.
        </AuthNotice>
      ) : null}
      {state.kind === "error" ? (
        <AuthNotice kind="error">{state.message}</AuthNotice>
      ) : null}

      {email ? null : (
        <div className="space-y-2">
          <Label htmlFor="verification-resend-email">Email</Label>
          <Input
            id="verification-resend-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={sending}
            placeholder="you@example.com"
          />
        </div>
      )}

      <Button
        type="submit"
        variant="outline"
        className="w-full"
        disabled={sending}
      >
        {sending ? "Sending…" : "Send a new verification email"}
      </Button>
    </form>
  )
}
