import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

export const maxDuration = 30

interface TranslateRequestBody {
  text?: string
  sourceLang?: string
  targetLang?: string
  formality?: "casual" | "neutral" | "formal"
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured on the server." },
      { status: 500 }
    )
  }

  const { text, sourceLang, targetLang, formality = "neutral" }: TranslateRequestBody =
    await request.json().catch(() => ({}) as TranslateRequestBody)

  if (!text) {
    return NextResponse.json({ error: "No text provided for translation." }, { status: 400 })
  }
  if (!targetLang) {
    return NextResponse.json({ error: "No target language specified." }, { status: 400 })
  }

  const openai = new OpenAI({ apiKey, baseURL: process.env.OPENAI_BASE_URL })

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      // temperature: 0.2,
      messages: [
        {
          role: "system",
          content: [
            `Translate the user's message${sourceLang ? ` from ${sourceLang}` : ""} into ${targetLang}.`,
            `Use a ${formality} register.`,
            "Reply with only the translation, no quotes, no explanation.",
          ].join(" "),
        },
        { role: "user", content: text },
      ],
    })

    const translation = completion.choices[0]?.message?.content?.trim() ?? ""

    return NextResponse.json({
      originalText: text,
      translation,
      sourceLanguage: sourceLang ?? "auto",
      targetLanguage: targetLang,
    })
  } catch (error) {
    console.error("Error processing translation:", error)
    return NextResponse.json({ error: "Error processing translation." }, { status: 500 })
  }
}
