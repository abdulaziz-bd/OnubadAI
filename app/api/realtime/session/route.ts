import { NextRequest, NextResponse } from "next/server"

export const maxDuration = 30

const DEFAULT_BASE_URL = "https://api.openai.com/v1"

// Mints an ephemeral token; the browser never sees the real API key.
export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured on the server." },
      { status: 500 }
    )
  }

  const baseUrl = process.env.OPENAI_BASE_URL ?? DEFAULT_BASE_URL
  const model = process.env.OPENAI_REALTIME_MODEL ?? "gpt-4o-realtime-preview"
  const { voice } = await request.json().catch(() => ({ voice: "verse" }))

  try {
    const response = await fetch(`${baseUrl}/realtime/sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, voice: voice ?? "verse" }),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error("Realtime session error:", text)
      return NextResponse.json(
        { error: "The configured endpoint rejected the realtime session request." },
        { status: 502 }
      )
    }

    const session = await response.json()
    return NextResponse.json({ ...session, realtimeUrl: `${baseUrl}/realtime`, model })
  } catch (error) {
    console.error("Error minting realtime session:", error)
    return NextResponse.json(
      { error: "Could not reach the configured realtime endpoint." },
      { status: 500 }
    )
  }
}
