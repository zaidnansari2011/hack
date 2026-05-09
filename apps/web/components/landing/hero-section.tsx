"use client"

import Link from "next/link"
import { animate, motion, useMotionValue, useSpring, useTransform } from "framer-motion"
import { useEffect, useRef, useState } from "react"
import type { PlatformStats } from "@pol/shared"

import { apiFetch } from "@/lib/api"
import { ease } from "@/lib/motion"

export function HeroSection() {
  return (
    <section className="relative isolate min-h-[92vh] overflow-hidden">
      <AnimatedBackground />
      <div className="relative z-10 mx-auto flex w-[min(1240px,94vw)] flex-col justify-center gap-16 pb-16 pt-20 lg:min-h-[92vh] lg:flex-row lg:items-center lg:gap-20 lg:pb-24 lg:pt-0">
        <Headline />
        <ProofCard />
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
            "radial-gradient(circle, hsl(192 75% 22% / 0.10) 0%, transparent 70%)",
        }}
        animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute -right-64 top-1/4 h-[600px] w-[600px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, hsl(13 56% 50% / 0.08) 0%, transparent 65%)",
        }}
        animate={{ x: [0, -50, 30, 0], y: [0, 40, -20, 0] }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear", delay: 4 }}
      />
      <motion.div
        className="absolute bottom-0 left-1/3 h-[500px] w-[500px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, hsl(148 33% 37% / 0.07) 0%, transparent 65%)",
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
            "linear-gradient(to bottom, transparent, hsl(38 32% 95%))",
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
  { text: "them —" },
  { text: "in" },
  { text: "seconds.", italic: true },
]

function Headline() {
  return (
    <div className="flex max-w-2xl flex-col gap-8 lg:max-w-[52%]">
      {/* Kicker */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: ease.outQuart }}
        className="flex items-center gap-3"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-forest opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-forest" />
        </span>
        <span className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.28em] text-ink-muted">
          Live on Base Sepolia
        </span>
      </motion.div>

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
        className="max-w-[54ch] text-balance text-[1.0625rem] leading-relaxed text-ink-soft"
      >
        Companies deposit USDC into per-bounty escrow on Base. Students learn with
        an AI tutor, pass an anti-cheat quiz, and receive guaranteed INR payouts to
        UPI. Every completion is a public on-chain event.
      </motion.p>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: ease.outQuart, delay: 1 }}
        className="flex flex-wrap items-center gap-4"
      >
        <Link
          href="/signup"
          className="group inline-flex items-center gap-3 rounded-full bg-ink px-7 py-3.5 text-[0.9375rem] font-medium text-paper shadow-[0_16px_40px_-12px_hsl(218_39%_12%_/_0.45)] transition-all duration-300 ease-out-quart hover:-translate-y-0.5 hover:shadow-[0_22px_48px_-12px_hsl(218_39%_12%_/_0.55)]"
        >
          Open the platform
          <motion.span
            initial={{ x: 0 }}
            whileHover={{ x: 4 }}
            className="inline-block"
          >
            →
          </motion.span>
        </Link>
        <Link
          href="/learn"
          className="inline-flex items-center gap-2 text-[0.9375rem] font-medium text-ink-soft underline-offset-4 transition-colors hover:text-ink hover:underline"
        >
          See active bounties ↗
        </Link>
      </motion.div>

      {/* Live stats row */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.2 }}
        className="flex items-center gap-6 border-t border-rule pt-6"
      >
        <StatTicker label="Bounties live" endpoint="totalBounties" />
        <div className="h-6 w-px bg-rule" />
        <StatTicker label="Completions verified" endpoint="totalCompletions" accent />
        <div className="h-6 w-px bg-rule" />
        <StatTicker label="Paid in INR" endpoint="totalPaidInr" prefix="₹" />
      </motion.div>
    </div>
  )
}

