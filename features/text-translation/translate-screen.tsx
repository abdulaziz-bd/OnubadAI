"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowLeftRight, Copy, Volume2 } from "lucide-react"
import { toast } from "react-toastify"

import { LanguagePicker } from "@/components/language-picker"
import { IconButton } from "@/components/ui/icon-button"
import { Segmented } from "@/components/ui/segmented"
import { sessionStore } from "@/core/storage/sessionStore"

type Formality = "casual" | "neutral" | "formal"

const DEBOUNCE_MS = 500

export function TranslateScreen() {
  const [sourceLang, setSourceLang] = useState("en")
  const [targetLang, setTargetLang] = useState("es")
  const [text, setText] = useState("")
  const [translation, setTranslation] = useState("")
  const [formality, setFormality] = useState<Formality>("neutral")
  const [isTranslating, setIsTranslating] = useState(false)

  const historyEntryId = useRef<string | null>(null)

  useEffect(() => {
    if (!text.trim()) {
      setTranslation("")
      historyEntryId.current = null
      return
    }

    const timer = setTimeout(async () => {
      setIsTranslating(true)
      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, sourceLang, targetLang, formality }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Translation failed.")
        setTranslation(data.translation)

        const snippet = text.slice(0, 120)
        if (historyEntryId.current) {
          sessionStore.updateEntry(historyEntryId.current, { snippet })
        } else {
          historyEntryId.current = sessionStore.addEntry({
            kind: "text",
            sourceLang,
            targetLang,
            snippet,
          })
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Translation failed.")
      } finally {
        setIsTranslating(false)
      }
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, sourceLang, targetLang, formality])

  // A language swap is a new translation task, not an edit of the last one.
  useEffect(() => {
    historyEntryId.current = null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceLang, targetLang])

  function swap() {
    setSourceLang(targetLang)
    setTargetLang(sourceLang)
    setText(translation)
    setTranslation(text)
  }

  function speak(value: string, lang: string) {
    if (!value || typeof window === "undefined" || !window.speechSynthesis) return
    const utterance = new SpeechSynthesisUtterance(value)
    utterance.lang = lang
    window.speechSynthesis.speak(utterance)
  }

  return (
    <div className="mx-auto max-w-[880px] px-5 py-8 sm:px-6">
      <div className="mb-5 flex items-center gap-2.5">
        <LanguagePicker value={sourceLang} onChange={setSourceLang} />
        <IconButton aria-label="Swap languages" onClick={swap}>
          <ArrowLeftRight />
        </IconButton>
        <LanguagePicker value={targetLang} onChange={setTargetLang} />
      </div>

      <div className="grid grid-cols-1 overflow-hidden rounded-lg border border-border bg-card sm:grid-cols-2">
        <div className="flex min-h-[230px] flex-col border-b border-border p-5 sm:border-b-0 sm:border-r">
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-faint">
            Source
          </span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type or paste text…"
            className="mt-2.5 flex-1 resize-none bg-transparent text-[17px] leading-relaxed outline-none placeholder:text-muted-faint"
          />
          <div className="mt-3.5 flex items-center justify-between pt-0">
            <span className="font-mono text-[11.5px] text-muted-faint">{text.length} / 2000</span>
          </div>
        </div>

        <div className="flex min-h-[230px] flex-col p-5">
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-faint">
            Translation
          </span>
          <p className="mt-2.5 flex-1 text-[17px] leading-relaxed">
            {isTranslating ? (
              <span className="text-muted-faint">Translating…</span>
            ) : (
              translation
            )}
          </p>
          <div className="mt-3.5 flex items-center justify-between pt-0">
            <span className="font-mono text-[11.5px] text-muted-faint capitalize">
              {formality} tone
            </span>
            <div className="flex gap-0.5">
              <IconButton
                aria-label="Listen to translation"
                onClick={() => speak(translation, targetLang)}
                disabled={!translation}
              >
                <Volume2 />
              </IconButton>
              <IconButton
                aria-label="Copy translation"
                disabled={!translation}
                onClick={() => {
                  navigator.clipboard.writeText(translation)
                  toast.success("Copied")
                }}
              >
                <Copy />
              </IconButton>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <Segmented
          aria-label="Formality"
          value={formality}
          onChange={setFormality}
          options={[
            { value: "casual", label: "Casual" },
            { value: "neutral", label: "Neutral" },
            { value: "formal", label: "Formal" },
          ]}
        />
      </div>
    </div>
  )
}
