"use client"

import { useEffect, useState } from "react"
import type { SponsorDashboard } from "@pol/shared"

import { ApiClientError, apiFetch } from "@/lib/api"
import {
  BountyProgressChart,
  CommittedSplit,
  CompletionDonut,
} from "@/components/sponsor/dashboard-charts"
import { StatCard } from "@/components/sponsor/stat-card"

export default function SponsorInsightsPage() {
  const [data, setData] = useState<SponsorDashboard | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch<SponsorDashboard>("/bounties/dashboard")
      .then((d) => setData(d))
      .catch((err) =>
        setError(
          err instanceof ApiClientError ? err.message : "Could not load insights",
        ),
      )
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-12">
      <header>
        <div className="eyebrow eyebrow-tick">Sponsor portal</div>
        <h1 className="display-lg mt-3 text-balance text-ink">Insights</h1>
        <p className="mt-3 max-w-xl text-[0.9375rem] leading-relaxed text-ink-muted">
          A deeper look at where your money goes and how well it converts into
          verified learning. Every number traces back to an on-chain completion.
        </p>
      </header>

      {error && (
        <div className="border-l-2 border-terracotta bg-terracotta/5 px-4 py-2.5 text-[0.8125rem] text-terracotta">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-px overflow-hidden rounded-md border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse bg-surface" />
          ))}
        </div>
      ) : data ? (
        <>
          <div className="grid gap-px overflow-hidden rounded-md border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Total deposited"
              value={`₹${data.analytics.totalDeposited.toLocaleString("en-IN")}`}
              hint="Lifetime escrow funded"
              accent="amber"
            />
            <StatCard
              label="Total released"
              value={`₹${data.analytics.totalReleased.toLocaleString("en-IN")}`}
              hint="Paid to verified learners"
              accent="primary"
            />
            <StatCard
              label="Cost / verified learner"
              value={
                data.analytics.costPerVerifiedLearnerInr > 0
                  ? `₹${data.analytics.costPerVerifiedLearnerInr.toLocaleString("en-IN")}`
                  : "·"
              }
              hint={
                data.analytics.bootcampMultiplier > 0
                  ? `${data.analytics.bootcampMultiplier}× cheaper than a bootcamp`
                  : "First completion unlocks this"
              }
              accent="terracotta"
            />
            <StatCard
              label="Completion rate"
              value={`${data.analytics.completionRatePct}%`}
              hint="Enrolled to quiz-passed"
              accent="success"
            />
            <StatCard
              label="Average score"
              value={
                data.analytics.averageScorePct > 0
                  ? `${data.analytics.averageScorePct}%`
                  : "·"
              }
              hint="Across all passed quizzes"
              accent="primary"
            />
            <StatCard
              label="Median time to pass"
              value={
                data.analytics.medianMinutesToComplete !== null
                  ? `${data.analytics.medianMinutesToComplete} min`
                  : "·"
              }
              hint="Enrol to quiz submitted"
              accent="default"
            />
          </div>

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
          </section>

          {data.recentBounties.length > 0 && (
            <section>
              <h2 className="eyebrow eyebrow-tick mb-5">Per-bounty fill rate</h2>
              <div className="rounded-md border border-rule bg-surface p-6">
                <BountyProgressChart bounties={data.recentBounties} />
              </div>
            </section>
          )}

          {data.topScorers.length > 0 && (
            <section>
              <h2 className="eyebrow eyebrow-tick mb-5">
                Score distribution (top performers)
              </h2>
              <div className="space-y-3 rounded-md border border-rule bg-surface p-6">
                {data.topScorers.slice(0, 8).map((s) => (
                  <div key={s.txHash} className="flex items-center gap-4">
                    <span className="w-28 shrink-0 truncate text-[0.8125rem] text-ink-soft">
                      {s.studentInitials}
                    </span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-rule/50">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-teal to-forest"
                        style={{ width: `${Math.max(2, s.scorePct)}%` }}
                      />
                    </div>
                    <span className="tabular w-12 shrink-0 text-right font-mono text-[0.75rem] text-ink">
                      {s.scorePct}%
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      ) : null}
    </div>
  )
}
