import { cn } from "@/lib/utils"

export interface AuthNoticeProps {
  readonly kind: "error" | "success"
  readonly children: React.ReactNode
}

export function AuthNotice({ kind, children }: AuthNoticeProps) {
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      aria-live="polite"
      className={cn(
        "rounded-lg border px-3 py-2.5 text-sm leading-5",
        kind === "error"
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-primary/30 bg-muted text-foreground"
      )}
    >
      {children}
    </div>
  )
}
