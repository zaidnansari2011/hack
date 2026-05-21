"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import type { Leaderboard } from "@pol/shared"

import { ApiClientError, apiFetch } from "@/lib/api"
import { useAuth } from "@/lib/use-auth"
import { SponsorRail } from "@/components/sponsor/sponsor-rail"
import { StudentSubNav } from "@/components/student/student-subnav"
import { cn } from "@/lib/utils"

type Tab = "students" | "sponsors"

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [data, setData] = useState<Leaderboard | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>("students")

  useEffect(() => {
    apiFetch<Leaderboard>("/leaderboard", { token: null })
      .then(setData)
      .catch((err) =>
        setError(
          err instanceof ApiClientError ? err.message : "Could not load leaderboard",
        ),
      )
  }, [])

  const showSponsorRail = user?.role === "sponsor"
  const showStudentNav = user?.role === "student"

  return (
    <>
      {showStudentNav && <StudentSubNav />}
      <div
        className={
          showSponsorRail
            ? "relative isolate mx-auto grid w-[min(1240px,94vw)] gap-10 py-12 lg:grid-cols-[220px_1fr] lg:gap-16"
            : "mx-auto w-[min(1180px,94vw)] py-10"
        }
      >
      {showSponsorRail && <SponsorRail />}
      <div>
        <header className="max-w-2xl">
          <span className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-teal">
            Leaderboard
          </span>
          <h1 className="mt-4 font-display text-[2.5rem] font-medium leading-[1.1] tracking-tight text-ink">
            The people doing the work.
          </h1>
          <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-muted">
            Every rank here is backed by a soulbound credential on Base
            Sepolia. Students climb by passing quizzes; companies climb
            by funding completions that pay out in real INR.
          </p>
        </header>

        {data && (
          <div className="mt-8 grid gap-px overflow-hidden rounded-md border border-rule bg-rule sm:grid-cols-3">
            <Totals
              label="Verified completions"
              value={data.totals.verifiedCompletions.toLocaleString("en-IN")}
              hint="Across all curricula"
            />
            <Totals
              label="Paid out"
              value={`₹${data.totals.paidOutInr.toLocaleString("en-IN")}`}
              hint="Direct to UPI accounts"
            />
            <Totals
              label="Sponsors funding"
              value={data.totals.activeSponsors.toLocaleString("en-IN")}
              hint="Companies on the board"
            />
          </div>
        )}

        <div className="mt-10 flex items-end gap-6 border-b border-rule">
          <TabButton active={tab === "students"} onClick={() => setTab("students")}>
            Students
          </TabButton>
          <TabButton active={tab === "sponsors"} onClick={() => setTab("sponsors")}>
            Companies
          </TabButton>
        </div>

        {error && (
          <div className="mt-6 rounded-md border border-terracotta/30 bg-terracotta/5 p-4 text-[0.8125rem] text-terracotta">
            {error}
          </div>
        )}

        {!error && !data && <SkeletonRows />}

        {data && tab === "students" && (
          <StudentsTable rows={data.students} />
        )}
        {data && tab === "sponsors" && (
          <SponsorsTable rows={data.sponsors} />
        )}
      </div>
      </div>
    </>
  )
}

function TabButton({
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
      className={cn(
        "border-b-2 pb-3 text-[0.9375rem] font-medium transition-colors",
        active
          ? "border-ink text-ink"
          : "border-transparent text-ink-muted hover:text-ink",
      )}
    >
      {children}
    </button>
  )
}

function Totals({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="bg-surface p-5">
      <div className="font-mono text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-ink-faint">
        {label}
      </div>
      <div className="tabular mt-2 font-display text-[1.75rem] font-medium leading-none text-ink">
        {value}
      </div>
      <div className="mt-2 text-[0.75rem] text-ink-muted">{hint}</div>
    </div>
  )
}

function RankBadge({ rank }: { rank: number }) {
  const cls =
    rank === 1
      ? "bg-amber text-paper"
      : rank === 2
        ? "bg-ink-soft text-paper"
        : rank === 3
          ? "bg-terracotta text-paper"
          : "border border-rule bg-paper text-ink-faint"
  return (
    <span
      className={cn(
        "tabular grid h-7 w-7 shrink-0 place-items-center rounded-full font-mono text-[0.6875rem] font-semibold",
        cls,
      )}
    >
      {rank}
    </span>
  )
}

