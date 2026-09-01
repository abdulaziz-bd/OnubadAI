import * as React from "react"

import { cn } from "@/lib/utils"

const IconButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn(
      "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-sm border border-transparent text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&>svg]:h-[17px] [&>svg]:w-[17px]",
      className
    )}
    {...props}
  />
))
IconButton.displayName = "IconButton"

export { IconButton }
