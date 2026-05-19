"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, type ReactNode } from "react"

import { useAuth } from "@/lib/use-auth"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/dashboard", label: "Dashboard", index: "01" },
  { href: "/dashboard?new=1", label: "New bounty", index: "02" },
  { href: "/insights", label: "Insights", index: "03" },
  { href: "/recruit", label: "Find talent", index: "04" },
] as const

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
        <aside className="hidden h-fit lg:sticky lg:top-24 lg:block">
          <div className="eyebrow eyebrow-tick">Sponsor</div>
          <nav className="mt-5 space-y-1.5">
            {NAV.map((item) => {
              const active = pathname === item.href
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

        <div>{children}</div>
      </div>
    </div>
  )
}
