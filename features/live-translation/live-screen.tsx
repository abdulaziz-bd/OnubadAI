"use client"

import { useState } from "react"
import { ArrowLeftRight, Captions, Share2 } from "lucide-react"
import { toast } from "react-toastify"

import { Button } from "@/components/ui/button"
import { IconButton } from "@/components/ui/icon-button"
import { Segmented } from "@/components/ui/segmented"
import { LanguagePicker } from "@/components/language-picker"
import { getLanguage } from "@/core/i18n/languages"
import { cn } from "@/lib/utils"
import { useLiveSession, TranscriptTurn, Speaker } from "./useLiveSession"
import { ConversationZone } from "./conversation-zone"

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
}

function buildCardText(transcript: TranscriptTurn[], partial: string, speaker: Speaker): string {
  const past = transcript.filter((t) => t.speaker === speaker).map((t) => t.text)
  return [...past, partial].filter(Boolean).join(" ")
}

async function shareRoom() {
  const url = window.location.href
  if (navigator.share) {
    try { await navigator.share({ title: "OnubadAI Live", url }) } catch {}
  } else {
    await navigator.clipboard.writeText(url)
    toast.success("Link copied to clipboard")
  }
}

export function LiveScreen() {
  const session = useLiveSession()
  const [captionsOnly, setCaptionsOnly] = useState(false)

  const youText = buildCardText(session.transcript, session.captions.you, "you")
  const themText = buildCardText(session.transcript, session.captions.them, "them")

  return (
    <div className="mx-auto max-w-[880px] px-5 py-8 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2.5">
            <LanguagePicker value={session.sourceLang} onChange={session.setSourceLang} />
            <IconButton aria-label="Swap languages" onClick={session.swapLanguages}>
              <ArrowLeftRight />
            </IconButton>
            <LanguagePicker value={session.targetLang} onChange={session.setTargetLang} />
          </div>
          <Segmented
            aria-label="Turn detection mode"
            value={session.turnDetection}
            onChange={session.setTurnDetection}
            disabled={session.status !== "idle"}
            options={[
              { value: "push_to_talk", label: "Tap to talk" },
              { value: "server_vad", label: "Auto (VAD)" },
            ]}
          />
        </div>

        {session.status === "ready" && (
          <div className="flex items-center gap-3.5">
            <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-muted-foreground">
              <span className="h-[7px] w-[7px] animate-pulse rounded-full bg-primary" />
              Live · {formatElapsed(session.elapsedSec)}
            </span>
            <IconButton
              aria-label="Captions only"
              onClick={() => setCaptionsOnly((v) => !v)}
              className={cn(captionsOnly && "bg-accent text-foreground")}
            >
              <Captions />
            </IconButton>
            <IconButton aria-label="Share room" onClick={shareRoom}>
              <Share2 />
            </IconButton>
            <Button size="sm" onClick={session.endSession}>
              End
            </Button>
          </div>
        )}
      </div>

      {session.status !== "ready" ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-card px-6 py-16 text-center">
          {session.status === "idle" && (
            <>
              <p className="max-w-sm text-sm text-muted-foreground">
                Start a conversation and hold either side to talk. OnubadAI translates and reads
                it back in {getLanguage(session.targetLang).label}.
              </p>
              <Button variant="primary" onClick={session.startSession}>
                Start conversation
              </Button>
            </>
          )}
          {session.status === "connecting" && (
            <p className="text-sm text-muted-foreground">Connecting…</p>
          )}
          {session.status === "error" && (
            <>
              <p className="max-w-sm text-sm text-destructive">{session.error}</p>
              <Button variant="primary" onClick={session.startSession}>
                Try again
              </Button>
            </>
          )}
        </div>
      ) : captionsOnly ? (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {[
            { speaker: "you" as Speaker, lang: session.sourceLang, text: youText },
            { speaker: "them" as Speaker, lang: session.targetLang, text: themText },
          ].map(({ speaker, lang, text }) => (
            <div
              key={speaker}
              className={cn(
                "flex min-h-[320px] flex-col rounded-lg border border-border bg-card p-6 transition-colors",
                session.talkingZone === speaker && speaker === "you" && "border-primary bg-accent",
                session.talkingZone === speaker && speaker === "them" && "border-speaker-them bg-speaker-them-tint"
              )}
            >
              <div className="mb-3 flex items-center gap-1.5">
                <span className={cn("h-[7px] w-[7px] rounded-sm", speaker === "you" ? "bg-speaker-you" : "bg-speaker-them")} />
                <span className="font-mono text-[11px] uppercase tracking-wider text-muted-faint">
                  {speaker === "you" ? "You" : "Translate"} · {getLanguage(lang).label}
                </span>
              </div>
              <p className={cn("flex-1 text-2xl font-medium leading-relaxed", !text && "text-base font-normal text-muted-faint")}>
                {text || (speaker === "you" ? "Speak now…" : "Translation will appear here…")}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <ConversationZone
            speaker="you"
            languageCode={session.sourceLang}
            talking={session.talkingZone === "you"}
            level={session.micLevel}
            text={youText}
            disabled={session.talkingZone === "them"}
            showMicButton={session.turnDetection === "push_to_talk"}
            onPress={() => session.pressZone("you")}
            onRelease={session.releaseZone}
          />
          <ConversationZone
            speaker="them"
            languageCode={session.targetLang}
            talking={session.talkingZone === "them"}
            level={session.micLevel}
            text={themText}
            disabled={session.talkingZone === "you"}
            showMicButton={false}
            onPress={() => session.pressZone("them")}
            onRelease={session.releaseZone}
          />
        </div>
      )}
    </div>
  )
}
