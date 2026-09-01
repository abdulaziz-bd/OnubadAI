import { RealtimeEvent, RealtimeEventType } from "../realtime/events"

export type TurnDetectionMode = "server_vad" | "push_to_talk"

export interface SessionConfig {
  sourceLanguage: string
  targetLanguage: string
  turnDetection: TurnDetectionMode
  voice?: string
}

// Every live-translation backend implements this. `openaiRealtimeProvider`
// is the only real implementation right now; `mockProvider` satisfies the
// same shape so the UI is fully buildable and testable without an API key.
export interface TranslationProvider {
  connect(config: SessionConfig): Promise<void>
  sendAudioChunk(chunk: Float32Array): void
  setTurnDetection(mode: TurnDetectionMode): void
  /** Tap-to-talk gating between turns. Optional: only meaningful for
   *  providers backed by a continuous connection (WebRTC). */
  setMicEnabled?(enabled: boolean): void
  on<E extends RealtimeEventType>(
    event: E,
    handler: (payload: Extract<RealtimeEvent, { type: E }>) => void
  ): () => void
  disconnect(): void
}
