"use client"

import { useEffect } from "react"

import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

export default function DashboardError({
  error,
  reset,
}: {
  readonly error: Error & { readonly digest?: string }
  readonly reset: () => void
}) {
  useEffect(() => {
    // Keep the route error boundary observable without exposing server details.
    console.error("Dashboard route failed", error)
  }, [error])

  return (
    <main className="grid min-h-svh place-items-center bg-background p-4">
      <Alert className="grid max-w-md gap-4 border-destructive/40 text-destructive">
        <div>
          <h1 className="text-lg font-semibold">Workspace unavailable</h1>
          <p className="mt-2 text-sm leading-6">
            We couldn&apos;t load your private workspace. Try again.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={reset}>
          Try again
        </Button>
      </Alert>
    </main>
  )
}
