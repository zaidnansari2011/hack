"use client"

import type { Bounty, SponsorDashboard } from "@pol/shared"

// Lightweight, dependency-free SVG charts. The dashboard had no visuals
// before — these turn the same numbers into something readable at a glance.

export function CompletionDonut({ pct }: { pct: number }) {
  const r = 52
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, pct))
  const dash = (clamped / 100) * c
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 140 140" className="h-32 w-32 -rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="hsl(var(--rule))" strokeWidth="14" />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="hsl(var(--forest))"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div>
        <div className="tabular font-display text-[2.5rem] font-medium leading-none text-forest">
          {clamped}%
        </div>
        <div className="mt-1 text-[0.8125rem] text-ink-muted">
          of enrolled students
          <br />
          pass the quiz
        </div>
      </div>
    </div>
  )
}

export function CommittedSplit({
  committed,
  remaining,
}: {
  committed: number
  remaining: number
}) {
  const spent = Math.max(0, committed - remaining)
  const spentPct = committed > 0 ? (spent / committed) * 100 : 0
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[0.8125rem] text-ink-soft">
          Released{" "}
          <span className="tabular font-medium text-teal">
            ₹{spent.toLocaleString("en-IN")}
          </span>
        </span>
        <span className="text-[0.8125rem] text-ink-soft">
          Remaining{" "}
          <span className="tabular font-medium text-ink">
            ₹{remaining.toLocaleString("en-IN")}
          </span>
        </span>
      </div>
      <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-rule/50">
        <div
          className="h-full bg-teal transition-all duration-700 ease-out"
          style={{ width: `${spentPct}%` }}
        />
        <div className="h-full flex-1 bg-amber/40" />
      </div>
      <div className="mt-2 text-[0.75rem] text-ink-muted">
        ₹{committed.toLocaleString("en-IN")} committed across all bounties.
        Unspent escrow is refundable.
      </div>
    </div>
  )
}

export function BountyProgressChart({ bounties }: { bounties: Bounty[] }) {
  const rows = bounties.slice(0, 6)
  if (rows.length === 0) return null
  return (
    <div className="space-y-3">
      {rows.map((b) => {
        const pct = b.maxStudents
          ? Math.min(100, Math.round((b.completed / b.maxStudents) * 100))
          : 0
        return (
          <div key={b.id}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-[0.8125rem] text-ink-soft">
                {b.title}
              </span>
              <span className="tabular shrink-0 font-mono text-[0.6875rem] text-ink-faint">
                {b.completed}/{b.maxStudents}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-rule/50">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal to-forest transition-all duration-700 ease-out"
                style={{ width: `${Math.max(2, pct)}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function DashboardCharts({ data }: { data: SponsorDashboard }) {
  return (
    <section className="grid gap-px overflow-hidden rounded-md border border-rule bg-rule lg:grid-cols-2">
      <div className="bg-surface p-6">
        <h2 className="eyebrow eyebrow-tick mb-5">Completion rate</h2>
        <CompletionDonut pct={data.analytics.completionRatePct} />
      </div>
      <div className="bg-surface p-6">
        <h2 className="eyebrow eyebrow-tick mb-5">Escrow flow</h2>
        <CommittedSplit
          committed={data.totalCommittedInr}
          remaining={data.totalRemainingInr}
        />
      </div>
      {data.recentBounties.length > 0 && (
        <div className="bg-surface p-6 lg:col-span-2">
          <h2 className="eyebrow eyebrow-tick mb-5">Bounty fill rate</h2>
          <BountyProgressChart bounties={data.recentBounties} />
        </div>
      )}
    </section>
  )
}
