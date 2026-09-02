"use client"

import { useCallback, useRef, useState } from "react"
import { toast } from "react-toastify"

import { startMicCapture, MicCapture } from "@/core/audio/capture"
import { createOpenAIRealtimeProvider } from "@/core/translation/openaiRealtimeProvider"
import { TranslationProvider, TurnDetectionMode } from "@/core/translation/provider"
import { sessionStore } from "@/core/storage/sessionStore"
import { getPreferences } from "@/core/storage/preferences"

export type LiveStatus = "idle" | "connecting" | "ready" | "error"
export type Speaker = "you" | "them"

export interface TranscriptTurn {
  id: string
  speaker: Speaker
  text: string
}

export function useLiveSession() {
  const [status, setStatus] = useState<LiveStatus>("idle")
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
    provider.on("translation.partial", ({ speaker, text }) =>
      setCaptions((c) => ({ ...c, [speaker]: text }))
    )
    provider.on("transcript.final", ({ speaker, text }) => {
      setCaptions((c) => ({ ...c, [speaker]: "" }))
      setTranscript((t) => [...t, { id: crypto.randomUUID(), speaker, text }])
    })
    provider.on("translation.final", ({ speaker, text }) => {
      setCaptions((c) => ({ ...c, [speaker]: "" }))
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
      const { noiseSuppression } = getPreferences()
      mic = await startMicCapture(setMicLevel, { noiseSuppression })
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not access the microphone."
      setError(message)
      setStatus("error")
      toast.error(message)
      return
    }
    micRef.current = mic

    const config = { sourceLanguage: sourceLang, targetLanguage: targetLang, turnDetection }
    const provider = createOpenAIRealtimeProvider()
    provider.attachMicStream(mic.stream)

    try {
      await provider.connect(config)
    } catch (e) {
      mic.stop()
      micRef.current = null
      const message =
        e instanceof Error ? e.message : "Could not start the realtime session."
      setError(message)
      setStatus("error")
      toast.error(message)
      return
    }

    if (turnDetection === "push_to_talk") provider.setMicEnabled?.(false)
    providerRef.current = provider
    attachListeners(provider)

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
      providerRef.current?.setMicEnabled?.(true)
    },
    [status]
  )

  const releaseZone = useCallback(() => {
    if (status !== "ready") return
    setTalkingZone(null)
    providerRef.current?.setMicEnabled?.(false)
  }, [status])

  const setTurnDetection = useCallback((next: TurnDetectionMode) => {
    setTurnDetectionState(next)
    providerRef.current?.setTurnDetection(next)
  }, [])

  return {
    status,
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
