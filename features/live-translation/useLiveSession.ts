"use client"

import { useCallback, useRef, useState } from "react"
import { toast } from "react-toastify"

import { startMicCapture, MicCapture } from "@/core/audio/capture"
import { createOpenAIRealtimeProvider } from "@/core/translation/openaiRealtimeProvider"
import { createMockProvider } from "@/core/translation/mockProvider"
import { TranslationProvider, TurnDetectionMode } from "@/core/translation/provider"
import { sessionStore } from "@/core/storage/sessionStore"

export type LiveStatus = "idle" | "connecting" | "ready" | "error"
export type Speaker = "you" | "them"

export interface TranscriptTurn {
  id: string
  speaker: Speaker
  text: string
}

// Demo mode only exists because a real turn needs OpenAI's speech-to-text -
// there is no local fallback for "what did the user actually say" once the
// old client-side Whisper path is gone. What IS always real, in both modes,
// is the microphone permission flow and the live level meter below.
const DEMO_TURNS: Record<Speaker, { source: string; translated: string }> = {
  you: { source: "Excuse me, how much is this scarf?", translated: "এই স্কার্ফটার দাম কত?" },
  them: { source: "ট্রেন স্টেশন কোথায়?", translated: "Where is the train station?" },
}

export function useLiveSession() {
  const [status, setStatus] = useState<LiveStatus>("idle")
  const [mode, setMode] = useState<"live" | "demo">("live")
  const [error, setError] = useState<string | null>(null)

  const [sourceLang, setSourceLang] = useState("en")
  const [targetLang, setTargetLang] = useState("bn")
  const [turnDetection, setTurnDetectionState] = useState<TurnDetectionMode>("push_to_talk")

  const [talkingZone, setTalkingZone] = useState<Speaker | null>(null)
  const [micLevel, setMicLevel] = useState(0)
  const [captions, setCaptions] = useState<Record<Speaker, string>>({ you: "", them: "" })
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([])
  const [elapsedSec, setElapsedSec] = useState(0)

  const providerRef = useRef<TranslationProvider | null>(null)
  const micRef = useRef<MicCapture | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const swapLanguages = useCallback(() => {
    setSourceLang(targetLang)
    setTargetLang(sourceLang)
  }, [sourceLang, targetLang])

  const attachListeners = useCallback((provider: TranslationProvider) => {
    provider.on("speech.start", ({ speaker }) => setTalkingZone(speaker))
    provider.on("speech.end", () => setTalkingZone(null))
    provider.on("transcript.partial", ({ speaker, text }) =>
      setCaptions((c) => ({ ...c, [speaker]: text }))
    )
    provider.on("transcript.final", ({ speaker, text }) => {
      setCaptions((c) => ({ ...c, [speaker]: text }))
      setTranscript((t) => [...t, { id: crypto.randomUUID(), speaker, text }])
    })
    provider.on("translation.final", ({ speaker, text }) => {
      setCaptions((c) => ({ ...c, [speaker]: text }))
      setTranscript((t) => [...t, { id: crypto.randomUUID(), speaker, text }])
    })
    provider.on("error", ({ message }) => {
      toast.error(message)
    })
  }, [])

  const startSession = useCallback(async () => {
    setStatus("connecting")
    setError(null)

    let mic: MicCapture
    try {
      mic = await startMicCapture(setMicLevel)
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not access the microphone."
      setError(message)
      setStatus("error")
      toast.error(message)
      return
    }
    micRef.current = mic

    const config = { sourceLanguage: sourceLang, targetLanguage: targetLang, turnDetection }

    const realProvider = createOpenAIRealtimeProvider()
    realProvider.attachMicStream(mic.stream)

    try {
      await realProvider.connect(config)
      realProvider.setMicEnabled?.(false) // muted until the user taps a zone
      providerRef.current = realProvider
      setMode("live")
      attachListeners(realProvider)
    } catch {
      // No OPENAI_API_KEY configured, or the handshake failed - fall back
      // to demo mode rather than leaving the screen dead. This is the
      // expected path in local dev without a key set.
      const mock = createMockProvider()
      await mock.connect(config)
      providerRef.current = mock
      setMode("demo")
      attachListeners(mock)
      toast.info("Realtime API isn't configured - showing Live in demo mode.")
    }

    setStatus("ready")
    setElapsedSec(0)
    timerRef.current = setInterval(() => setElapsedSec((s) => s + 1), 1000)
  }, [sourceLang, targetLang, turnDetection, attachListeners])

  const endSession = useCallback(() => {
    providerRef.current?.disconnect()
    micRef.current?.stop()
    if (timerRef.current) clearInterval(timerRef.current)

    if (transcript.length > 0) {
      sessionStore.addEntry({
        kind: "live",
        sourceLang,
        targetLang,
        snippet: transcript[0]?.text ?? "",
        durationSec: elapsedSec,
      })
    }

    providerRef.current = null
    micRef.current = null
    setStatus("idle")
    setTalkingZone(null)
    setMicLevel(0)
    setCaptions({ you: "", them: "" })
    setTranscript([])
  }, [transcript, sourceLang, targetLang, elapsedSec])

  const pressZone = useCallback(
    (speaker: Speaker) => {
      if (status !== "ready") return
      setTalkingZone(speaker)
      if (mode === "live") {
        providerRef.current?.setMicEnabled?.(true)
      }
    },
    [status, mode]
  )

  const releaseZone = useCallback(
    (speaker: Speaker) => {
      if (status !== "ready") return
      setTalkingZone(null)
      if (mode === "live") {
        providerRef.current?.setMicEnabled?.(false)
      } else {
        const demo = DEMO_TURNS[speaker]
        ;(providerRef.current as ReturnType<typeof createMockProvider>)?.simulateTurn(
          speaker,
          demo.source,
          demo.translated
        )
      }
    },
    [status, mode]
  )

  const setTurnDetection = useCallback((next: TurnDetectionMode) => {
    setTurnDetectionState(next)
    providerRef.current?.setTurnDetection(next)
  }, [])

  return {
    status,
    mode,
    error,
    sourceLang,
    targetLang,
    setSourceLang,
    setTargetLang,
    swapLanguages,
    turnDetection,
    setTurnDetection,
    talkingZone,
    micLevel,
    captions,
    transcript,
    elapsedSec,
    startSession,
    endSession,
    pressZone,
    releaseZone,
  }
}
