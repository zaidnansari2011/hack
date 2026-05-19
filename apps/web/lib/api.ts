import type { ApiResponse } from "@pol/shared"

import { authStore } from "./auth-store"

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"

export class ApiClientError extends Error {
  public readonly code: string
  public readonly status: number
  public readonly details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

type RequestOptions = RequestInit & {
  /** Pass `null` to opt out of the stored token; omit to use it when present. */
  token?: string | null
  json?: unknown
}

// Pages on which a 401 is expected (no token yet) — don't redirect away from
// these or we'll loop the user back to themselves.
const AUTH_PATHS = ["/login", "/signup"]

// Coalesce simultaneous 401s into a single redirect so a page firing several
// requests in parallel doesn't trigger overlapping replace() calls.
let signOutInFlight = false

function handleUnauthorized(): void {
  if (typeof window === "undefined") return
  if (signOutInFlight) return
  const { pathname, search } = window.location
  if (AUTH_PATHS.some((p) => pathname.startsWith(p))) return
  signOutInFlight = true
  authStore.clear()
  const next = encodeURIComponent(`${pathname}${search}`)
  window.location.replace(`/login?next=${next}&reason=expired`)
}

export async function apiFetch<T>(
  path: string,
  { token, json, headers, ...rest }: RequestOptions = {},
): Promise<T> {
  const resolvedToken =
    token === null ? null : token ?? authStore.getToken()

  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {}),
      ...(headers ?? {}),
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  })

  // 401 means the stored token is missing / expired. Only auto-clear when
  // the caller intended to send a token — explicit token: null (public
  // endpoints) is allowed to return 401 without bouncing the user.
  if (res.status === 401 && token !== null && resolvedToken) {
    handleUnauthorized()
  }

  let payload: ApiResponse<T>
  try {
    payload = (await res.json()) as ApiResponse<T>
  } catch {
    throw new ApiClientError(
      res.status,
      "INVALID_RESPONSE",
      `Invalid JSON response (status ${res.status})`,
    )
  }

  if (!payload.success) {
    throw new ApiClientError(
      res.status,
      payload.error.code,
      payload.error.message,
      payload.error.details,
    )
  }

  return payload.data
}

export type SseEvent = { event: string; data: string }

/**
 * POST a JSON body and consume the response as a Server-Sent Events stream.
 * Each fully-formed `event: <name>\ndata: <json>\n\n` frame is yielded as one
 * object. Caller is responsible for parsing `data` as JSON if needed.
 *
 * We use this instead of `EventSource` because EventSource cannot attach the
 * Authorization header that {@link apiFetch} relies on.
 */
export async function* apiStream(
  path: string,
  { token, json, headers, signal, ...rest }: RequestOptions & { signal?: AbortSignal } = {},
): AsyncGenerator<SseEvent, void, void> {
  const resolvedToken =
    token === null ? null : token ?? authStore.getToken()

  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    ...rest,
    method: rest.method ?? "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...(resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {}),
      ...(headers ?? {}),
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    signal,
  })

  if (res.status === 401 && token !== null && resolvedToken) {
    handleUnauthorized()
  }
  if (!res.ok || !res.body) {
    let message = `Stream failed with status ${res.status}`
    try {
      const payload = (await res.json()) as ApiResponse<unknown>
      if (!payload.success) message = payload.error.message
    } catch {
      // body wasn't JSON; keep generic message
    }
    throw new ApiClientError(res.status, "STREAM_FAILED", message)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let sep: number
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, sep)
        buffer = buffer.slice(sep + 2)
        let event = "message"
        let data = ""
        for (const line of frame.split("\n")) {
          if (line.startsWith("event:")) event = line.slice(6).trim()
          else if (line.startsWith("data:")) data += line.slice(5).trim()
        }
        if (data) yield { event, data }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
