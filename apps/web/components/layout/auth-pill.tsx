"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"

import { authStore } from "@/lib/auth-store"
import { useAuth } from "@/lib/use-auth"
import { cn } from "@/lib/utils"

const STUDENT_LINKS = [
  { href: "/learn", label: "Bounty index" },
  { href: "/payouts", label: "Earnings ledger" },
] as const

const SPONSOR_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/bounties/new", label: "New bounty" },
] as const

export function AuthPill() {
  const router = useRouter()
  const { user, hydrated } = useAuth()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener("mousedown", onClick)
    return () => window.removeEventListener("mousedown", onClick)
  }, [open])

  if (!hydrated) {
    return <div className="h-9 w-28 animate-pulse rounded-full bg-rule/50" />
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="group inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-[0.8125rem] font-medium text-paper transition-all duration-300 ease-out-quart hover:bg-ink/90"
      >
        Sign in
        <span className="translate-x-0 transition-transform duration-300 ease-out-quart group-hover:translate-x-0.5">
          ↗
        </span>
      </Link>
    )
  }

  const links = user.role === "sponsor" ? SPONSOR_LINKS : STUDENT_LINKS
  const initials = user.name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => (p[0] ?? "").toUpperCase())
    .join("")

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group inline-flex items-center gap-2.5 rounded-full border border-rule bg-surface px-2 py-1.5 text-[0.8125rem] font-medium text-ink transition-all duration-300 ease-out-quart hover:border-ink/30"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-[0.6875rem] font-semibold tracking-wide text-paper">
          {initials || "?"}
        </span>
        <span className="hidden max-w-[110px] truncate sm:inline">{user.name}</span>
        <span
          className={cn(
            "mr-1.5 text-[0.625rem] text-ink-faint transition-transform duration-300",
            open && "rotate-180",
          )}
        >
          ▾
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 overflow-hidden rounded-md border border-rule bg-surface shadow-[0_24px_48px_-22px_hsl(var(--ink)/0.25)]"
          >
            <div className="border-b border-rule-soft px-4 py-3.5">
              <div className="eyebrow eyebrow-tick text-[0.625rem]">
                {user.role}
              </div>
              <div className="mt-1 truncate font-display text-[0.9375rem] font-medium text-ink">
                {user.name}
              </div>
              <div className="truncate font-mono text-[0.6875rem] text-ink-faint">
                {user.email}
              </div>
            </div>
            <div className="p-1.5">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between rounded-sm px-3 py-2 text-[0.875rem] text-ink-soft transition-colors hover:bg-paper-deep hover:text-ink"
                >
                  <span>{l.label}</span>
                  <span className="text-ink-faint">→</span>
                </Link>
              ))}
            </div>
            <div className="border-t border-rule-soft p-1.5">
              <button
                type="button"
                onClick={() => {
                  authStore.clear()
                  setOpen(false)
                  router.push("/")
                }}
                className="block w-full rounded-sm px-3 py-2 text-left text-[0.875rem] text-ink-muted transition-colors hover:bg-paper-deep hover:text-ink"
              >
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
