import { NextRequest, NextResponse } from "next/server"

export const maxDuration = 30

const DEFAULT_BASE_URL = "https://api.openai.com/v1"

// Mints an ephemeral token; the browser never sees the real API key.
export async function POST(request: NextRequest) {
  const baseUrl = process.env.OPENAI_BASE_URL ?? DEFAULT_BASE_URL
  const model = process.env.OPENAI_REALTIME_MODEL ?? "gpt-realtime"
  const { sourceLanguage, targetLanguage, voice } = await request.json().catch(() => ({}))

  // Self-hosted servers (LocalAI, hf speech-to-speech) skip ephemeral tokens entirely.
  if (process.env.OPENAI_REALTIME_AUTH === "none") {
    return NextResponse.json({
      authMode: "none",
      realtimeUrl: `${baseUrl}/realtime?model=${model}`,
    })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured on the server." },
      { status: 500 }
    )
  }

  try {
    const response = await fetch(`${baseUrl}/realtime/client_secrets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model,
          instructions: `You are a live interpreter. Transcribe the speaker's ${sourceLanguage ?? "source"} audio, then speak a natural ${targetLanguage ?? "target"} translation. Do not add commentary.`,
          audio: { output: { voice: voice ?? "verse" } },
        },
      }),
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
    return NextResponse.json({
      ...session,
      authMode: "ephemeral",
      realtimeUrl: `${baseUrl}/realtime/calls`,
      model,
    })
  } catch (error) {
    console.error("Error minting realtime session:", error)
    return NextResponse.json(
      { error: "Could not reach the configured realtime endpoint." },
      { status: 500 }
    )
  }
}
