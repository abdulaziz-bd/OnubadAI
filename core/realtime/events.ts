// Screens consume this only through useLiveSession, so the provider stays swappable.

export type RealtimeEvent =
  | { type: "connecting" }
  | { type: "ready" }
  | { type: "speech.start"; speaker: "you" | "them" }
  | { type: "speech.end"; speaker: "you" | "them" }
  | { type: "transcript.partial"; speaker: "you" | "them"; text: string }
  | { type: "transcript.final"; speaker: "you" | "them"; text: string }
  | { type: "translation.partial"; speaker: "you" | "them"; text: string }
  | { type: "translation.final"; speaker: "you" | "them"; text: string }
  | { type: "error"; message: string }
  | { type: "closed" }

export type RealtimeEventType = RealtimeEvent["type"]

export class RealtimeEventBus {
  private listeners = new Map<RealtimeEventType, Set<(e: RealtimeEvent) => void>>()

  on<E extends RealtimeEventType>(
    type: E,
    handler: (event: Extract<RealtimeEvent, { type: E }>) => void
  ): () => void {
    const set = this.listeners.get(type) ?? new Set()
    set.add(handler as (e: RealtimeEvent) => void)
    this.listeners.set(type, set)
    return () => set.delete(handler as (e: RealtimeEvent) => void)
  }

  emit(event: RealtimeEvent) {
    this.listeners.get(event.type)?.forEach((handler) => handler(event))
  }
}
