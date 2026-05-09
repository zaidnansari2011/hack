"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useState } from "react"
import type { ActivityEvent, PlatformStats } from "@pol/shared"

import { apiFetch } from "@/lib/api"
import { ease } from "@/lib/motion"

const REFRESH_MS = 8000
type Payload = { events: ActivityEvent[]; stats: PlatformStats }

export function LiveActivity() {
  const [data, setData] = useState<Payload | null>(null)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const tick = async () => {
      try {
        const next = await apiFetch<Payload>("/activity", { token: null })
        if (!cancelled) setData(next)
      } catch {
        // hold last good data
      } finally {
        if (!cancelled) timer = setTimeout(tick, REFRESH_MS)
      }
    }
    tick()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [])

  return (
    <section
      id="live"
      className="relative isolate border-y border-rule bg-paper-deep/40"
    >
      <div className="mx-auto w-[min(1240px,94vw)] py-24">
        <Header />

        <div className="mt-12 grid gap-px overflow-hidden rounded-md border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Bounties live"
            value={data?.stats.totalBounties}
          />
          <Stat
            label="Verified completions"
            value={data?.stats.totalCompletions}
            accent
          />
          <Stat
            label="Paid in INR"
            value={data ? `₹${data.stats.totalPaidInr.toLocaleString("en-IN")}` : null}
          />
          <Stat
            label="Active learners"
            value={data?.stats.activeStudents}
          />
        </div>

        <div className="mt-10 grid gap-2">
          <div className="flex items-baseline justify-between">
            <span className="eyebrow eyebrow-tick">Recent events</span>
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-faint">
              auto-refresh · 8s
            </span>
          </div>

          <ul className="mt-2 divide-y divide-rule overflow-hidden rounded-md border border-rule bg-surface">
            <AnimatePresence initial={false}>
              {(data?.events ?? []).slice(0, 6).map((ev) => (
                <ActivityRow
                  key={`${ev.kind}-${ev.at}-${ev.bountyId}`}
                  ev={ev}
                />
              ))}
            </AnimatePresence>
            {!data && (
              <>
                {Array.from({ length: 4 }).map((_, i) => (
                  <li
                    key={i}
                    className="h-[68px] animate-pulse bg-surface-soft"
                  />
                ))}
              </>
            )}
          </ul>
        </div>
      </div>
    </section>
  )
}

function Header() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-end lg:gap-16">
      <div>
        <div className="inline-flex items-center gap-3 text-[0.6875rem] font-semibold uppercase tracking-[0.28em] text-ink-muted">
          <span className="live-dot" />
          Live network
        </div>
        <h2 className="display-lg mt-5 text-balance text-ink">
          The protocol,{" "}
          <span className="display-italic text-teal">in real time.</span>
        </h2>
      </div>
      <p className="text-balance text-[1.0625rem] leading-relaxed text-ink-muted">
        Pulled directly from Postgres + on-chain index. Every row is a real
        platform event — bounties opening, students enrolling, quizzes
        passing, rupees moving.
      </p>
    </div>
  )
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: number | string | null | undefined
  accent?: boolean
}) {
  return (
    <div className="bg-surface px-6 py-7">
      <div className="eyebrow text-[0.625rem]">{label}</div>
      <div
        className={`tabular mt-3 font-display text-[2.25rem] font-medium tracking-tight ${
          accent ? "text-teal" : "text-ink"
        }`}
      >
        {value === null || value === undefined ? (
          <span className="inline-block h-8 w-20 animate-pulse rounded-sm bg-rule/60" />
        ) : typeof value === "number" ? (
          value.toLocaleString("en-IN")
        ) : (
          value
        )}
      </div>
    </div>
  )
}

function ActivityRow({ ev }: { ev: ActivityEvent }) {
  const at = new Date(ev.at)
  const rel = relativeTime(at)
  const dot =
    ev.kind === "completion"
      ? "bg-forest"
      : ev.kind === "bounty_funded"
        ? "bg-teal"
        : "bg-ink-muted"

  let kicker = ""
  let middle: React.ReactNode = null
  let right: React.ReactNode = null

  if (ev.kind === "completion") {
    kicker = "Completion"
    middle = (
      <span>
        <strong className="text-ink">{ev.studentInitials}</strong>{" "}
        <span className="text-ink-muted">passed</span>{" "}
        <strong className="text-ink">{ev.bountyTitle}</strong>{" "}
        <span className="text-ink-faint">— {ev.curriculumTitle}</span>
      </span>
    )
    right = ev.txHash ? (
      <a
        href={`https://sepolia.basescan.org/tx/${ev.txHash}`}
        target="_blank"
        rel="noreferrer"
        className="font-mono text-[0.6875rem] text-teal hover:underline"
      >
        {ev.txHash.slice(0, 8)}…{ev.txHash.slice(-6)} ↗
      </a>
    ) : null
  } else if (ev.kind === "bounty_funded") {
    kicker = "Funded"
    middle = (
      <span>
        <strong className="text-ink">{ev.sponsorName}</strong>{" "}
        <span className="text-ink-muted">opened</span>{" "}
        <strong className="text-ink">{ev.bountyTitle}</strong>{" "}
        <span className="text-ink-faint">
          — {ev.maxStudents.toLocaleString("en-IN")} seats × ₹
          {ev.rewardInr.toLocaleString("en-IN")}
        </span>
      </span>
    )
    right = ev.escrowTxHash ? (
      <a
        href={`https://sepolia.basescan.org/tx/${ev.escrowTxHash}`}
        target="_blank"
        rel="noreferrer"
        className="font-mono text-[0.6875rem] text-teal hover:underline"
      >
        escrow ↗
      </a>
    ) : null
  } else {
    kicker = "Enrolled"
    middle = (
      <span>
        <strong className="text-ink">{ev.studentInitials}</strong>{" "}
        <span className="text-ink-muted">started</span>{" "}
        <strong className="text-ink">{ev.curriculumTitle}</strong>
      </span>
    )
  }

  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: ease.outQuart }}
      className="flex items-center gap-5 px-5 py-4 text-[0.875rem]"
    >
      <span className="flex w-24 shrink-0 items-center gap-2.5">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-ink-muted">
          {kicker}
        </span>
      </span>
      <span className="min-w-0 flex-1 truncate text-ink-soft">{middle}</span>
      {right && <span className="hidden md:block">{right}</span>}
      <span className="w-16 shrink-0 text-right font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-faint">
        {rel}
      </span>
    </motion.li>
  )
}

function relativeTime(d: Date): string {
  const seconds = Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
