"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, Star } from "lucide-react"

import { Segmented } from "@/components/ui/segmented"
import { cn } from "@/lib/utils"
import { sessionStore, HistoryEntry } from "@/core/storage/sessionStore"
import { getLanguage } from "@/core/i18n/languages"

const SEED_ENTRIES: Omit<HistoryEntry, "id" | "timestamp" | "starred">[] = [
  {
    kind: "live",
    sourceLang: "en",
    targetLang: "bn",
    snippet: "Where is the train station? — 4 exchanges",
    durationSec: 360,
  },
  {
    kind: "text",
    sourceLang: "en",
    targetLang: "es",
    snippet: "Could you send me the updated invoice before Friday?",
  },
]

function relativeTime(timestamp: number) {
  const diffMin = Math.round((Date.now() - timestamp) / 60000)
  if (diffMin < 1) return "just now"
  if (diffMin < 60) return `${diffMin} min ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr} hr ago`
  return `${Math.round(diffHr / 24)} d ago`
}

type Filter = "all" | "live" | "text" | "starred"

export function HistoryScreen() {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")

  useEffect(() => {
    let existing = sessionStore.getHistory()
    if (existing.length === 0) {
      SEED_ENTRIES.forEach((entry) => sessionStore.addEntry(entry))
      existing = sessionStore.getHistory()
    }
    setEntries(existing)
  }, [])

  function toggleStar(id: string) {
    sessionStore.toggleStar(id)
    setEntries(sessionStore.getHistory())
  }

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filter === "starred" && !e.starred) return false
      if (filter === "live" && e.kind !== "live") return false
      if (filter === "text" && e.kind !== "text") return false
      if (query && !e.snippet.toLowerCase().includes(query.toLowerCase())) return false
      return true
    })
  }, [entries, filter, query])

  const minutesThisMonth = Math.round(
    entries.filter((e) => e.durationSec).reduce((sum, e) => sum + (e.durationSec ?? 0), 0) / 60
  )
  const languagePairs = new Set(entries.map((e) => `${e.sourceLang}-${e.targetLang}`)).size

  return (
    <div className="mx-auto max-w-[880px] px-5 py-8 sm:px-6">
      <h1 className="mb-5 text-xl font-bold">History</h1>

      <div className="mb-6 flex gap-7 border-b border-border pb-5">
        <Stat value={entries.length} label="sessions" />
        <Stat value={minutesThisMonth} label="minutes" />
        <Stat value={languagePairs} label="language pairs" />
      </div>

      <div className="mb-4 flex flex-wrap gap-2.5">
        <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-md border border-input bg-card px-3.5 py-2.5 text-sm text-muted-foreground">
          <Search className="h-[15px] w-[15px] opacity-55" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search past conversations"
            className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </div>
        <Segmented
          aria-label="Filter history"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "live", label: "Live" },
            { value: "text", label: "Text" },
            { value: "starred", label: "Starred" },
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {entries.length === 0
            ? "No conversations yet. Translations you make will show up here."
            : "No conversations match that search."}
        </p>
      ) : (
        <div className="flex flex-col">
          {filtered.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-3.5 border-b border-border py-3.5 last:border-b-0"
            >
              <span className="flex-shrink-0 rounded-md bg-secondary px-2 py-1 font-mono text-[11px] text-muted-foreground">
                {getLanguage(entry.sourceLang).code.toUpperCase()} →{" "}
                {getLanguage(entry.targetLang).code.toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14.5px]">{entry.snippet}</div>
                <div className="mt-0.5 font-mono text-[11.5px] text-muted-faint">
                  {relativeTime(entry.timestamp)}
                  {entry.durationSec ? ` · ${Math.round(entry.durationSec / 60)} min` : ""}
                </div>
              </div>
              <button
                type="button"
                aria-label={entry.starred ? "Unstar" : "Star"}
                onClick={() => toggleStar(entry.id)}
                className={cn(
                  "flex-shrink-0 text-muted-faint transition-colors",
                  entry.starred && "text-primary"
                )}
              >
                <Star className="h-[17px] w-[17px]" fill={entry.starred ? "currentColor" : "none"} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="font-mono text-[22px] font-bold">{value}</div>
      <div className="mt-0.5 text-[12.5px] text-muted-faint">{label}</div>
    </div>
  )
}
