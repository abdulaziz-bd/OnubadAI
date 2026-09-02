"use client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Chip } from "@/components/ui/chip"
import { LANGUAGES, getLanguage } from "@/core/i18n/languages"

export function LanguagePicker({
  value,
  onChange,
}: {
  value: string
  onChange: (code: string) => void
}) {
  const language = getLanguage(value)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Chip aria-label={`Language: ${language.label}`}>{language.label}</Chip>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem key={lang.code} onSelect={() => onChange(lang.code)}>
            {lang.label}
            <span className="ml-2 text-muted-foreground">{lang.nativeLabel}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
