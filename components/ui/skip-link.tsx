import type { ComponentProps, ReactNode } from "react"

import { cn } from "@/lib/utils"

export interface SkipLinkProps extends Omit<ComponentProps<"a">, "href"> {
  readonly targetId: string
  readonly children?: ReactNode
}

export function SkipLink({
  targetId,
  className,
  children = "Skip to main content",
  ...props
}: SkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className={cn(
        "sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:rounded-lg focus:border focus:border-border focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-md focus:ring-3 focus:ring-ring/30 focus:outline-none",
        className
      )}
      {...props}
    >
      {children}
    </a>
  )
}
