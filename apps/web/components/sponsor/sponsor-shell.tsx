"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, type ReactNode } from "react"

import { useAuth } from "@/lib/use-auth"
import { SponsorRail } from "./sponsor-rail"

export function SponsorShell({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, hydrated } = useAuth()

  useEffect(() => {
    if (!hydrated) return
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`)
      return
    }
    if (user.role !== "sponsor") {
      router.replace("/")
    }
  }, [hydrated, user, pathname, router])

  if (!hydrated || !user || user.role !== "sponsor") {
    return (
      <div className="grid min-h-[60vh] place-items-center text-[0.875rem] text-ink-muted">
        Loading…
      </div>
    )
  }

  return (
    <div className="relative isolate min-h-[calc(100vh-4rem)]">
      <div className="mx-auto grid w-[min(1240px,94vw)] gap-10 py-12 lg:grid-cols-[220px_1fr] lg:gap-16">
        <SponsorRail />
        <div>{children}</div>
      </div>
    </div>
  )
}
