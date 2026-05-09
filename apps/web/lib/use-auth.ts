"use client"

import { useEffect, useState } from "react"
import type { AuthUser } from "@pol/shared"

import { authStore } from "./auth-store"

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setUser(authStore.getUser())
    setHydrated(true)
    return authStore.subscribe(setUser)
  }, [])

  return { user, hydrated, isAuthed: hydrated && user !== null }
}
