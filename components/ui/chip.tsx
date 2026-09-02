import * as React from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

const Chip = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { withCaret?: boolean }
>(({ className, withCaret = true, children, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn(
      "inline-flex items-center gap-1.5 rounded-full border border-input bg-card px-3 py-1.5 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      className
    )}
    {...props}
  >
    {children}
    {withCaret && <ChevronDown className="h-3.5 w-3.5 opacity-55" />}
  </button>
))
Chip.displayName = "Chip"

export { Chip }
