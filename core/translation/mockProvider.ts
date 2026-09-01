import { RealtimeEventBus, RealtimeEventType, RealtimeEvent } from "../realtime/events"
import { SessionConfig, TranslationProvider, TurnDetectionMode } from "./provider"

// Demo-mode provider so the Live screen is fully interactive without an
// OPENAI_API_KEY or a live counterpart to talk to. useLiveSession falls
// back to this automatically when the real provider fails to connect.
// `simulateTurn` is the mock-only escape hatch the UI calls when the user
// taps a zone mic in demo mode.
export function createMockProvider(): TranslationProvider & {
  simulateTurn: (speaker: "you" | "them", sourceText: string, translatedText: string) => void
} {
  const bus = new RealtimeEventBus()

  return {
    async connect() {
      await new Promise((resolve) => setTimeout(resolve, 300))
      bus.emit({ type: "ready" })
    },
    sendAudioChunk() {},
    setTurnDetection(_mode: TurnDetectionMode) {},
    on<E extends RealtimeEventType>(
      event: E,
      handler: (payload: Extract<RealtimeEvent, { type: E }>) => void
    ) {
      return bus.on(event, handler)
    },
    disconnect() {
      bus.emit({ type: "closed" })
    },
    simulateTurn(speaker, sourceText, translatedText) {
      const other = speaker === "you" ? "them" : "you"
      bus.emit({ type: "speech.start", speaker })
      bus.emit({ type: "transcript.partial", speaker, text: sourceText.slice(0, 4) })
      setTimeout(() => {
        bus.emit({ type: "transcript.final", speaker, text: sourceText })
        bus.emit({ type: "speech.end", speaker })
        setTimeout(() => {
          bus.emit({ type: "translation.final", speaker: other, text: translatedText })
        }, 350)
      }, 500)
    },
  }
}
