"use client"

import Link from "next/link"
import { animate, motion, useMotionValue, useSpring, useTransform } from "framer-motion"
import { useEffect, useState } from "react"
import type { PlatformStats } from "@pol/shared"

import { apiFetch } from "@/lib/api"
import { ease } from "@/lib/motion"

export function HeroSection() {
  return (
    <section className="relative isolate min-h-[100svh] -mt-16 overflow-hidden pt-16">
      <AnimatedBackground />
      <div className="relative z-10 mx-auto flex h-[calc(100svh-4rem)] w-[min(1240px,94vw)] flex-col justify-center gap-10 py-10 lg:flex-row lg:items-center lg:gap-16 lg:py-0">
        <Headline />
        <HeroRoleTiles />
      </div>
    </section>
  )
}

/* ── Background ─────────────────────────────────────────── */

function AnimatedBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
      {/* Warm cream base */}
      <div className="absolute inset-0 bg-paper" />

      {/* Large slow-drifting orbs */}
      <motion.div
        className="absolute -left-48 -top-24 h-[700px] w-[700px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, hsl(191 82% 30% / 0.14) 0%, transparent 70%)",
        }}
        animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute -right-64 top-1/4 h-[600px] w-[600px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, hsl(13 62% 46% / 0.10) 0%, transparent 65%)",
        }}
        animate={{ x: [0, -50, 30, 0], y: [0, 40, -20, 0] }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear", delay: 4 }}
      />
      <motion.div
        className="absolute bottom-0 left-1/3 h-[500px] w-[500px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, hsl(148 42% 34% / 0.09) 0%, transparent 65%)",
        }}
        animate={{ x: [0, 60, -30, 0], y: [0, -40, 10, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear", delay: 8 }}
      />

      {/* Fine dot grid */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "radial-gradient(circle, hsl(218 39% 12%) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Bottom fade-out */}
      <div
        className="absolute inset-x-0 bottom-0 h-48"
        style={{
          background:
            "linear-gradient(to bottom, transparent, hsl(220 25% 97%))",
        }}
      />
    </div>
  )
}

/* ── Headline ───────────────────────────────────────────── */

const WORDS = [
  { text: "Sponsors", normal: true },
  { text: "fund" },
  { text: "outcomes." },
  { text: "The" },
  { text: "chain", teal: true },
  { text: "proves" },
  { text: "them." },
  { text: "UPI", teal: true },
  { text: "settles" },
  { text: "them" },
  { text: "in" },
  { text: "seconds.", italic: true },
]

function Headline() {
  return (
    <div className="flex max-w-2xl flex-col gap-6 lg:max-w-[52%]">
      {/* Animated word-by-word headline */}
      <h1 className="display-xl flex flex-wrap gap-x-[0.28em] gap-y-1 text-ink">
        {WORDS.map(({ text, teal, italic }, i) => (
          <motion.span
            key={`${text}-${i}`}
            initial={{ opacity: 0, y: "0.5em", filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, ease: ease.outQuart, delay: 0.15 + i * 0.055 }}
            className={
              teal
                ? "text-teal"
                : italic
                  ? "display-italic"
                  : undefined
            }
          >
            {text}
          </motion.span>
        ))}
      </h1>

      {/* Sub-copy */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: ease.outQuart, delay: 0.85 }}
        className="max-w-[52ch] text-balance text-[1.0625rem] leading-relaxed text-ink-soft"
      >
        You study, you pass, you get paid. In rupees, straight to your UPI.
        Sponsors put real money behind your learning, and every completion comes
        with a permanent on-chain receipt.
</motion.p>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: ease.outQuart, delay: 1 }}
        className="flex flex-wrap items-center gap-4"
      >
        <Link
          href="/learn"
          className="inline-flex items-center gap-2 text-[0.9375rem] font-medium text-ink-soft underline-offset-4 transition-colors hover:text-ink hover:underline"
        >
          Browse active bounties ↗
        </Link>
      </motion.div>

      {/* Live stats row */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.2 }}
        className="flex items-center gap-6 border-t border-rule pt-4"
      >
        <StatTicker label="Bounties live" endpoint="totalBounties" fallback={12} />
        <div className="h-6 w-px bg-rule" />
        <StatTicker label="Completions verified" endpoint="totalCompletions" accent fallback={148} />
        <div className="h-6 w-px bg-rule" />
        <StatTicker label="Paid in INR" endpoint="totalPaidInr" prefix="₹" fallback={25000} />
      </motion.div>
    </div>
  )
}

