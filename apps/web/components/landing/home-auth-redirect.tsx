"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

import { useAuth } from "@/lib/use-auth"

export function HomeAuthRedirect() {
  const router = useRouter()
  const { user, hydrated } = useAuth()

  useEffect(() => {
    if (!hydrated || !user) return
    router.replace(user.role === "sponsor" ? "/dashboard" : "/learn")
  }, [hydrated, user, router])

  return null
}
