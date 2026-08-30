import { Button } from "@/components/ui/button"

import type { DashboardUser } from "./types"

export interface AppHeaderProps {
  readonly user: DashboardUser
  readonly signOut: (formData: FormData) => Promise<void>
}

export function AppHeader({ user, signOut }: AppHeaderProps) {
  const displayName = user.name?.trim() || user.email

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-4 py-4 sm:px-6 lg:px-8">
      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Focus Rail
        </p>
        <p className="truncate text-sm font-medium" title={user.email}>
          {displayName}
        </p>
      </div>
      <form action={signOut}>
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </header>
  )
}
