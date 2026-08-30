"use client"

import Link from "next/link"

import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function Error({
  reset,
}: {
  readonly error: Error & { digest?: string }
  readonly reset: () => void
}) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4 py-12 text-foreground">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm sm:p-8">
        <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
          Focus Rail
        </p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          We couldn&apos;t load this page
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          The content provider is temporarily unavailable. Try again, or return
          to the landing page.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button type="button" onClick={reset}>
            Try again
          </Button>
          <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
            Return home
          </Link>
        </div>
      </section>
    </main>
  )
}
