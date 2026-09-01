"use client"

import { Mic } from "lucide-react"

import { cn } from "@/lib/utils"
import { getLanguage } from "@/core/i18n/languages"
import type { Speaker } from "./useLiveSession"

const METER_BARS = 20

export function ConversationZone({
  speaker,
  languageCode,
  talking,
  level,
  caption,
  disabled,
  onPress,
  onRelease,
}: {
  speaker: Speaker
  languageCode: string
  talking: boolean
  level: number
  caption: string
  disabled: boolean
  onPress: () => void
  onRelease: () => void
}) {
  const language = getLanguage(languageCode)
  const isYou = speaker === "you"

  return (
    <div
      className={cn(
        "flex min-h-[240px] flex-col items-center gap-3 rounded-lg border border-border bg-card p-5 text-center transition-colors",
        talking && isYou && "border-primary bg-accent",
        talking && !isYou && "border-speaker-them bg-speaker-them-tint"
      )}
    >
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "h-[7px] w-[7px] rounded-sm",
            isYou ? "bg-speaker-you" : "bg-speaker-them"
          )}
        />
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-faint">
          {isYou ? "You" : "Them"} · {language.label}
        </span>
      </div>

      <button
        type="button"
        disabled={disabled}
        onMouseDown={onPress}
        onMouseUp={onRelease}
        onMouseLeave={() => talking && onRelease()}
        onTouchStart={(e) => {
          e.preventDefault()
          onPress()
        }}
        onTouchEnd={onRelease}
        aria-pressed={talking}
        title={talking ? "Release to send" : "Hold to talk"}
        className={cn(
          "flex h-[52px] w-[52px] flex-shrink-0 items-center justify-center rounded-full border-[1.5px] border-input bg-card text-muted-foreground transition-colors disabled:opacity-40",
          talking &&
            (isYou
              ? "border-primary bg-primary text-primary-foreground"
              : "border-speaker-them bg-speaker-them text-white")
        )}
      >
        <Mic className="h-5 w-5" />
      </button>

      <div className="flex h-[18px] items-center justify-center gap-[2.5px]" aria-hidden="true">
        {Array.from({ length: METER_BARS }).map((_, i) => {
          const barLevel = talking ? Math.max(0.15, Math.min(1, level + Math.sin(i) * 0.15)) : 0.2
          return (
            <span
              key={i}
              className={cn(
                "w-[2.5px] rounded-sm bg-border transition-[height]",
                talking && (isYou ? "bg-speaker-you" : "bg-speaker-them")
              )}
              style={{ height: `${barLevel * 100}%` }}
            />
          )
        })}
      </div>

      <p
        className={cn(
          "flex min-h-[50px] items-center justify-center text-lg font-medium leading-snug",
          !caption && "text-sm font-normal text-muted-faint"
        )}
      >
        {caption || "Hold and speak"}
      </p>
    </div>
  )
}
