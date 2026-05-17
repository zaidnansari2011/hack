"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

import { AuthPill } from "./auth-pill"
import { MailInbox } from "./mail-inbox"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/lib/use-auth"
import { cn } from "@/lib/utils"
import type { Payout, SponsorDashboard } from "@pol/shared"

const NAV = [
  { href: "/#manifesto", label: "Manifesto" },
  { href: "/#methodology", label: "Methodology" },
  { href: "/#live", label: "Live" },
  { href: "/#roles", label: "Roles" },
] as const

export function SiteHeader() {
  const pathname = usePathname()
  const { user } = useAuth()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const onLanding = pathname === "/"

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b border-transparent transition-all duration-500 ease-out-quart",
        scrolled
          ? "border-rule/60 bg-paper/85 backdrop-blur-md"
          : "border-transparent bg-paper/0",
      )}
    >
      <div className="mx-auto flex h-16 w-[min(1240px,94vw)] items-center justify-between gap-6">
        <Link href="/" className="group flex items-center gap-2.5">
          {!onLanding && !user && (
            <span className="text-[1rem] text-ink-faint transition-transform duration-300 group-hover:-translate-x-0.5 group-hover:text-ink-soft">
              ←
            </span>
          )}
          <Wordmark />
        </Link>

        {onLanding && (
          <nav className="hidden items-center gap-7 text-[0.9375rem] text-ink-soft md:flex">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="link-underline transition-colors hover:text-ink"
              >
                {item.label}
              </a>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-3">
          {user && <BalancePill role={user.role} />}
          {user && <MailInbox />}
          <AuthPill />
        </div>
      </div>
    </header>
  )
}

function Wordmark() {
  return (
    <span className="font-display text-[1.0625rem] font-medium tracking-tight">
      EduPay
    </span>
  )
}

function BalancePill({ role }: { role: string }) {
  const [balance, setBalance] = useState<number | null>(null)
  const [label, setLabel] = useState("")

  useEffect(() => {
    if (role === "student") {
      apiFetch<{ payouts: Payout[] }>("/payouts/mine")
        .then(({ payouts }) => {
          const total = payouts
            .filter((p) => p.status === "confirmed" || p.status === "sent")
            .reduce((sum, p) => sum + p.amountInr, 0)
          setBalance(total)
          setLabel("Earned")
        })
        .catch(() => {})
    } else if (role === "sponsor") {
      apiFetch<SponsorDashboard>("/bounties/dashboard")
        .then((data) => {
          setBalance(data.totalRemainingInr)
          setLabel("Remaining")
        })
        .catch(() => {})
    }
  }, [role])

  if (balance === null) return null

  return (
    <div className="hidden items-center gap-1.5 rounded-full border border-rule bg-surface px-3 py-1.5 sm:flex">
      <span className="text-[0.6875rem] text-ink-faint">{label}</span>
      <span className="tabular font-display text-[0.9375rem] font-medium text-teal">
        ₹{balance.toLocaleString("en-IN")}
      </span>
    </div>
  )
}
