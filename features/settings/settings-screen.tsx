"use client"

import { useEffect, useState } from "react"
import { Play } from "lucide-react"
import { toast } from "react-toastify"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Segmented } from "@/components/ui/segmented"
import { cn } from "@/lib/utils"
import { getPreferences, setPreferences, Preferences } from "@/core/storage/preferences"
import { sessionStore } from "@/core/storage/sessionStore"

const VOICES: { id: Preferences["voice"]; label: string; description: string }[] = [
  { id: "nova", label: "Nova", description: "Warm · Friendly" },
  { id: "alloy", label: "Alloy", description: "Neutral · Clear" },
  { id: "onyx", label: "Onyx", description: "Deep · Confident" },
]

export function SettingsScreen() {
  const [prefs, setPrefs] = useState<Preferences | null>(null)
  const [saveHistory, setSaveHistory] = useState(true)

  useEffect(() => {
    setPrefs(getPreferences())
    setSaveHistory(!sessionStore.isEphemeral())
  }, [])

  function update(patch: Partial<Preferences>) {
    setPrefs((current) => (current ? { ...current, ...patch } : current))
    setPreferences(patch)
  }

  async function speakSample(voice: string) {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: `Hi, I'm ${voice}. I'll read your translations.`, voice }),
    })
    if (!res.ok) return
    const url = URL.createObjectURL(await res.blob())
    const audio = new Audio(url)
    audio.onended = () => URL.revokeObjectURL(url)
    audio.play()
  }

  if (!prefs) return null

  return (
    <div className="mx-auto max-w-[720px] px-5 py-8 sm:px-6">
      <h1 className="mb-6 text-xl font-bold">Settings</h1>

      <SettingsGroup title="Voice & audio">
        <Row label="Noise suppression" sub="Reduce background noise while listening">
          <Switch
            checked={prefs.noiseSuppression}
            onCheckedChange={(v) => update({ noiseSuppression: v })}
          />
        </Row>
        <div className="border-t border-border py-3.5">
          <div className="mb-2.5 text-sm font-medium">Translated voice</div>
          <div className="grid grid-cols-3 gap-2">
            {VOICES.map((voice) => (
              <button
                key={voice.id}
                type="button"
                onClick={() => update({ voice: voice.id })}
                className={cn(
                  "flex flex-col gap-1.5 rounded-md border border-input bg-background px-3 py-2.5 text-left",
                  prefs.voice === voice.id && "border-primary bg-accent"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{voice.label}</span>
                  <span
                    className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-secondary hover:bg-muted"
                    onClick={(e) => {
                      e.stopPropagation()
                      speakSample(voice.id)
                    }}
                  >
                    <Play className="h-2.5 w-2.5" />
                  </span>
                </div>
                <span className="text-[11px] text-muted-faint">{voice.description}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="border-t border-border py-3.5">
          <div className="mb-2.5 text-sm font-medium">Speech rate</div>
          <input
            type="range"
            min={0.5}
            max={1.5}
            step={0.1}
            value={prefs.speechRate}
            onChange={(e) => update({ speechRate: Number(e.target.value) })}
            className="w-full accent-primary"
          />
        </div>
      </SettingsGroup>

      <SettingsGroup title="Conversation">
        <Row label="Auto-read translations">
          <Switch
            checked={prefs.autoReadTranslations}
            onCheckedChange={(v) => update({ autoReadTranslations: v })}
          />
        </Row>
      </SettingsGroup>

      <SettingsGroup title="Appearance">
        <Row label="Text size" sub="Applies across Live, Translate, and History">
          <Segmented
            aria-label="Text size"
            value={prefs.textSize}
            onChange={(v) => update({ textSize: v })}
            options={[
              { value: "sm", label: "Small" },
              { value: "default", label: "Default" },
              { value: "lg", label: "Large" },
            ]}
          />
        </Row>
      </SettingsGroup>

      <SettingsGroup title="Privacy">
        <Row label="Save conversation history" sub="Off means every session is ephemeral">
          <Switch
            checked={saveHistory}
            onCheckedChange={(v) => {
              setSaveHistory(v)
              sessionStore.setEphemeral(!v)
            }}
          />
        </Row>
        <Row label="Clear all data" sub="Removes history and starred phrases from this device">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              sessionStore.clearAll()
              toast.success("All data cleared")
            }}
          >
            Clear data
          </Button>
        </Row>
      </SettingsGroup>
    </div>
  )
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-7">
      <h3 className="mb-2.5 text-[13px] font-bold uppercase tracking-wide text-muted-faint">
        {title}
      </h3>
      <div className="rounded-lg border border-border bg-card px-4">{children}</div>
    </div>
  )
}

function Row({
  label,
  sub,
  children,
}: {
  label: string
  sub?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-border py-3.5 first:border-t-0">
      <div>
        <div className="text-[14.5px] font-medium">{label}</div>
        {sub && <div className="mt-0.5 text-xs text-muted-faint">{sub}</div>}
      </div>
      {children}
    </div>
  )
}
