import { RealtimeSession } from "../realtime/session"
import { RealtimeEventType, RealtimeEvent } from "../realtime/events"
import { SessionConfig, TranslationProvider, TurnDetectionMode } from "./provider"

// WebRTC (what RealtimeSession uses) streams the mic track directly over
// the peer connection - it doesn't need audio pushed chunk by chunk the way
// a WebSocket transport would. `sendAudioChunk` stays on the interface for
// provider-shape compatibility but is a no-op here; the mic MediaStream is
// attached once in `connect`.
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
    sendAudioChunk() {
      // no-op: see comment above
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
    // Not part of the shared interface - the WebRTC provider needs the
    // stream before connect() so the mic permission prompt and the level
    // meter can start before the network handshake finishes.
    attachMicStream(stream: MediaStream) {
      micStream = stream
    },
  } as TranslationProvider & { attachMicStream: (stream: MediaStream) => void }
}
