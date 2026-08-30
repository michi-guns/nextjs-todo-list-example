import type { ReactNode } from "react"

export interface AuthCardProps {
  readonly eyebrow: string
  readonly title: string
  readonly description: string
  readonly children: ReactNode
}

export function AuthCard({
  eyebrow,
  title,
  description,
  children,
}: AuthCardProps) {
  return (
    <section
      aria-labelledby="auth-card-title"
      className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"
    >
      <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
        {eyebrow}
      </p>
      <h1
        id="auth-card-title"
        className="mt-3 text-2xl font-semibold tracking-tight text-balance"
      >
        {title}
      </h1>
      <p className="mt-3 text-sm leading-6 text-pretty text-muted-foreground">
        {description}
      </p>
      <div className="mt-7">{children}</div>
    </section>
  )
}
