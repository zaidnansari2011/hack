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