function StudentsTable({ rows }: { rows: Leaderboard["students"] }) {
  if (rows.length === 0) {
    return (
      <Empty
        title="No completions yet"
        body="Once students start passing quizzes, the leaderboard will fill in."
      />
    )
  }
  return (
    <div className="mt-6 overflow-hidden rounded-md border border-rule bg-surface">
      <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-x-5 border-b border-rule px-5 py-3 font-mono text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-ink-faint">
        <span>#</span>
        <span>Student · Top curriculum</span>
        <span className="text-right">Completions</span>
        <span className="text-right">Avg score</span>
        <span className="text-right">Earned</span>
      </div>
      <ul className="divide-y divide-rule">
        {rows.map((s) => {
          const studentHref = s.address ? `/credentials/${s.address}` : null
          return (
            <li
              key={`${s.rank}-${s.initials}-${s.address ?? ""}`}
              className={cn(
                "grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-x-5 px-5 py-4",
                s.rank <= 3 && "bg-amber/[0.03]",
              )}
            >
              <RankBadge rank={s.rank} />
              <div className="flex min-w-0 items-center gap-4">
                {studentHref ? (
                  <Link
                    href={studentHref}
                    className="grid h-9 w-9 place-items-center rounded-full bg-ink text-[0.75rem] font-semibold text-paper transition-transform hover:scale-105"
                  >
                    {s.initials}
                  </Link>
                ) : (
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-[0.75rem] font-semibold text-paper">
                    {s.initials}
                  </span>
                )}
                <div className="min-w-0">
                  <div className="truncate text-[0.9375rem] font-medium text-ink">
                    {studentHref ? (
                      <Link href={studentHref} className="hover:underline">
                        {s.initials}
                      </Link>
                    ) : (
                      s.initials
                    )}
                  </div>
                  <div className="mt-0.5 truncate text-[0.75rem] text-ink-faint">
                    {s.topCurriculum}
                  </div>
                </div>
              </div>
              <div className="tabular text-right font-mono text-[0.875rem] text-ink">
                {s.completions}
              </div>
              <div className="tabular text-right font-display text-[1rem] font-medium text-teal">
                {s.avgScorePct}%
              </div>
              <div className="tabular text-right font-mono text-[0.8125rem] text-ink-soft">
                ₹{s.totalEarnedInr.toLocaleString("en-IN")}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function SponsorsTable({ rows }: { rows: Leaderboard["sponsors"] }) {
  if (rows.length === 0) {
    return (
      <Empty
        title="No funded completions yet"
        body="Once sponsors release escrow on passed quizzes, they'll show up here."
      />
    )
  }
  return (
    <div className="mt-6 overflow-hidden rounded-md border border-rule bg-surface">
      <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-x-5 border-b border-rule px-5 py-3 font-mono text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-ink-faint">
        <span>#</span>
        <span>Company · Most-funded curriculum</span>
        <span className="text-right">Bounties</span>
        <span className="text-right">Students</span>
        <span className="text-right">Released</span>
      </div>
      <ul className="divide-y divide-rule">
        {rows.map((s) => (
          <li
            key={`${s.rank}-${s.name}`}
            className={cn(
              "grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-x-5 px-5 py-4",
              s.rank <= 3 && "bg-amber/[0.03]",
            )}
          >
            <RankBadge rank={s.rank} />
            <div className="min-w-0">
              <div className="truncate text-[0.9375rem] font-medium text-ink">
                {s.name}
              </div>
              <div className="mt-0.5 truncate text-[0.75rem] text-ink-faint">
                {s.topCurriculum}
              </div>
            </div>
            <div className="tabular text-right font-mono text-[0.875rem] text-ink">
              {s.bounties}
            </div>
            <div className="tabular text-right font-display text-[1rem] font-medium text-teal">
              {s.studentsFunded}
            </div>
            <div className="tabular text-right font-mono text-[0.8125rem] text-ink-soft">
              ₹{s.totalReleasedInr.toLocaleString("en-IN")}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SkeletonRows() {
  return (
    <ul className="mt-6 divide-y divide-rule overflow-hidden rounded-md border border-rule bg-surface">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="h-7 w-7 animate-pulse rounded-full bg-rule/50" />
            <div className="space-y-2">
              <div className="h-3 w-40 animate-pulse rounded bg-rule/50" />
              <div className="h-2.5 w-28 animate-pulse rounded bg-rule/40" />
            </div>
          </div>
          <div className="h-3 w-16 animate-pulse rounded bg-rule/40" />
        </li>
      ))}
    </ul>
  )
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-8 rounded-md border border-dashed border-rule bg-surface p-10 text-center">
      <div className="font-mono text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-ink-faint">
        {title}
      </div>
      <p className="mt-3 text-[0.875rem] text-ink-muted">{body}</p>
    </div>
  )
}
