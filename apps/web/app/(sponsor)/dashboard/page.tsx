"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import type { SponsorDashboard } from "@pol/shared"

import { ApiClientError, apiFetch } from "@/lib/api"
import { BountyRow } from "@/components/sponsor/bounty-row"
import { ChainBadge } from "@/components/sponsor/chain-badge"
import { StatCard } from "@/components/sponsor/stat-card"

const REFRESH_MS = 6000

export default function SponsorDashboardPage() {
  const [data, setData] = useState<SponsorDashboard | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [completionsBumped, setCompletionsBumped] = useState(false)

  const lastCompletionsRef = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const tick = async () => {
      try {
        const next = await apiFetch<SponsorDashboard>("/bounties/dashboard")
        if (cancelled) return
        setError(null)
        if (
          lastCompletionsRef.current !== null &&
          next.studentsCompleted > lastCompletionsRef.current
        ) {
          setCompletionsBumped(true)
          window.setTimeout(() => setCompletionsBumped(false), 1400)
        }
        lastCompletionsRef.current = next.studentsCompleted
        setData(next)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : "Could not load dashboard",
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
          timer = setTimeout(tick, REFRESH_MS)
        }
      }
    }
    tick()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [])

  return (
    <div className="space-y-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow eyebrow-tick">Sponsor portal</div>
          <h1 className="display-lg mt-3 text-balance text-ink">
            Funded ledger
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <ChainBadge />
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-ink-faint">
              auto-refresh · 6s
            </span>
          </div>
        </div>
        <Link
          href="/bounties/new"
          className="group inline-flex items-center gap-2.5 rounded-full bg-ink px-6 py-3 text-[0.875rem] font-medium text-paper transition-all duration-300 ease-out-quart hover:bg-ink/90"
        >
          New bounty
          <span className="transition-transform duration-300 ease-out-quart group-hover:translate-x-0.5">
            →
          </span>
        </Link>
      </header>

      {error && (
        <div className="border-l-2 border-terracotta bg-terracotta/5 px-4 py-2.5 text-[0.8125rem] text-terracotta">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-px overflow-hidden rounded-md border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse bg-surface" />
          ))}
        </div>
      ) : data ? (
        <>
          <div className="grid gap-px overflow-hidden rounded-md border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Active bounties"
              value={data.activeBounties.toLocaleString("en-IN")}
              hint={`${data.totalBounties} total`}
              accent="primary"
            />
            <StatCard
              label="Verified completions"
              value={data.studentsCompleted.toLocaleString("en-IN")}
              hint="Each backed by a public on-chain event"
              accent="success"
              pulse={completionsBumped}
            />
            <StatCard
              label="Committed"
              value={`₹${data.totalCommittedInr.toLocaleString("en-IN")}`}
              hint="Across all bounties"
            />
            <StatCard
              label="Remaining"
              value={`₹${data.totalRemainingInr.toLocaleString("en-IN")}`}
              hint="Unspent + reclaimable"
            />
          </div>

          <section>
            <div className="flex items-baseline justify-between">
              <h2 className="eyebrow eyebrow-tick">Unit economics</h2>
              <span className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-faint">
                vs ₹35,000 bootcamp seat
              </span>
            </div>
            <div className="mt-5 grid gap-px overflow-hidden rounded-md border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Cost per verified learner"
                value={
                  data.analytics.costPerVerifiedLearnerInr > 0
                    ? `₹${data.analytics.costPerVerifiedLearnerInr.toLocaleString("en-IN")}`
                    : "—"
                }
                hint={
                  data.analytics.bootcampMultiplier > 0
                    ? `${data.analytics.bootcampMultiplier}× cheaper than bootcamps`
                    : "First completion unlocks this"
                }
                accent="primary"
              />
              <StatCard
                label="Completion rate"
                value={`${data.analytics.completionRatePct}%`}
                hint="Enrolled → quiz-passed"
                accent="success"
              />
              <StatCard
                label="Avg score"
                value={
                  data.analytics.averageScorePct > 0
                    ? `${data.analytics.averageScorePct}%`
                    : "—"
                }
                hint="Across all passed quizzes"
              />
              <StatCard
                label="Median time to pass"
                value={
                  data.analytics.medianMinutesToComplete !== null
                    ? `${data.analytics.medianMinutesToComplete} min`
                    : "—"
                }
                hint="Enrol → quiz submitted"
              />
            </div>
          </section>

          {data.topScorers.length > 0 && (
            <section>
              <div className="flex items-baseline justify-between">
                <h2 className="eyebrow eyebrow-tick">Top scorers</h2>
                <span className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-faint">
                  Across all your bounties
                </span>
              </div>
              <ol className="mt-5 divide-y divide-rule overflow-hidden rounded-md border border-rule bg-surface">
                {data.topScorers.map((s, i) => (
                  <li
                    key={s.txHash}
                    className="flex items-center justify-between gap-4 px-5 py-3.5"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <span className="tabular w-6 font-mono text-[0.75rem] font-semibold text-ink-faint">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {s.studentAddress ? (
                        <Link
                          href={`/credentials/${s.studentAddress}`}
                          className="grid h-9 w-9 place-items-center rounded-full bg-ink text-[0.75rem] font-semibold text-paper transition-transform hover:scale-105"
                          title="Open transcript"
                        >
                          {s.studentInitials || "?"}
                        </Link>
                      ) : (
                        <div className="grid h-9 w-9 place-items-center rounded-full bg-ink text-[0.75rem] font-semibold text-paper">
                          {s.studentInitials || "?"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-[0.875rem] font-medium text-ink">
                          {s.studentInitials} ·{" "}
                          <span className="text-ink-soft">{s.curriculumTitle}</span>
                        </div>
                        <div className="mt-0.5 font-mono text-[0.6875rem] text-ink-faint">
                          {s.bountyTitle}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-5">
                      <div className="text-right">
                        <div className="tabular font-display text-[1.125rem] font-medium leading-none text-teal">
                          {s.scorePct}%
                        </div>
                        <div className="mt-1 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-ink-faint">
                          ₹{s.rewardInr.toLocaleString("en-IN")}
                        </div>
                      </div>
                      <Link
                        href={`/verify/${s.txHash}`}
                        className="rounded-full border border-rule bg-paper px-3 py-1.5 font-mono text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-ink-soft transition-colors hover:border-ink/40 hover:text-ink"
                      >
                        verify →
                      </Link>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section>
            <div className="flex items-baseline justify-between">
              <h2 className="eyebrow eyebrow-tick">Recent bounties</h2>
              <Link
                href="/bounties/new"
                className="link-underline text-[0.8125rem] font-medium text-ink-soft hover:text-ink"
              >
                Fund another →
              </Link>
            </div>

            <div className="mt-5">
              {data.recentBounties.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="divide-y divide-rule overflow-hidden rounded-md border border-rule bg-surface">
                  {data.recentBounties.map((b) => (
                    <BountyRow key={b.id} bounty={b} />
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="grid place-items-center rounded-md border border-dashed border-rule bg-surface px-6 py-14 text-center">
      <div className="font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-ink-faint">
        Nothing on the ledger yet
      </div>
      <h3 className="display-md mt-3 max-w-md text-ink">
        Open your first bounty.
      </h3>
      <p className="mt-3 max-w-md text-[0.9375rem] leading-relaxed text-ink-muted">
        Pick a curriculum, set the per-student reward and seat cap, and fund
        the escrow. Completions begin landing the moment a student passes.
      </p>
      <Link
        href="/bounties/new"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-2.5 text-[0.8125rem] font-medium text-paper transition-colors hover:bg-ink/90"
      >
        Create a bounty →
      </Link>
    </div>
  )
}
