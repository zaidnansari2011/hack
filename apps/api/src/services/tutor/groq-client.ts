import { env } from "@/config/env"
import { ExternalServiceError } from "@/lib/errors"
import { logger } from "@/config/logger"

const GROQ_BASE_URL = "https://api.groq.com/openai/v1"

export type GroqMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

export type GroqCompletionOptions = {
  messages: GroqMessage[]
  temperature?: number
  maxTokens?: number
  model?: string
}

type GroqResponse = {
  choices: { message: { role: string; content: string } }[]
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
}

export const groqAvailable = (): boolean => Boolean(env.GROQ_API_KEY)

/**
 * Direct Groq chat completion (OpenAI-compatible). When `GROQ_API_KEY` is
 * unset, callers should fall back to a stub — we don't fabricate completions
 * here so the dishonest path is impossible.
 */
export async function groqChat(
  opts: GroqCompletionOptions,
): Promise<{ content: string; usage?: GroqResponse["usage"] }> {
  if (!env.GROQ_API_KEY) {
    throw ExternalServiceError("GROQ_API_KEY is not configured")
  }

  const body = {
    model: opts.model ?? env.GROQ_MODEL,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.maxTokens ?? 800,
    stream: false,
  }

  const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    logger.error({ status: res.status, body: text.slice(0, 400) }, "groq error")
    throw ExternalServiceError(`Groq returned ${res.status}`, text.slice(0, 200))
  }

  const json = (await res.json()) as GroqResponse
  const content = json.choices[0]?.message?.content?.trim()
  if (!content) {
    throw ExternalServiceError("Groq returned an empty completion")
  }
  return { content, usage: json.usage }
}
