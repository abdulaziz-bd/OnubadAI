export interface Language {
  code: string
  label: string
  nativeLabel: string
  rtl?: boolean
}

// Adding a language is a data change here, not a UI change.
export const LANGUAGES: Language[] = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "bn", label: "Bengali", nativeLabel: "বাংলা" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية", rtl: true },
  { code: "es", label: "Spanish", nativeLabel: "Español" },
  { code: "fr", label: "French", nativeLabel: "Français" },
  { code: "de", label: "German", nativeLabel: "Deutsch" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "ur", label: "Urdu", nativeLabel: "اردو", rtl: true },
]

export function getLanguage(code: string): Language {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0]
}
