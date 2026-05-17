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

const LOCKED_NAV = [
  { label: "Competitions", index: "04" },
  { label: "Forums", index: "05" },
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
              {LOCKED_NAV.map((item) => (
                <span
                  key={item.label}
                  title="Coming soon"
                  aria-disabled
                  className="flex cursor-not-allowed items-baseline gap-2 text-ink-faint/70"
                >
                  <span className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-ink-faint/60">
                    {item.index}
                  </span>
                  <span className="flex items-center gap-1.5 border-b-2 border-transparent pb-1">
                    {item.label}
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden>
                      <rect x="3" y="7" width="10" height="7" rx="1.5" />
                      <path d="M5 7V5a3 3 0 0 1 6 0v2" />
                    </svg>
                  </span>
                </span>
              ))}
            </nav>
          </div>
        </div>
      )}

      <div className={showSubNav ? "mx-auto w-[min(1240px,94vw)] py-12" : ""}>{children}</div>
    </div>
  )
}
