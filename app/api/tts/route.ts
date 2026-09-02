import { NextRequest, NextResponse } from "next/server"

export const maxDuration = 30

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 })
  }

  const { text, voice = "nova", speed = 1 } = await request.json().catch(() => ({}))
  if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 })

  const baseUrl = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "")

  const response = await fetch(`${baseUrl}/audio/speech`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: process.env.OPENAI_TTS_MODEL ?? "tts-1", input: text, voice, speed }),
  })

  if (!response.ok) {
    const err = await response.text()
    console.error("TTS error:", err)
    return NextResponse.json({ error: "TTS request failed" }, { status: response.status })
  }

  return new NextResponse(response.body, {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
  })
}