function StatTicker({
  label,
  endpoint,
  accent,
  prefix = "",
  fallback = 0,
}: {
  label: string
  endpoint: keyof PlatformStats
  accent?: boolean
  prefix?: string
  fallback?: number
}) {
  const [value, setValue] = useState<number | null>(null)
  const displayed = useMotionValue(0)
  const spring = useSpring(displayed, { stiffness: 80, damping: 20 })
  const rounded = useTransform(spring, (v) =>
    prefix
      ? `${prefix}${Math.round(v).toLocaleString("en-IN")}`
      : Math.round(v).toLocaleString("en-IN"),
  )

  useEffect(() => {
    apiFetch<{ stats: PlatformStats }>("/activity", { token: null })
      .then(({ stats }) => {
        const n = stats[endpoint] as number
        setValue(n)
        animate(displayed, n, { duration: 2, ease: "easeOut" })
      })
      .catch(() => {
        setValue(fallback)
        animate(displayed, fallback, { duration: 2, ease: "easeOut" })
      })
  }, [endpoint, displayed, fallback])

  return (
    <div>
      <div className="text-[0.75rem] font-medium text-ink-muted">{label}</div>
      <div
        className={`tabular mt-1 font-display text-[1.375rem] font-medium leading-none ${
          accent ? "text-teal" : "text-ink"
        }`}
      >
        {value === null ? (
          <span className="inline-block h-5 w-12 animate-pulse rounded-sm bg-rule/60" />
        ) : (
          <motion.span>{rounded}</motion.span>
        )}
      </div>
    </div>
  )
}

/* ── Hero role tiles ────────────────────────────────────── */

const ROLES = [
  {
    role: "student" as const,
    eyebrow: "Earn",
    title: "I want to learn",
    detail: "Learn at your own pace. Pass the quiz and earn real rupees.",
    href: "/signup?role=student",
    highlighted: false,
  },
  {
    role: "sponsor" as const,
    eyebrow: "Fund",
    title: "I want to sponsor",
    detail: "Back skills you care about. You only pay when someone proves it.",
    href: "/signup?role=sponsor",
    highlighted: true,
  },
  {
    role: "recruit" as const,
    eyebrow: "Hire",
    title: "I want to hire",
    detail: "Find people whose skills have real proof behind them. No account needed.",
    href: "/recruit",
    highlighted: false,
  },
]

function HeroRoleTiles() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: ease.outQuart, delay: 0.5 }}
      className="flex w-full flex-col gap-3 lg:max-w-[380px]"
    >
      {ROLES.map(({ role, eyebrow, title, detail, href, highlighted }) => (
        <Link
          key={role}
          href={href}
          className={`group flex items-center justify-between gap-4 overflow-hidden rounded-xl border bg-surface px-5 py-4 transition-all duration-300 ease-out-quart hover:-translate-y-0.5 hover:border-ink/25 hover:shadow-[0_8px_24px_-8px_hsl(218_39%_12%_/_0.1)] ${
            highlighted ? "border-teal/35 bg-teal-tint/40" : "border-rule"
          }`}
        >
          <div className="flex items-center gap-4">
            <HeroRoleGlyph role={role} highlighted={!!highlighted} />
            <div>
              <div className="text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-ink-muted">
                {eyebrow}
              </div>
              <div className="mt-0.5 font-display text-[1.0625rem] font-medium text-ink">
                {title}
              </div>
              <p className="mt-0.5 text-[0.8125rem] leading-snug text-ink-muted">
                {detail}
              </p>
            </div>
          </div>
          <span className="shrink-0 text-[1.125rem] text-ink-faint transition-all duration-300 ease-out-quart group-hover:translate-x-1 group-hover:text-ink">
            →
          </span>
        </Link>
      ))}
    </motion.div>
  )
}

function HeroRoleGlyph({
  role,
  highlighted,
}: {
  role: "student" | "sponsor" | "recruit"
  highlighted: boolean
}) {
  const cls = `shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
    highlighted ? "bg-teal/10 text-teal" : "bg-paper-deep text-ink-soft"
  }`
  if (role === "student") {
    return (
      <span className={cls}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
          <path d="M3 8l9-5 9 5-9 5-9-5z" />
          <path d="M7 10v5c2 1.5 8 1.5 10 0v-5" />
        </svg>
      </span>
    )
  }
  if (role === "sponsor") {
    return (
      <span className={cls}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M9 8h5a2 2 0 0 1 0 4H9m0 0h6m-6 0v4h6" />
        </svg>
      </span>
    )
  }
  return (
    <span className={cls}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
        <circle cx="11" cy="11" r="6" />
        <path d="M21 21l-5.5-5.5" />
      </svg>
    </span>
  )
}
