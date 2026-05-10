"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, type ReactNode } from "react"

import { useAuth } from "@/lib/use-auth"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/learn", label: "Bounties", index: "01" },
  { href: "/history", label: "History", index: "02" },
  { href: "/payouts", label: "Earnings", index: "03" },
] as const

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

  // Sub-nav (Bounties / History / Earnings) — hide it on the per-bounty
  // learning surface so the tutor + quiz get full focus.
  const showSubNav =
    pathname === "/learn" ||
    pathname.startsWith("/history") ||
    pathname.startsWith("/payouts")

  return (
    <div className="relative isolate min-h-[calc(100vh-4rem)]">
      {showSubNav && (
        <div className="border-b border-rule bg-paper">
          <div className="mx-auto flex w-[min(1240px,94vw)] items-center gap-8 py-4">
            <span className="eyebrow eyebrow-tick">Student</span>
            <nav className="flex items-baseline gap-6 text-[0.875rem]">
              {NAV.map((item) => {
                const active =
                  item.href === "/learn"
                    ? pathname === "/learn"
                    : pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-baseline gap-2 transition-colors",
                      active ? "text-ink" : "text-ink-muted hover:text-ink",
                    )}
                  >
                    <span className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-ink-faint">
                      {item.index}
                    </span>
                    <span
                      className={cn(
                        "border-b-2 pb-1",
                        active ? "border-ink" : "border-transparent",
                      )}
                    >
                      {item.label}
                    </span>
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      )}

      <div className={showSubNav ? "mx-auto w-[min(1240px,94vw)] py-12" : ""}>{children}</div>
    </div>
  )
}