function StatTicker({
  label,
  endpoint,
  accent,
  prefix = "",
}: {
  label: string
  endpoint: keyof PlatformStats
  accent?: boolean
  prefix?: string
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
      .catch(() => undefined)
  }, [endpoint, displayed])

  return (
    <div>
      <div className="eyebrow text-[0.6rem]">{label}</div>
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

/* ── Animated proof card ────────────────────────────────── */

type Step = {
  id: string
  label: string
  sub: string
  status: "done" | "active" | "pending"
  badge?: string
  badgeColor?: "forest" | "teal" | "amber"
}

const FLOW_STATES: Step[][] = [
  // State 0 — quiz passed
  [
    { id: "quiz", label: "Quiz submitted", sub: "5 of 5 answered · 80%", status: "active", badge: "Scoring…", badgeColor: "amber" },
    { id: "verify", label: "On-chain verification", sub: "LearningVerified event", status: "pending" },
    { id: "payout", label: "Razorpay UPI payout", sub: "₹250 → aarav@upi", status: "pending" },
    { id: "sbt", label: "Soulbound credential", sub: "LearnCredential.sol · Base", status: "pending" },
  ],
  // State 1 — verified
  [
    { id: "quiz", label: "Quiz passed", sub: "5 of 5 answered · 80%", status: "done", badge: "✓ Pass", badgeColor: "forest" },
    { id: "verify", label: "On-chain verification", sub: "LearningVerified event", status: "active", badge: "Broadcasting…", badgeColor: "amber" },
    { id: "payout", label: "Razorpay UPI payout", sub: "₹250 → aarav@upi", status: "pending" },
    { id: "sbt", label: "Soulbound credential", sub: "LearnCredential.sol · Base", status: "pending" },
  ],
  // State 2 — payout in flight
  [
    { id: "quiz", label: "Quiz passed", sub: "5 of 5 answered · 80%", status: "done", badge: "✓ Pass", badgeColor: "forest" },
    { id: "verify", label: "Proof recorded on-chain", sub: "0x4a3f…c8e2 · Base Sepolia", status: "done", badge: "✓ Minted", badgeColor: "forest" },
    { id: "payout", label: "Razorpay UPI payout", sub: "₹250 → aarav@upi", status: "active", badge: "Processing…", badgeColor: "amber" },
    { id: "sbt", label: "Soulbound credential", sub: "LearnCredential.sol · Base", status: "pending" },
  ],
  // State 3 — all done
  [
    { id: "quiz", label: "Quiz passed", sub: "5 of 5 answered · 80%", status: "done", badge: "✓ Pass", badgeColor: "forest" },
    { id: "verify", label: "Proof recorded on-chain", sub: "0x4a3f…c8e2 · Base Sepolia", status: "done", badge: "✓ Minted", badgeColor: "forest" },
    { id: "payout", label: "Payout confirmed", sub: "₹250 landed in UPI — 2.3s", status: "done", badge: "✓ Sent", badgeColor: "forest" },
    { id: "sbt", label: "Soulbound credential", sub: "Token #4821 · non-transferable", status: "done", badge: "✓ Minted", badgeColor: "teal" },
  ],
]

const STATE_DELAYS = [2400, 1800, 1800, 4000]

function ProofCard() {
  const [stateIdx, setStateIdx] = useState(0)
  const steps = FLOW_STATES[stateIdx]!

  useEffect(() => {
    const delay = STATE_DELAYS[stateIdx] ?? 2000
    const id = setTimeout(() => {
      setStateIdx((i) => (i + 1) % FLOW_STATES.length)
    }, delay)
    return () => clearTimeout(id)
  }, [stateIdx])

  const isComplete = stateIdx === FLOW_STATES.length - 1

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, ease: ease.outQuart, delay: 0.4 }}
      className="relative w-full lg:max-w-[420px]"
    >
      {/* Floating glow behind the card */}
      <div
        aria-hidden
        className="absolute -inset-4 -z-10 rounded-2xl opacity-60 blur-2xl"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, hsl(192 75% 22% / 0.18), transparent 70%)",
        }}
      />

      <div className="overflow-hidden rounded-xl border border-rule bg-surface shadow-[0_32px_80px_-24px_hsl(218_39%_12%_/_0.18)]">
        {/* Card header */}
        <div className="flex items-center justify-between border-b border-rule bg-paper-deep/60 px-5 py-4">
          <div>
            <div className="eyebrow eyebrow-tick text-[0.625rem]">Proof-of-Learn</div>
            <div className="mt-0.5 font-display text-[0.9375rem] font-medium text-ink">
              Rust Foundations — completion
            </div>
          </div>
          <motion.div
            animate={isComplete ? { scale: [1, 1.12, 1] } : {}}
            transition={{ duration: 0.5 }}
            className={`rounded-full px-3 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.18em] ${
              isComplete
                ? "bg-forest-soft text-forest"
                : "bg-amber/15 text-amber"
            }`}
          >
            {isComplete ? "Complete ✓" : "In progress"}
          </motion.div>
        </div>

        {/* Steps */}
        <div className="divide-y divide-rule/60">
          {steps.map((step) => (
            <StepRow key={step.id} step={step} />
          ))}
        </div>

        {/* Reward row */}
        <motion.div
          animate={
            isComplete
              ? { backgroundColor: "hsl(148 33% 37% / 0.06)" }
              : { backgroundColor: "hsl(38 32% 95% / 0.4)" }
          }
          transition={{ duration: 0.8 }}
          className="flex items-center justify-between border-t border-rule px-5 py-4"
        >
          <div>
            <div className="eyebrow text-[0.625rem]">Student reward</div>
            <div className="mt-1 font-mono text-[0.6875rem] text-ink-muted">
              aarav.sharma@upi
            </div>
          </div>
          <motion.div
            animate={isComplete ? { scale: [0.9, 1.06, 1] } : { scale: 0.9, opacity: 0.4 }}
            transition={{ duration: 0.6 }}
            className={`font-display text-[1.75rem] font-medium tabular ${
              isComplete ? "text-ink" : "text-ink-muted"
            }`}
          >
            ₹250
          </motion.div>
        </motion.div>
      </div>

      {/* Caption below */}
      <div className="mt-3 text-center font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-faint">
        Live demo · replays automatically
      </div>
    </motion.div>
  )
}

