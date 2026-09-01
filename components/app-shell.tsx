"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { AudioLines, Languages, History, Settings } from "lucide-react"
import { ToastContainer } from "react-toastify"

import { cn } from "@/lib/utils"
import { Wordmark } from "@/components/wordmark"

const NAV_ITEMS = [
  { href: "/", label: "Live", icon: AudioLines },
  { href: "/translate", label: "Translate", icon: Languages },
  { href: "/history", label: "History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-[60px] flex-shrink-0 items-center gap-7 border-b border-border bg-card px-4 sm:px-6">
        <Wordmark className="mr-4 text-[17px]" />

        <nav aria-label="Primary" className="flex h-full gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex h-full items-center gap-1.5 px-1 text-sm font-semibold transition-colors",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-[17px] w-[17px]" />
                <span className="hidden sm:inline">{label}</span>
                {active && (
                  <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-t-full bg-primary" />
                )}
              </Link>
            )
          })}
        </nav>
      </header>

      <main className="flex-1">{children}</main>
      <ToastContainer position="bottom-right" theme="light" />
    </div>
  )
}
