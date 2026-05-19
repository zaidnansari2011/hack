"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import type { EnrollmentDetail, QuizSession } from "@pol/shared"

import { ApiClientError, apiFetch } from "@/lib/api"
import { QuizRunner } from "@/components/student/quiz-runner"

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "locked"; enrollment: EnrollmentDetail; done: number; total: number }
  | { status: "ready"; session: QuizSession; enrollment: EnrollmentDetail }

export default function QuizPage() {
  const params = useParams<{ bountyId: string }>()
  const bountyId = params.bountyId
  const [state, setState] = useState<State>({ status: "loading" })

  useEffect(() => {
    let cancelled = false

    async function boot() {
      try {
        const enrollmentRes = await apiFetch<{
          enrollment: EnrollmentDetail | null
        }>(`/enrollments/by-bounty/${bountyId}`)
        if (!enrollmentRes.enrollment) {
          throw new Error("You need to enroll in this bounty first")
        }
        const enrollment = enrollmentRes.enrollment

        // Gate: the final exam stays locked until the student has proven
        // mastery on every module. This is the "prove you know enough" rule.
        const total = enrollment.curriculum.syllabus.length
        const progress = await apiFetch<{ coveredModuleIndexes: number[] }>(
          `/tutor/progress/${enrollment.id}`,
        ).catch(() => ({ coveredModuleIndexes: [] as number[] }))
        const done = progress.coveredModuleIndexes.filter(
          (i) => i >= 0 && i < total,
        ).length

        if (total > 0 && done < total) {
          if (!cancelled) {
            setState({ status: "locked", enrollment, done, total })
          }
          return
        }

        const sessionRes = await apiFetch<{ session: QuizSession }>(
          "/quiz/start",
          {
            method: "POST",
            json: { enrollmentId: enrollment.id },
          },
        )

        if (!cancelled) {
          setState({
            status: "ready",
            session: sessionRes.session,
            enrollment,
          })
        }
      } catch (err) {
        if (cancelled) return
        setState({
          status: "error",
          message:
            err instanceof ApiClientError
              ? err.message
              : err instanceof Error
                ? err.message
                : "Could not start the quiz",
        })
      }
    }

    boot()
    return () => {
      cancelled = true
    }
  }, [bountyId])

  if (state.status === "loading") {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-10">
        <div className="flex items-center justify-between">
          <div className="h-3 w-24 animate-pulse rounded-full bg-rule/60" />
          <div className="h-3 w-16 animate-pulse rounded-full bg-rule/60" />
        </div>
        <div className="space-y-4 rounded-2xl border border-rule bg-surface p-8">
          <div className="h-2 w-full animate-pulse rounded-full bg-rule/50" />
          <div className="space-y-2">
            <div className="h-5 w-3/4 animate-pulse rounded bg-rule/50" />
            <div className="h-5 w-2/3 animate-pulse rounded bg-rule/40" />
          </div>
          <div className="space-y-2 pt-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-xl border border-rule bg-paper-deep/40"
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (state.status === "error") {
    return (
      <div className="rounded-2xl border border-terracotta/30 bg-terracotta/5 p-6">
        <h2 className="font-display text-[1rem] font-medium text-terracotta">
          Couldn't start the quiz
        </h2>
        <p className="mt-1 text-[0.875rem] leading-relaxed text-ink-muted">{state.message}</p>
        <Link
          href={`/learn/${bountyId}`}
          className="mt-3 inline-flex items-center gap-1.5 text-[0.875rem] text-ink-faint transition-colors hover:text-ink-soft"
        >
          ← Back to tutor
        </Link>
      </div>
    )
  }

  if (state.status === "locked") {
    const pct = Math.round((state.done / state.total) * 100)
    return (
      <div className="mx-auto max-w-xl space-y-6 py-10">
        <Link
          href={`/learn/${bountyId}`}
          className="inline-flex items-center gap-1.5 text-[0.875rem] text-ink-faint transition-colors hover:text-ink-soft"
        >
          ← Back to tutor
        </Link>
        <div className="rounded-2xl border border-rule bg-surface p-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-rule text-ink-faint">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
              <rect x="3" y="7" width="10" height="7" rx="1.5" />
              <path d="M5 7V5a3 3 0 0 1 6 0v2" />
            </svg>
          </div>
          <h1 className="display-md mt-5 text-ink">The final exam is locked.</h1>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-muted">
            Prove you know the material first. Work through every module with
            the tutor and pass each mastery check. The exam unlocks once all{" "}
            {state.total} modules are complete.
          </p>
          <div className="mt-6">
            <div className="mb-2 flex items-baseline justify-between text-[0.8125rem]">
              <span className="text-ink-soft">Modules mastered</span>
              <span className="tabular font-medium text-ink">
                {state.done}/{state.total}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-rule/50">
              <div
                className="h-full rounded-full bg-forest transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          <Link
            href={`/learn/${bountyId}`}
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-2.5 text-[0.875rem] font-medium text-paper transition-colors hover:bg-ink/85"
          >
            Keep learning →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <header className="flex items-baseline justify-between gap-4 border-b border-rule pb-4">
        <Link
          href={`/learn/${bountyId}`}
          className="link-underline text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-ink-muted hover:text-ink"
        >
          ← Tutor
        </Link>
        <div className="font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-ink-faint">
          {state.enrollment.curriculum.title} ·{" "}
          <span className="text-ink">final exam</span>
        </div>
      </header>

      <QuizRunner bountyId={bountyId} session={state.session} />
    </div>
  )
}
