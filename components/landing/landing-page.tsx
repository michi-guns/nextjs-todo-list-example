import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { LandingContent } from "@/src/modules/landing/domain/landing-content"

export interface LandingPageProps {
  readonly content: LandingContent
}

export function LandingPage({ content }: LandingPageProps) {
  const secondaryCtaLabel = content.secondaryCtaLabel ?? "Sign in"

  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex min-h-svh w-full max-w-7xl flex-col px-4 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border py-5">
          <Link
            href="/"
            className="inline-flex items-center gap-3 text-sm font-semibold tracking-[0.18em] uppercase"
          >
            <span
              aria-hidden="true"
              className="inline-flex size-8 items-center justify-center rounded-lg bg-primary text-xs text-primary-foreground"
            >
              FR
            </span>
            Focus Rail
          </Link>
          <nav
            aria-label="Authentication"
            className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm"
          >
            <Link
              href="/magic-link"
              className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Magic link
            </Link>
            <Link
              href="/sign-in"
              className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Sign in
            </Link>
          </nav>
        </header>

        <div className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(18rem,0.95fr)] lg:gap-20 lg:py-20">
          <section className="max-w-2xl">
            <p className="mb-5 text-xs font-semibold tracking-[0.22em] text-muted-foreground uppercase">
              Personal task system
            </p>
            <h1 className="max-w-xl text-4xl leading-[1.08] font-semibold tracking-tight text-balance wrap-anywhere sm:text-5xl lg:text-6xl">
              {content.headline}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-pretty wrap-anywhere text-muted-foreground">
              {content.blurb}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/sign-up"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-auto min-h-9 max-w-full text-center wrap-anywhere whitespace-normal"
                )}
              >
                {content.primaryCtaLabel}
              </Link>
              <Link
                href="/sign-in"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-auto min-h-9 max-w-full text-center wrap-anywhere whitespace-normal"
                )}
              >
                {secondaryCtaLabel}
              </Link>
            </div>
          </section>

          <aside
            aria-label="Focus Rail preview"
            className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7"
          >
            <div aria-hidden="true" className="space-y-6">
              <div className="flex items-center justify-between gap-4 border-b border-border pb-5">
                <div>
                  <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                    Today
                  </p>
                  <p className="mt-1 text-lg font-medium">A clear next step</p>
                </div>
                <span className="size-3 rounded-full bg-primary" />
              </div>
              <div className="grid gap-3">
                {[
                  ["Inbox", "3 focused tasks"],
                  ["Personal", "Keep momentum"],
                  ["Planning", "Make room to think"],
                ].map(([label, detail], index) => (
                  <div
                    key={label}
                    className={cn(
                      "flex items-center justify-between gap-4 rounded-xl border px-4 py-3",
                      index === 0
                        ? "border-primary/40 bg-muted"
                        : "border-border bg-background"
                    )}
                  >
                    <span className="min-w-0 truncate text-sm font-medium">
                      {label}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {detail}
                    </span>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-dashed border-border px-4 py-5">
                <div className="h-2.5 w-3/4 rounded-full bg-muted" />
                <div className="mt-3 h-2.5 w-1/2 rounded-full bg-muted" />
              </div>
            </div>
          </aside>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border py-5 text-xs text-muted-foreground">
          <span>Private by default.</span>
          <Link
            href="/magic-link"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Sign in without a password
          </Link>
        </footer>
      </div>
    </main>
  )
}
