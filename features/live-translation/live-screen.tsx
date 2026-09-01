"use client"

import { ArrowLeftRight, Captions, Share2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { IconButton } from "@/components/ui/icon-button"
import { Segmented } from "@/components/ui/segmented"
import { LanguagePicker } from "@/components/language-picker"
import { getLanguage } from "@/core/i18n/languages"
import { cn } from "@/lib/utils"
import { useLiveSession } from "./useLiveSession"
import { ConversationZone } from "./conversation-zone"

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
}

export function LiveScreen() {
  const session = useLiveSession()

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
            <IconButton aria-label="Captions only">
              <Captions />
            </IconButton>
            <IconButton aria-label="Share room">
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
      ) : (
        <>
          <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <ConversationZone
              speaker="you"
              languageCode={session.sourceLang}
              talking={session.talkingZone === "you"}
              level={session.micLevel}
              caption={session.captions.you}
              disabled={session.talkingZone === "them"}
              onPress={() => session.pressZone("you")}
              onRelease={session.releaseZone}
            />
            <ConversationZone
              speaker="them"
              languageCode={session.targetLang}
              talking={session.talkingZone === "them"}
              level={session.micLevel}
              caption={session.captions.them}
              disabled={session.talkingZone === "you"}
              onPress={() => session.pressZone("them")}
              onRelease={session.releaseZone}
            />
          </div>

          <div
            className={cn(
              "font-mono text-[11px] uppercase tracking-wider text-muted-faint",
              session.transcript.length > 0 ? "mb-2.5" : "hidden"
            )}
          >
            Conversation
          </div>
          <div className="flex max-h-[260px] flex-col gap-3 overflow-y-auto">
            {session.transcript.map((turn) => (
              <div key={turn.id} className="flex gap-2.5 text-sm leading-relaxed">
                <span
                  className={cn(
                    "w-11 flex-shrink-0 pt-0.5 font-mono text-[10.5px] uppercase tracking-wider",
                    turn.speaker === "you" ? "text-speaker-you" : "text-speaker-them"
                  )}
                >
                  {turn.speaker === "you" ? "You" : "Them"}
                </span>
                <span>{turn.text}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
