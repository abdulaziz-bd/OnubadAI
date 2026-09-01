export interface Preferences {
  voice: "nadia" | "kabir" | "aria"
  speechRate: number
  noiseSuppression: boolean
  autoReadTranslations: boolean
  textSize: "sm" | "default" | "lg"
}

const DEFAULTS: Preferences = {
  voice: "nadia",
  speechRate: 1,
  noiseSuppression: true,
  autoReadTranslations: true,
  textSize: "default",
}

const KEY = "onubadai.preferences"

export function getPreferences(): Preferences {
  if (typeof window === "undefined") return DEFAULTS
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

export function setPreferences(patch: Partial<Preferences>) {
  if (typeof window === "undefined") return
  const next = { ...getPreferences(), ...patch }
  window.localStorage.setItem(KEY, JSON.stringify(next))
  return next
}
