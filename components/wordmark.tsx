import { cn } from "@/lib/utils"

// Typography carries the brand; small boxed icons misread at 26px.
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-extrabold tracking-tight", className)}>
      Onubad<span className="text-primary">AI</span>
    </span>
  )
}
