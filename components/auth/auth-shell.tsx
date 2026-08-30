import Link from "next/link"

export interface AuthShellProps {
  readonly children: React.ReactNode
}

export function AuthShell({ children }: AuthShellProps) {
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
          <Link
            href="/"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Back to home
          </Link>
        </header>

        <div className="flex flex-1 items-start justify-center py-12 sm:py-16">
          <div className="w-full max-w-md">{children}</div>
        </div>

        <footer className="border-t border-border py-5 text-center text-xs text-muted-foreground">
          Keep your next step visible.
        </footer>
      </div>
    </main>
  )
}
