import { NextRequest, NextResponse } from "next/server"

export const maxDuration = 30

// Mints a short-lived ephemeral token for the OpenAI Realtime API. The
// browser only ever holds this ephemeral client_secret, never the real
// OPENAI_API_KEY - see the architecture notes in the project blueprint.
export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured on the server." },
      { status: 500 }
    )
  }

  const { voice } = await request.json().catch(() => ({ voice: "verse" }))

  try {
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview",
        voice: voice ?? "verse",
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error("OpenAI realtime session error:", text)
      return NextResponse.json(
        { error: "OpenAI rejected the realtime session request." },
        { status: 502 }
      )
    }

    const session = await response.json()
    return NextResponse.json(session)
  } catch (error) {
    console.error("Error minting realtime session:", error)
    return NextResponse.json(
      { error: "Could not reach OpenAI to start a realtime session." },
      { status: 500 }
    )
  }
}
