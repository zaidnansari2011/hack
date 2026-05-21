"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, type ReactNode } from "react"

import { useAuth } from "@/lib/use-auth"
import { StudentSubNav } from "./student-subnav"

export function StudentShell({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, hydrated } = useAuth()

  useEffect(() => {
    if (!hydrated) return
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`)
      return
    }
    if (user.role !== "student") {
      router.replace("/")
    }
  }, [hydrated, user, pathname, router])

  if (!hydrated || !user || user.role !== "student") {
    return (
      <div className="grid min-h-[60vh] place-items-center text-[0.875rem] text-ink-muted">
        Loading…
      </div>
    )
  }

  // Sub-nav (Bounties / History / Earnings / Leaderboard) — hide it on the
  // per-bounty learning surface so the tutor + quiz get full focus.
  const showSubNav =
    pathname === "/learn" ||
    pathname.startsWith("/history") ||
    pathname.startsWith("/payouts")

  return (
    <div className="relative isolate min-h-[calc(100vh-4rem)]">
      {showSubNav && <StudentSubNav />}
      <div className={showSubNav ? "mx-auto w-[min(1240px,94vw)] py-12" : ""}>
        {children}
      </div>
    </div>
  )
}
