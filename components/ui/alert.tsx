import * as React from "react"

import { cn } from "@/lib/utils"

function Alert({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="alert"
      data-slot="alert"
      className={cn(
        "relative w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-card-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Alert }
