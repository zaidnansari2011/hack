"use client"

import type { AuthUser } from "@pol/shared"

const TOKEN_KEY = "pol.auth.token"
const USER_KEY = "pol.auth.user"

type Listener = (user: AuthUser | null) => void
const listeners = new Set<Listener>()

function safeWindow(): Window | null {
  return typeof window === "undefined" ? null : window
}

export const authStore = {
  getToken(): string | null {
    return safeWindow()?.localStorage.getItem(TOKEN_KEY) ?? null
  },
  getUser(): AuthUser | null {
    const w = safeWindow()
    if (!w) return null
    const raw = w.localStorage.getItem(USER_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as AuthUser
    } catch {
      return null
    }
  },
  set(user: AuthUser, token: string) {
    const w = safeWindow()
    if (!w) return
    w.localStorage.setItem(TOKEN_KEY, token)
    w.localStorage.setItem(USER_KEY, JSON.stringify(user))
    for (const l of listeners) l(user)
  },
  clear() {
    const w = safeWindow()
    if (!w) return
    w.localStorage.removeItem(TOKEN_KEY)
    w.localStorage.removeItem(USER_KEY)
    for (const l of listeners) l(null)
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}
