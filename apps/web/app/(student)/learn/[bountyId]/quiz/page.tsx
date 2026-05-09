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

        const sessionRes = await apiFetch<{ session: QuizSession }>(
          "/quiz/start",
          {
            method: "POST",
            json: { enrollmentId: enrollmentRes.enrollment.id },
          },
        )

        if (!cancelled) {
          setState({
            status: "ready",
            session: sessionRes.session,
            enrollment: enrollmentRes.enrollment,
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
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-[500px] animate-pulse rounded-2xl border border-slate-200/70 bg-white/60" />
      </div>
    )
  }

  if (state.status === "error") {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <h2 className="text-base font-semibold text-red-900">
          Couldn't start the quiz
        </h2>
        <p className="mt-1 text-sm text-red-700">{state.message}</p>
        <Link
          href={`/learn/${bountyId}`}
          className="mt-3 inline-block text-sm font-semibold text-red-900 underline-offset-4 hover:underline"
        >
          ← Back to tutor
        </Link>
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
          <span className="text-ink">verification</span>
        </div>
      </header>

      <QuizRunner bountyId={bountyId} session={state.session} />
    </div>
  )
}
