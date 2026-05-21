"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

export const STUDENT_NAV = [
  { href: "/learn", label: "Bounties", index: "01" },
  { href: "/history", label: "History", index: "02" },
  { href: "/payouts", label: "Earnings", index: "03" },
  { href: "/leaderboard", label: "Leaderboard", index: "04" },
] as const

const LOCKED_NAV = [
  { label: "Competitions", index: "05" },
  { label: "Forums", index: "06" },
] as const

export function StudentSubNav() {
  const pathname = usePathname()

  return (
    <div className="border-b border-rule bg-paper">
      <div className="mx-auto flex w-[min(1240px,94vw)] items-center gap-6 overflow-x-auto py-4">
        <span className="eyebrow eyebrow-tick shrink-0">Student</span>
        <nav className="flex flex-nowrap items-baseline gap-5 whitespace-nowrap text-[0.875rem]">
          {STUDENT_NAV.map((item) => {
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
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3 w-3"
                  aria-hidden
                >
                  <rect x="3" y="7" width="10" height="7" rx="1.5" />
                  <path d="M5 7V5a3 3 0 0 1 6 0v2" />
                </svg>
              </span>
            </span>
          ))}
        </nav>
      </div>
    </div>
  )
}
