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
  seed?: number
  signal?: AbortSignal
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

  const body: Record<string, unknown> = {
    model: opts.model ?? env.GROQ_MODEL,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.maxTokens ?? 800,
    stream: false,
  }
  if (opts.seed !== undefined) body.seed = opts.seed

  const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
    signal: opts.signal,
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

/**
 * Streaming variant of {@link groqChat}. Yields token deltas as they arrive
 * from Groq's SSE endpoint so callers (typically an Express SSE handler) can
 * relay them to the browser without buffering the whole completion.
 *
 * Iteration ends when the upstream sends `data: [DONE]` or the body closes.
 * Callers should accumulate the deltas if they also need to persist the
 * final text. Throws ExternalServiceError on HTTP failure.
 */
export async function* groqChatStream(
  opts: GroqCompletionOptions,
): AsyncGenerator<string, void, void> {
  if (!env.GROQ_API_KEY) {
    throw ExternalServiceError("GROQ_API_KEY is not configured")
  }

  const body: Record<string, unknown> = {
    model: opts.model ?? env.GROQ_MODEL,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.maxTokens ?? 800,
    stream: true,
  }
  if (opts.seed !== undefined) body.seed = opts.seed

  const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
    signal: opts.signal,
  })

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "")
    logger.error({ status: res.status, body: text.slice(0, 400) }, "groq stream error")
    throw ExternalServiceError(`Groq returned ${res.status}`, text.slice(0, 200))
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // SSE frames are separated by blank lines. Process complete frames and
      // keep any trailing partial frame in `buffer` for the next iteration.
      let sep: number
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, sep)
        buffer = buffer.slice(sep + 2)

        for (const line of frame.split("\n")) {
          if (!line.startsWith("data:")) continue
          const data = line.slice(5).trim()
          if (!data) continue
          if (data === "[DONE]") return
          try {
            const json = JSON.parse(data) as {
              choices?: { delta?: { content?: string } }[]
            }
            const piece = json.choices?.[0]?.delta?.content
            if (piece) yield piece
          } catch {
            // ignore malformed frames
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
