import { RealtimeSession } from "../realtime/session"
import { RealtimeEventType, RealtimeEvent } from "../realtime/events"
import { SessionConfig, TranslationProvider, TurnDetectionMode } from "./provider"

export function createOpenAIRealtimeProvider(): TranslationProvider & {
  attachMicStream: (stream: MediaStream) => void
} {
  const session = new RealtimeSession()
  let micStream: MediaStream | null = null

  return {
    async connect(config: SessionConfig) {
      if (!micStream) {
        throw new Error("Call attachMicStream before connect().")
      }
      await session.connect(config, micStream)
    },
    setTurnDetection(mode: TurnDetectionMode) {
      session.setTurnDetection(mode)
    },
    setMicEnabled(enabled: boolean) {
      session.setMicEnabled(enabled)
    },
    on<E extends RealtimeEventType>(
      event: E,
      handler: (payload: Extract<RealtimeEvent, { type: E }>) => void
    ) {
      return session.on(event, handler)
    },
    disconnect() {
      session.disconnect()
      micStream = null
    },
    // Not on the shared interface: needed before connect() so mic + meter can start early.
    attachMicStream(stream: MediaStream) {
      micStream = stream
    },
  } as TranslationProvider & { attachMicStream: (stream: MediaStream) => void }
}
