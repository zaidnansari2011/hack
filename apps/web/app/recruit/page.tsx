"use client"

import Link from "next/link"
import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import type { RecruitResults } from "@pol/shared"

import { ApiClientError, apiFetch } from "@/lib/api"
import { useAuth } from "@/lib/use-auth"
import { ReachOutModal } from "@/components/recruit/reach-out-modal"
import { SponsorRail } from "@/components/sponsor/sponsor-rail"

const SCORE_OPTIONS = [
  { value: "0", label: "Any score" },
  { value: "60", label: "≥ 60%" },
  { value: "75", label: "≥ 75%" },
  { value: "90", label: "≥ 90%" },
] as const

const TIME_OPTIONS = [
  { value: "", label: "All time" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
] as const

export default function RecruitPage() {
  return (
    <Suspense fallback={null}>
      <RecruitInner />
    </Suspense>
  )
}

function RecruitInner() {
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const showSponsorRail = user?.role === "sponsor"

  const [curriculumSlug, setCurriculumSlug] = useState<string>(
    searchParams.get("curriculum") ?? "",
  )
  const [minScore, setMinScore] = useState<string>("60")
  const [withinDays, setWithinDays] = useState<string>("")
  const [data, setData] = useState<RecruitResults | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [outreachTarget, setOutreachTarget] = useState<
    | { address: string; label: string; context: string }
    | null
  >(null)

  const fetchResults = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams()
      if (curriculumSlug) qs.set("curriculum", curriculumSlug)
      if (minScore && minScore !== "0") qs.set("minScore", minScore)
      if (withinDays) qs.set("withinDays", withinDays)
      const next = await apiFetch<RecruitResults>(
        `/recruit${qs.toString() ? `?${qs.toString()}` : ""}`,
        { token: null },
      )
      setData(next)
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Could not run search",
      )
    } finally {
      setLoading(false)
    }
  }, [curriculumSlug, minScore, withinDays])

  useEffect(() => {
    fetchResults()
  }, [fetchResults])

  const summary = useMemo(() => {
    if (!data) return null
    const slug = curriculumSlug
    const slugLabel = slug
      ? data.curricula.find((c) => c.slug === slug)?.title ?? slug
      : "any curriculum"
    const min = Number(minScore || 0)
    const window =
      TIME_OPTIONS.find((t) => t.value === withinDays)?.label.toLowerCase() ??
      "all time"
    return `${data.total} verified · ${slugLabel} · ≥ ${min}% · ${window}`
  }, [data, curriculumSlug, minScore, withinDays])

  return (
    <div
      className={
        showSponsorRail
          ? "relative isolate mx-auto grid w-[min(1240px,94vw)] gap-10 py-12 lg:grid-cols-[220px_1fr] lg:gap-16"
          : "mx-auto w-[min(1180px,94vw)] py-10"
      }
    >
      {showSponsorRail && <SponsorRail />}
      <div>
      <div className="flex items-center justify-end">
        <span className="font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-ink-faint">
          Recruiter portal
        </span>
      </div>
      <div className="mt-8">
        <div className="max-w-2xl">
          <span className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-teal">
            Verifiable talent layer
          </span>
          <h1 className="mt-4 font-display text-[2.5rem] font-medium leading-[1.1] tracking-tight text-ink">
            Hire from a pool that can&rsquo;t be faked.
          </h1>
          <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-muted">
            Every candidate below passed a proctored quiz, was paid in
            real INR, and has a soulbound credential on Base Sepolia. Click
            any row to verify the receipt yourself.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-6">
            <FilterBlock label="Curriculum">
              <select
                value={curriculumSlug}
                onChange={(e) => setCurriculumSlug(e.target.value)}
                className="w-full rounded-sm border border-rule bg-paper px-3 py-2 text-[0.875rem] text-ink focus:border-ink focus:outline-none"
              >
                <option value="">All curricula</option>
                {(data?.curricula ?? []).map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.title} ({c.passedCount})
                  </option>
                ))}
              </select>
            </FilterBlock>

            <FilterBlock label="Minimum score">
              <div className="grid grid-cols-2 gap-1.5">
                {SCORE_OPTIONS.map((opt) => (
                  <PillButton
                    key={opt.value}
                    active={minScore === opt.value}
                    onClick={() => setMinScore(opt.value)}
                  >
                    {opt.label}
                  </PillButton>
                ))}
              </div>
            </FilterBlock>

            <FilterBlock label="Time window">
              <div className="grid grid-cols-2 gap-1.5">
                {TIME_OPTIONS.map((opt) => (
                  <PillButton
                    key={opt.value}
                    active={withinDays === opt.value}
                    onClick={() => setWithinDays(opt.value)}
                  >
                    {opt.label}
                  </PillButton>
                ))}
              </div>
            </FilterBlock>

            <div className="rounded-md border border-rule bg-surface-soft p-4">
              <div className="font-mono text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-ink-faint">
                Why this works
              </div>
              <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-muted">
                Every score on this list is committed on-chain via a
                soulbound credential. Resumes lie. Receipts don&rsquo;t.
              </p>
            </div>
          </aside>

          <section>
            <div className="flex items-center justify-between border-b border-rule pb-3">
              <span className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-ink-faint">
                {summary ?? "Searching…"}
              </span>
              {loading && (
                <span className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-faint">
                  loading
                </span>
              )}
            </div>

            {error && (
              <div className="mt-6 rounded-md border border-terracotta/30 bg-terracotta/5 p-4 text-[0.8125rem] text-terracotta">
                {error}
              </div>
            )}

            {!error && loading && !data && (
              <ul className="mt-2 divide-y divide-rule/60">
                {[0, 1, 2, 3, 4].map((i) => (
                  <li key={i} className="flex items-center justify-between gap-4 py-4">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-rule/50" />
                      <div className="space-y-2">
                        <div className="h-3 w-40 animate-pulse rounded bg-rule/50" />
                        <div className="h-2.5 w-28 animate-pulse rounded bg-rule/40" />
                      </div>
                    </div>
                    <div className="h-6 w-14 animate-pulse rounded-full bg-rule/40" />
                  </li>
                ))}
              </ul>
            )}

            {!error && data && data.candidates.length === 0 && (
              <div className="mt-12 rounded-md border border-rule bg-surface p-10 text-center">
                <div className="font-mono text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-ink-faint">
                  No matches
                </div>
                <p className="mt-3 text-[0.875rem] text-ink-muted">
                  Try widening the score floor or the time window.
                </p>
              </div>
            )}

            {data && data.candidates.length > 0 && (
              <ul className="mt-2 divide-y divide-rule/60">
                {data.candidates.map((c) => (
                  <li key={c.txHash}>
                    <div className="flex items-center justify-between gap-4 py-4 transition-colors hover:bg-surface-soft">
                      <div className="flex min-w-0 items-center gap-4">
                        {c.studentAddress ? (
                          <Link
                            href={`/credentials/${c.studentAddress}`}
                            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-[0.8125rem] font-semibold tracking-wider text-paper transition-transform hover:scale-105"
                            title="View full transcript"
                          >
                            {c.studentInitials || "?"}
                          </Link>
                        ) : (
                          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-[0.8125rem] font-semibold tracking-wider text-paper">
                            {c.studentInitials || "?"}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-[0.9375rem] font-medium text-ink">
                            {c.studentAddress ? (
                              <Link
                                href={`/credentials/${c.studentAddress}`}
                                className="hover:underline"
                              >
                                {c.studentInitials}
                              </Link>
                            ) : (
                              c.studentInitials
                            )}{" "}
                            ·{" "}
                            <span className="text-ink-soft">
                              {c.curriculumTitle}
                            </span>
                          </div>
                          {c.studentAddress && (
                            <Link
                              href={`/credentials/${c.studentAddress}`}
                              className="mt-0.5 inline-block font-mono text-[0.6875rem] text-ink-faint hover:text-ink"
                            >
                              {c.studentAddress.slice(0, 10)}…
                              {c.studentAddress.slice(-8)} ↗
                            </Link>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="tabular font-display text-[1.25rem] font-medium leading-none text-teal">
                            {c.scorePct}%
                          </div>
                          <div className="mt-1 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-ink-faint">
                            {new Date(c.passedAt).toLocaleDateString("en-IN", {
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                        </div>
                        {c.studentAddress && (
                          <button
                            type="button"
                            onClick={() =>
                              setOutreachTarget({
                                address: c.studentAddress!,
                                label: c.studentInitials || "this candidate",
                                context: c.curriculumTitle,
                              })
                            }
                            className="rounded-full bg-ink px-3 py-1.5 font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-paper transition-colors hover:bg-ink/85"
                          >
                            reach out
                          </button>
                        )}
                        <Link
                          href={`/verify/${c.txHash}`}
                          className="rounded-full border border-rule bg-paper px-3 py-1.5 font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-ink-soft transition-colors hover:border-ink/40 hover:text-ink"
                        >
                          verify →
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
      </div>

      <ReachOutModal
        open={outreachTarget !== null}
        onClose={() => setOutreachTarget(null)}
        recipientAddress={outreachTarget?.address ?? ""}
        recipientLabel={outreachTarget?.label ?? ""}
        contextHint={outreachTarget?.context}
      />
    </div>
  )
}

function FilterBlock({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="eyebrow eyebrow-tick mb-3 text-[0.625rem]">{label}</div>
      {children}
    </div>
  )
}

function PillButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-sm border px-2.5 py-1.5 text-[0.75rem] font-medium transition-colors ${
        active
          ? "border-ink bg-ink text-paper"
          : "border-rule bg-paper text-ink-soft hover:border-ink/30 hover:text-ink"
      }`}
    >
      {children}
    </button>
  )
}
