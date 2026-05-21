"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

export const SPONSOR_NAV = [
  { href: "/dashboard", label: "Dashboard", index: "01" },
  { href: "/insights", label: "Insights", index: "02" },
  { href: "/recruit", label: "Talents", index: "03" },
  { href: "/leaderboard", label: "Leaderboard", index: "04" },
] as const

export function SponsorRail() {
  const pathname = usePathname()

  return (
    <aside className="hidden h-fit lg:sticky lg:top-24 lg:block">
      <Link
        href="/dashboard?new=1"
        className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[0.875rem] font-medium text-paper transition-all duration-300 ease-out-quart hover:bg-ink/90"
      >
        New bounty
        <span className="transition-transform duration-300 ease-out-quart group-hover:translate-x-0.5">
          +
        </span>
      </Link>
      <div className="eyebrow eyebrow-tick mt-6">Sponsor</div>
      <nav className="mt-5 space-y-1.5">
        {SPONSOR_NAV.map((item) => {
          const active = pathname === item.href.split("?")[0]
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-baseline gap-3 border-l border-rule pl-4 py-1.5 transition-all",
                active
                  ? "border-ink text-ink"
                  : "text-ink-muted hover:border-ink/40 hover:text-ink",
              )}
            >
              <span className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-ink-faint">
                {item.index}
              </span>
              <span className="text-[0.9375rem]">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
