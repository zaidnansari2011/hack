"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import type { SponsorDashboard } from "@pol/shared"

import { ApiClientError, apiFetch } from "@/lib/api"
import { BountyRow } from "@/components/sponsor/bounty-row"
import { DashboardCharts } from "@/components/sponsor/dashboard-charts"
import { NewBountyModal } from "@/components/sponsor/new-bounty-modal"
import { StatCard } from "@/components/sponsor/stat-card"

const REFRESH_MS = 6000

export default function SponsorDashboardPage() {
  return (
    <Suspense fallback={null}>
      <SponsorDashboardInner />
    </Suspense>
  )
}

function SponsorDashboardInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [data, setData] = useState<SponsorDashboard | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [completionsBumped, setCompletionsBumped] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const [secondsAgo, setSecondsAgo] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)

  const lastCompletionsRef = useRef<number | null>(null)

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    try {
      const next = await apiFetch<SponsorDashboard>("/bounties/dashboard")
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
      setLastUpdated(Date.now())
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : "Could not load dashboard",
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  // Deep-link entry: `/dashboard?new=1` (used by the avatar dropdown and
  // legacy /bounties/new redirect) opens the create-bounty modal and then
  // strips the param so refreshes don't keep re-opening it.
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setModalOpen(true)
      router.replace("/dashboard")
    }
  }, [searchParams, router])

  // Polling loop — re-armed after each completed fetch.
  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    const tick = async () => {
      if (cancelled) return
      await load()
      if (!cancelled) timer = setTimeout(tick, REFRESH_MS)
    }
    tick()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [load])

  // "Updated Ns ago" ticker so the live indicator actually feels live.
  useEffect(() => {
    if (lastUpdated === null) return
    const id = window.setInterval(() => {
      setSecondsAgo(Math.round((Date.now() - lastUpdated) / 1000))
    }, 1000)
    setSecondsAgo(0)
    return () => window.clearInterval(id)
  }, [lastUpdated])

  return (
    <div className="space-y-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow eyebrow-tick">Sponsor portal</div>
          <h1 className="display-lg mt-3 text-balance text-ink">Your impact</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <LiveIndicator
              secondsAgo={secondsAgo}
              refreshing={refreshing}
              onRefresh={() => load(true)}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/insights"
            className="text-[0.8125rem] font-medium text-ink-soft underline-offset-4 transition-colors hover:text-ink hover:underline"
          >
            View insights →
          </Link>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="group inline-flex items-center gap-2.5 rounded-full bg-ink px-6 py-3 text-[0.875rem] font-medium text-paper transition-all duration-300 ease-out-quart hover:bg-ink/90"
          >
            New bounty
            <span className="transition-transform duration-300 ease-out-quart group-hover:translate-x-0.5">
              +
            </span>
          </button>
        </div>
      </header>

      {error && (
        <div className="border-l-2 border-terracotta bg-terracotta/5 px-4 py-2.5 text-[0.8125rem] text-terracotta">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-px overflow-hidden rounded-md border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse bg-surface" />
          ))}
        </div>
      ) : data ? (
        <>
          {/* Headline stats — colour carries the hierarchy */}
          <div className="grid gap-px overflow-hidden rounded-md border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Active bounties"
              value={data.activeBounties.toLocaleString("en-IN")}
              hint={`${data.totalBounties} total`}
              accent="primary"
              icon={<span className="text-[0.875rem]">◎</span>}
            />
            <StatCard
              label="Verified completions"
              value={data.studentsCompleted.toLocaleString("en-IN")}
              hint="Each backed by a public on-chain event"
              accent="success"
              pulse={completionsBumped}
              icon={<span className="text-[0.875rem]">✓</span>}
            />
            <StatCard
              label="Committed"
              value={`₹${data.totalCommittedInr.toLocaleString("en-IN")}`}
              hint="Across all bounties"
              accent="amber"
              icon={<span className="text-[0.875rem]">₹</span>}
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
              icon={<span className="text-[0.875rem]">↯</span>}
            />
          </div>

          {/* Visuals replace the old second stat block */}
          <DashboardCharts data={data} />

          {data.topScorers.length > 0 && (
            <section>
              <div className="flex items-baseline justify-between">
                <h2 className="eyebrow eyebrow-tick">Leaderboard</h2>
                <span className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-faint">
                  Ranked by quiz score
                </span>
              </div>
              <ol className="mt-5 divide-y divide-rule overflow-hidden rounded-md border border-rule bg-surface">
                {data.topScorers.map((s, i) => {
                  const rank = i + 1
                  const statsHref = s.studentAddress
                    ? `/credentials/${s.studentAddress}`
                    : `/verify/${s.txHash}`
                  const medal =
                    rank === 1
                      ? "bg-amber text-paper"
                      : rank === 2
                        ? "bg-ink-soft text-paper"
                        : rank === 3
                          ? "bg-terracotta text-paper"
                          : "bg-paper text-ink-faint border border-rule"
                  return (
                    <li
                      key={s.txHash}
                      className={`flex items-center justify-between gap-4 px-5 py-3.5 transition-colors ${
                        rank <= 3 ? "bg-amber/[0.03]" : ""
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <span
                          className={`tabular grid h-7 w-7 shrink-0 place-items-center rounded-full font-mono text-[0.6875rem] font-semibold ${medal}`}
                        >
                          {rank}
                        </span>
                        <Link
                          href={statsHref}
                          className="grid h-9 w-9 place-items-center rounded-full bg-ink text-[0.75rem] font-semibold text-paper transition-transform hover:scale-105"
                          title="Open this student's profile"
                        >
                          {s.studentInitials || "?"}
                        </Link>
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
                          href={statsHref}
                          className="rounded-full border border-rule bg-paper px-3 py-1.5 font-mono text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-ink-soft transition-colors hover:border-ink/40 hover:text-ink"
                        >
                          view profile →
                        </Link>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </section>
          )}

          <section>
            <div className="flex items-baseline justify-between">
              <h2 className="eyebrow eyebrow-tick">Recent bounties</h2>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="link-underline text-[0.8125rem] font-medium text-ink-soft hover:text-ink"
              >
                Fund another →
              </button>
            </div>

            <div className="mt-5">
              {data.recentBounties.length === 0 ? (
                <EmptyState onCreate={() => setModalOpen(true)} />
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

      <NewBountyModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => load(true)}
      />
    </div>
  )
}

function LiveIndicator({
  secondsAgo,
  refreshing,
  onRefresh,
}: {
  secondsAgo: number
  refreshing: boolean
  onRefresh: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-forest opacity-60" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-forest" />
      </span>
      <span className="font-mono text-[0.6875rem] text-ink-faint">
        {refreshing
          ? "updating…"
          : secondsAgo < 2
            ? "just now"
            : `updated ${secondsAgo}s ago`}
      </span>
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        title="Refresh now"
        className="grid h-6 w-6 place-items-center rounded-full border border-rule text-ink-faint transition-colors hover:border-ink/30 hover:text-ink disabled:opacity-40"
      >
        <span className={refreshing ? "inline-block animate-spin" : "inline-block"}>↻</span>
      </button>
    </div>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="grid place-items-center rounded-md border border-dashed border-rule bg-surface px-6 py-14 text-center">
      <div className="font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-ink-faint">
        Nothing on the ledger yet
      </div>
      <h3 className="display-md mt-3 max-w-md text-ink">Open your first bounty.</h3>
      <p className="mt-3 max-w-md text-[0.9375rem] leading-relaxed text-ink-muted">
        Pick a curriculum, set the per-student reward and seat cap, and fund the
        escrow. Completions begin landing the moment a student passes.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-2.5 text-[0.8125rem] font-medium text-paper transition-colors hover:bg-ink/90"
      >
        Create a bounty →
      </button>
    </div>
  )
}
