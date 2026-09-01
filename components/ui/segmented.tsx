"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

interface SegmentedProps<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  "aria-label": string
  className?: string
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  ...rest
}: SegmentedProps<T>) {
  return (
    <div
      role="group"
      className={cn(
        "inline-flex gap-0.5 rounded-full border border-input bg-secondary p-0.5",
        className
      )}
      {...rest}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold text-muted-foreground transition-colors",
            value === opt.value && "bg-card text-foreground shadow-sm"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export { Segmented }
