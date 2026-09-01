import type { Metadata } from "next"
import { Inter, Noto_Sans_Bengali, Noto_Naskh_Arabic, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { AppShell } from "@/components/app-shell"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

// Rendering Bengali/Arabic translations is core to the product, not an edge
// case - Inter has no glyphs for either script, so these are chained into
// the body font stack as real fallbacks rather than left to the OS default.
const notoBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  variable: "--font-noto-bengali",
  display: "swap",
})

const notoArabic = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  variable: "--font-noto-arabic",
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "OnubadAI",
  description: "Live, two-way voice translation for the moment you need it.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${notoBengali.variable} ${notoArabic.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
