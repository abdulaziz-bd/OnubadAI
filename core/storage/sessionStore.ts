export interface HistoryEntry {
  id: string
  kind: "live" | "text"
  sourceLang: string
  targetLang: string
  snippet: string
  timestamp: number
  durationSec?: number
  starred: boolean
}

const HISTORY_KEY = "onubadai.history"
const EPHEMERAL_KEY = "onubadai.ephemeralMode"

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJSON(key: string, value: unknown) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(key, JSON.stringify(value))
}

export const sessionStore = {
  isEphemeral(): boolean {
    return readJSON(EPHEMERAL_KEY, false)
  },
  setEphemeral(value: boolean) {
    writeJSON(EPHEMERAL_KEY, value)
  },
  getHistory(): HistoryEntry[] {
    return readJSON<HistoryEntry[]>(HISTORY_KEY, [])
  },
  addEntry(entry: Omit<HistoryEntry, "id" | "timestamp" | "starred">): string | null {
    if (sessionStore.isEphemeral()) return null
    const entries = sessionStore.getHistory()
    const id = crypto.randomUUID()
    entries.unshift({ ...entry, id, timestamp: Date.now(), starred: false })
    writeJSON(HISTORY_KEY, entries)
    return id
  },
  updateEntry(id: string, patch: Partial<Omit<HistoryEntry, "id" | "starred">>) {
    const entries = sessionStore
      .getHistory()
      .map((e) => (e.id === id ? { ...e, ...patch } : e))
    writeJSON(HISTORY_KEY, entries)
  },
  toggleStar(id: string) {
    const entries = sessionStore.getHistory().map((e) =>
      e.id === id ? { ...e, starred: !e.starred } : e
    )
    writeJSON(HISTORY_KEY, entries)
  },
  clearAll() {
    writeJSON(HISTORY_KEY, [])
  },
}
