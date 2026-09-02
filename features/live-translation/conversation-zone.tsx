"use client"

import { useEffect, useRef } from "react"
import { Mic } from "lucide-react"

import { cn } from "@/lib/utils"
import { getLanguage } from "@/core/i18n/languages"
import type { Speaker } from "./useLiveSession"

const WAVE_BARS = 12

export function ConversationZone({
  speaker,
  languageCode,
  talking,
  level,
  text,
  disabled,
  showMicButton = true,
  onPress,
  onRelease,
}: {
  speaker: Speaker
  languageCode: string
  talking: boolean
  level: number
  text: string
  disabled: boolean
  showMicButton?: boolean
  onPress: () => void
  onRelease: () => void
}) {
  const language = getLanguage(languageCode)
  const isYou = speaker === "you"
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [text])

  return (
    <div
      className={cn(
        "flex h-[240px] flex-col rounded-lg border border-border bg-card p-5 transition-colors",
        talking && isYou && "border-primary bg-accent",
        talking && !isYou && "border-speaker-them bg-speaker-them-tint"
      )}
    >
      {/* Language label */}
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "h-[7px] w-[7px] rounded-sm",
            isYou ? "bg-speaker-you" : "bg-speaker-them"
          )}
        />
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-faint">
          {isYou ? "You" : "Translate"} · {language.label}
        </span>
      </div>

      {/* Accumulated transcript — scrollable, auto-scrolls to bottom */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-4">
        {text ? (
          <p className="text-base font-medium leading-relaxed">{text}</p>
        ) : (
          <p className="flex h-full items-center justify-center text-sm text-muted-faint">
            {showMicButton ? "Hold to talk" : "Listening…"}
          </p>
        )}
      </div>

      {/* Bottom row: mic (left) + compact wave */}
      <div className="flex items-center gap-2">
        {showMicButton && (
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
              "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border-[1.5px] border-input bg-card text-muted-foreground transition-colors disabled:opacity-40",
              talking && isYou && "border-primary bg-primary text-primary-foreground"
            )}
          >
            <Mic className="h-4 w-4" />
          </button>
        )}

        <div className="flex h-[14px] items-center gap-[2.5px]" aria-hidden="true">
          {Array.from({ length: WAVE_BARS }).map((_, i) => {
            const barLevel = talking
              ? Math.max(0.15, Math.min(1, level + Math.sin(i * 0.9) * 0.25))
              : 0.25
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
      </div>
    </div>
  )
}
