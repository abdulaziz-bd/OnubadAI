import { NextRequest, NextResponse } from "next/server"

export const maxDuration = 30

const DEFAULT_BASE_URL = "https://api.openai.com/v1"

function withApiVersion(url: string): string {
  const apiVersion = process.env.OPENAI_API_VERSION
  if (!apiVersion) return url
  const sep = url.includes("?") ? "&" : "?"
  return `${url}${sep}api-version=${apiVersion}`
}

// Mints an ephemeral token for a translation session; the browser never sees the real API key.
export async function POST(request: NextRequest) {
  const baseUrl = process.env.OPENAI_BASE_URL ?? DEFAULT_BASE_URL
  const model = process.env.OPENAI_REALTIME_MODEL ?? "gpt-realtime-translate"
  const { sourceLanguage, targetLanguage } = await request.json().catch(() => ({}))

  // Self-hosted servers skip ephemeral tokens entirely.
  if (process.env.OPENAI_REALTIME_AUTH === "none") {
    return NextResponse.json({
      authMode: "none",
      realtimeUrl: withApiVersion(`${baseUrl}/realtime/translations/calls`),
    })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured on the server." },
      { status: 500 }
    )
  }

  const sessionPayload = {
    model,
    audio: {
      input: {
        transcription: { model: process.env.OPENAI_REALTIME_TRANSCRIPTION_MODEL ?? "gpt-realtime-whisper" },
      },
      output: {
        language: targetLanguage ?? "en",
      },
    },
  }

  try {
    const response = await fetch(withApiVersion(`${baseUrl}/realtime/translations/client_secrets`), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ session: sessionPayload }),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error(`Realtime session error [${response.status}]:`, text)
      return NextResponse.json(
        { error: "The configured endpoint rejected the realtime session request." },
        { status: 502 }
      )
    }

    const session = await response.json()
    return NextResponse.json({
      ...session,
      authMode: "ephemeral",
      realtimeUrl: withApiVersion(`${baseUrl}/realtime/translations/calls`),
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