const BADGE_COLORS = {
  forest: "border-forest/30 bg-forest-soft text-forest",
  teal: "border-teal/30 bg-teal-tint text-teal",
  amber: "border-amber/30 bg-amber/10 text-amber",
}

function StepRow({ step }: { step: Step }) {
  const isDone = step.status === "done"
  const isActive = step.status === "active"

  return (
    <motion.div
      layout
      className={`flex items-center gap-4 px-5 py-3.5 transition-colors duration-700 ${
        isDone ? "bg-surface" : isActive ? "bg-teal-tint/30" : "bg-paper-deep/20"
      }`}
    >
      {/* Icon */}
      <div
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[0.625rem] transition-all duration-700 ${
          isDone
            ? "bg-forest text-paper"
            : isActive
              ? "bg-amber/20 text-amber ring-2 ring-amber/30"
              : "bg-rule text-ink-faint"
        }`}
      >
        {isDone ? (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            ✓
          </motion.span>
        ) : isActive ? (
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
            className="block h-3 w-3 rounded-full border-2 border-amber border-t-transparent"
          />
        ) : (
          "·"
        )}
      </div>

      {/* Label */}
      <div className="min-w-0 flex-1">
        <div
          className={`text-[0.875rem] font-medium leading-tight transition-colors duration-500 ${
            isDone ? "text-ink" : isActive ? "text-ink-soft" : "text-ink-faint"
          }`}
        >
          {step.label}
        </div>
        <div className="mt-0.5 truncate font-mono text-[0.6875rem] text-ink-faint">
          {step.sub}
        </div>
      </div>

      {/* Badge */}
      {step.badge && (
        <motion.span
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.16em] ${
            BADGE_COLORS[step.badgeColor ?? "amber"]
          }`}
        >
          {step.badge}
        </motion.span>
      )}
    </motion.div>
  )
}
