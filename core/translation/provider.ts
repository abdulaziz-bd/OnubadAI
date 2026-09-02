import { RealtimeEvent, RealtimeEventType } from "../realtime/events"

export type TurnDetectionMode = "server_vad" | "push_to_talk"

export interface SessionConfig {
  sourceLanguage: string
  targetLanguage: string
  turnDetection: TurnDetectionMode
}

// Kept behind an interface so a provider other than openaiRealtimeProvider could be swapped in.
export interface TranslationProvider {
  connect(config: SessionConfig): Promise<void>
  setTurnDetection(mode: TurnDetectionMode): void
  // Tap-to-talk gating; only meaningful for continuous-connection providers.
  setMicEnabled?(enabled: boolean): void
  on<E extends RealtimeEventType>(
    event: E,
    handler: (payload: Extract<RealtimeEvent, { type: E }>) => void
  ): () => void
  disconnect(): void
}
