"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import type { EnrollmentDetail, Payout } from "@pol/shared"

import { ApiClientError, apiFetch } from "@/lib/api"
import { Badge } from "@/components/ui/badge"

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready"
      enrollments: EnrollmentDetail[]
      payouts: Payout[]
    }

export default function HistoryPage() {
  const [state, setState] = useState<State>({ status: "loading" })

  useEffect(() => {
    Promise.all([
      apiFetch<{ enrollments: EnrollmentDetail[] }>("/enrollments/mine"),
      apiFetch<{ payouts: Payout[] }>("/payouts/mine"),
    ])
      .then(([e, p]) =>
        setState({
          status: "ready",
          enrollments: e.enrollments,
          payouts: p.payouts,
        }),
      )
      .catch((err) =>
        setState({
          status: "error",
          message:
            err instanceof ApiClientError
              ? err.message
              : "Could not load your history",
        }),
      )
  }, [])

  if (state.status === "loading") {
    return (
      <div className="space-y-6">
        <div className="h-12 w-72 animate-pulse rounded-md bg-rule" />
        <div className="space-y-px overflow-hidden rounded-md border border-rule bg-rule">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse bg-surface" />
          ))}
        </div>
      </div>
    )
  }

  if (state.status === "error") {
    return (
      <div className="border-l-2 border-terracotta bg-terracotta/5 px-4 py-2.5 text-[0.8125rem] text-terracotta">
        {state.message}
      </div>
    )
  }

  const { enrollments, payouts } = state
  const payoutByEnrollment = new Map(payouts.map((p) => [p.enrollmentId, p]))

  const completed = enrollments.filter((e) => e.status === "completed")
  const inFlight = enrollments.filter((e) => e.status === "active")

  const totalEarned = payouts
    .filter((p) => p.status === "confirmed" || p.status === "sent")
    .reduce((sum, p) => sum + p.amountInr, 0)

  return (
    <div className="space-y-12">
      <header className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-end lg:gap-16">
        <div>
          <div className="eyebrow eyebrow-tick">Learning history</div>
          <h1 className="display-lg mt-3 max-w-[20ch] text-balance text-ink">
            Everything you've{" "}
            <span className="display-italic text-teal">learned and earned.</span>
          </h1>
          <p className="mt-3 max-w-xl text-[0.9375rem] leading-relaxed text-ink-muted">
            One row per bounty you've enrolled in. Completed ones move here so
            the marketplace stays focused on what's still earnable. Each row
            links to your on-chain proof and INR receipt.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-rule bg-rule">
          <Stat label="Completed" value={completed.length.toString()} accent="teal" />
          <Stat label="In flight" value={inFlight.length.toString()} />
          <Stat
            label="Earned"
            value={`₹${totalEarned.toLocaleString("en-IN")}`}
          />
        </div>
      </header>

      {completed.length === 0 && inFlight.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {completed.length > 0 && (
            <Section title="Completed" count={completed.length}>
              <div className="space-y-px overflow-hidden rounded-md border border-rule bg-rule">
                {completed.map((e) => (
                  <CompletedRow
                    key={e.id}
                    enrollment={e}
                    payout={payoutByEnrollment.get(e.id) ?? null}
                  />
                ))}
              </div>
            </Section>
          )}
          {inFlight.length > 0 && (
            <Section title="In progress" count={inFlight.length}>
              <div className="space-y-px overflow-hidden rounded-md border border-rule bg-rule">
                {inFlight.map((e) => (
                  <InFlightRow key={e.id} enrollment={e} />
                ))}
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: "teal"
}) {
  return (
    <div className="bg-surface p-5">
      <div className="eyebrow text-[0.625rem]">{label}</div>
      <div
        className={
          "tabular mt-3 font-display text-[1.625rem] font-medium " +
          (accent === "teal" ? "text-teal" : "text-ink")
        }
      >
        {value}
      </div>
    </div>
  )
}

function Section({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between border-b border-rule-soft pb-2">
        <h2 className="font-display text-[1.125rem] font-medium text-ink">
          {title}
        </h2>
        <span className="tabular font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-faint">
          {count} {count === 1 ? "row" : "rows"}
        </span>
      </div>
      {children}
    </section>
  )
}

function CompletedRow({
  enrollment,
  payout,
}: {
  enrollment: EnrollmentDetail
  payout: Payout | null
}) {
  const completedAt = enrollment.completedAt
    ? new Date(enrollment.completedAt)
    : null
  return (
    <article className="grid items-center gap-4 bg-surface px-6 py-5 md:grid-cols-[1.6fr_1fr_auto]">
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-forest">
            Completed
          </span>
          {completedAt && (
            <span className="tabular font-mono text-[0.6875rem] text-ink-faint">
              · {completedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          )}
        </div>
        <h3 className="mt-1 font-display text-[1.0625rem] font-medium leading-snug text-ink">
          {enrollment.bounty.title}
        </h3>
        <div className="mt-0.5 text-[0.8125rem] text-ink-muted">
          {enrollment.curriculum.title} · {enrollment.curriculum.syllabus.length || enrollment.curriculum.topics.length} modules
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-ink-faint">
          Reward
        </span>
        <div className="tabular font-display text-[1.375rem] font-medium text-teal">
          ₹{enrollment.bounty.rewardInr.toLocaleString("en-IN")}
        </div>
        {payout && (
          <Badge variant={statusVariant(payout.status)}>{payout.status}</Badge>
        )}
      </div>

      <div className="flex flex-col gap-1.5 text-right text-[0.6875rem] uppercase tracking-[0.18em] text-ink-faint">
        {enrollment.bounty.escrowTxHash ? (
          <a
            href={`https://sepolia.basescan.org/tx/${enrollment.bounty.escrowTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="link-underline font-mono normal-case tracking-normal text-ink-soft"
          >
            BaseScan ↗
          </a>
        ) : (
          <span className="font-mono">no on-chain ref</span>
        )}
        {payout?.razorpayPayoutId ? (
          <span className="font-mono normal-case tracking-normal text-ink-faint">
            ₹ {payout.razorpayPayoutId.slice(0, 14)}…
          </span>
        ) : null}
      </div>
    </article>
  )
}

function InFlightRow({ enrollment }: { enrollment: EnrollmentDetail }) {
  const progress = Math.min(100, Math.max(0, enrollment.progressPct))
  return (
    <article className="grid items-center gap-4 bg-surface px-6 py-5 md:grid-cols-[1.6fr_1fr_auto]">
      <div className="min-w-0">
        <span className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-amber">
          In progress
        </span>
        <h3 className="mt-1 font-display text-[1.0625rem] font-medium leading-snug text-ink">
          {enrollment.bounty.title}
        </h3>
        <div className="mt-0.5 text-[0.8125rem] text-ink-muted">
          {enrollment.curriculum.title} · started{" "}
          {new Date(enrollment.startedAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          })}
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between text-[0.625rem] uppercase tracking-[0.18em] text-ink-faint">
          <span>Progress</span>
          <span className="tabular text-ink-soft">{progress}%</span>
        </div>
        <div className="mt-1.5 h-px overflow-hidden bg-rule">
          <div
            className="h-full bg-teal transition-[width] duration-700 ease-out-quart"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <Link
        href={`/learn/${enrollment.bountyId}`}
        className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[0.8125rem] font-medium text-paper transition-colors hover:bg-ink/90"
      >
        Continue →
      </Link>
    </article>
  )
}

function EmptyState() {
  return (
    <div className="grid place-items-center rounded-md border border-dashed border-rule bg-surface px-6 py-14 text-center">
      <span className="font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-ink-faint">
        Nothing here yet
      </span>
      <h3 className="display-md mt-3 text-ink">No history yet.</h3>
      <p className="mt-2 max-w-md text-[0.9375rem] text-ink-muted">
        Pick a bounty, learn the curriculum, pass the quiz — your first
        completion (and ₹ payout) will show up here.
      </p>
      <Link
        href="/learn"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-2.5 text-[0.8125rem] font-medium text-paper hover:bg-ink/90"
      >
        Browse bounties →
      </Link>
    </div>
  )
}

function statusVariant(
  status: Payout["status"],
):
  | "neutral"
  | "amber"
  | "teal"
  | "forest"
  | "terracotta"
  | "ink" {
  switch (status) {
    case "queued":
      return "neutral"
    case "processing":
      return "amber"
    case "sent":
      return "teal"
    case "confirmed":
      return "forest"
    case "failed":
      return "terracotta"
  }
}
