"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"

import { AuthPill } from "./auth-pill"
import { MailInbox } from "./mail-inbox"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/lib/use-auth"
import { cn } from "@/lib/utils"
import type { Payout, SponsorDashboard } from "@pol/shared"

const LANDING_NAV = [
  { href: "/#manifesto", label: "Manifesto" },
  { href: "/#methodology", label: "Methodology" },
  { href: "/#live", label: "Live" },
  { href: "/#roles", label: "Roles" },
] as const

const LOGGED_OUT_NAV = [
  { href: "/about", label: "About" },
  { href: "/recruit", label: "Find talent" },
] as const

const SPONSOR_DRAWER_NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard?new=1", label: "New bounty" },
  { href: "/insights", label: "Insights" },
  { href: "/recruit", label: "Find talent" },
] as const

const STUDENT_DRAWER_NAV = [
  { href: "/learn", label: "Bounties" },
  { href: "/history", label: "History" },
  { href: "/payouts", label: "Earnings" },
] as const

export function SiteHeader() {
  const pathname = usePathname()
  const { user } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Close the drawer on route change so a tap on a link doesn't leave it
  // hanging on top of the destination.
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

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
      <div className="mx-auto flex h-16 w-[min(1240px,94vw)] items-center justify-between gap-3 md:gap-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <Wordmark />
        </Link>

        <nav className="hidden items-center gap-7 text-[0.9375rem] text-ink-soft md:flex">
          {onLanding && !user &&
            LANDING_NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="link-underline transition-colors hover:text-ink"
              >
                {item.label}
              </a>
            ))}
          {!onLanding && !user &&
            LOGGED_OUT_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "link-underline transition-colors hover:text-ink",
                  pathname.startsWith(item.href) && "text-ink",
                )}
              >
                {item.label}
              </Link>
            ))}
        </nav>

        <div className="flex items-center gap-2 md:gap-3">
          {user && <BalancePill role={user.role} />}
          {user?.role === "student" && <MailInbox />}
          <AuthPill />
          <button
            type="button"
            aria-label={drawerOpen ? "Close menu" : "Open menu"}
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-full border border-rule bg-surface text-ink transition-colors hover:border-ink/30 md:hidden"
          >
            <BurgerIcon open={drawerOpen} />
          </button>
        </div>
      </div>

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        pathname={pathname}
        user={user}
        onLanding={onLanding}
      />
    </header>
  )
}

function MobileDrawer({
  open,
  onClose,
  pathname,
  user,
  onLanding,
}: {
  open: boolean
  onClose: () => void
  pathname: string
  user: ReturnType<typeof useAuth>["user"]
  onLanding: boolean
}) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener("keydown", onKey)
    }
  }, [open, onClose])

  const items: { href: string; label: string }[] = user
    ? [...(user.role === "sponsor" ? SPONSOR_DRAWER_NAV : STUDENT_DRAWER_NAV)]
    : onLanding
      ? LANDING_NAV.map((i) => ({ href: i.href, label: i.label }))
      : LOGGED_OUT_NAV.map((i) => ({ href: i.href, label: i.label }))

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 md:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-0 flex h-full w-[min(320px,86vw)] flex-col gap-2 border-l border-rule bg-paper px-5 pb-8 pt-20"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
          >
            <div className="eyebrow eyebrow-tick mb-2 text-[0.625rem]">
              {user ? user.role : "Menu"}
            </div>
            <nav className="flex flex-col gap-1 text-[1rem] text-ink-soft">
              {items.map((item) => {
                const active =
                  item.href.startsWith("/") &&
                  !item.href.includes("#") &&
                  (item.href === pathname ||
                    (item.href !== "/" && pathname.startsWith(item.href.split("?")[0])))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-3 transition-colors hover:bg-paper-deep hover:text-ink",
                      active && "bg-paper-deep text-ink",
                    )}
                  >
                    <span>{item.label}</span>
                    <span className="text-ink-faint">→</span>
                  </Link>
                )
              })}
            </nav>
            {!user && (
              <Link
                href="/login"
                onClick={onClose}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[0.875rem] font-medium text-paper transition-colors hover:bg-ink/90"
              >
                Sign in ↗
              </Link>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function BurgerIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden
      className="text-current"
    >
      <line
        x1="2"
        x2="14"
        y1={open ? 8 : 5}
        y2={open ? 8 : 5}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        style={{ transform: open ? "rotate(45deg)" : "none", transformOrigin: "center", transition: "all 200ms" }}
      />
      <line
        x1="2"
        x2="14"
        y1={open ? 8 : 11}
        y2={open ? 8 : 11}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        style={{ transform: open ? "rotate(-45deg)" : "none", transformOrigin: "center", transition: "all 200ms" }}
      />
    </svg>
  )
}

function Wordmark() {
  // Logo-only mark. The alt carries the brand name for screen readers and
  // SEO since the text was deliberately removed from the visual chrome.
  return (
    <img
      src="/edupaylogonew.svg"
      alt="EduPay"
      className="h-11 w-auto shrink-0"
    />
  )
}

function BalancePill({ role }: { role: string }) {
  const [balance, setBalance] = useState<number | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const finish = () => setLoaded(true)
    if (role === "student") {
      apiFetch<{ payouts: Payout[] }>("/payouts/mine")
        .then(({ payouts }) => {
          const total = payouts
            .filter((p) => p.status === "confirmed" || p.status === "sent")
            .reduce((sum, p) => sum + p.amountInr, 0)
          setBalance(total)
        })
        .catch(() => {})
        .finally(finish)
    } else if (role === "sponsor") {
      apiFetch<SponsorDashboard>("/bounties/dashboard")
        .then((data) => setBalance(data.totalRemainingInr))
        .catch(() => {})
        .finally(finish)
    } else {
      finish()
    }
  }, [role])

  if (!loaded) {
    return (
      <div className="hidden h-8 w-20 animate-pulse rounded-full border border-rule bg-rule/40 sm:block" />
    )
  }

  if (balance === null) return null

  return (
    <div className="hidden items-center rounded-full border border-rule bg-surface px-3 py-1.5 sm:flex">
      <span className="tabular font-display text-[0.9375rem] font-medium text-teal">
        ₹{balance.toLocaleString("en-IN")}
      </span>
    </div>
  )
}
