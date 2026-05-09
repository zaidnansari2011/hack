"use client"

import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import type { QuizSession } from "@pol/shared"

import { ApiClientError, apiFetch } from "@/lib/api"
import { PayoutCelebration } from "@/components/student/payout-celebration"

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; session: QuizSession }

export default function ResultPage() {
  return (
    <Suspense fallback={null}>
      <ResultInner />
    </Suspense>
  )
}

function ResultInner() {
  const params = useParams<{ bountyId: string }>()
  const searchParams = useSearchParams()
  const bountyId = params.bountyId
  const sessionId = searchParams.get("sessionId")
  const payoutId = searchParams.get("payout") || null
  const proofId = searchParams.get("proof") || null

  const [state, setState] = useState<State>({ status: "loading" })

  useEffect(() => {
    if (!sessionId) {
      setState({ status: "error", message: "Missing session id" })
      return
    }
    apiFetch<{ session: QuizSession }>(`/quiz/${sessionId}`)
      .then(({ session }) => setState({ status: "ready", session }))
      .catch((err) =>
        setState({
          status: "error",
          message:
            err instanceof ApiClientError
              ? err.message
              : "Could not load result",
        }),
      )
  }, [sessionId])

  if (state.status === "loading") {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-[400px] animate-pulse rounded-2xl border border-slate-200/70 bg-white/60" />
      </div>
    )
  }

  if (state.status === "error") {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <h2 className="text-base font-semibold text-red-900">
          Couldn't load your result
        </h2>
        <p className="mt-1 text-sm text-red-700">{state.message}</p>
      </div>
    )
  }

  const { session } = state

  if (session.status !== "passed") {
    return <FailurePanel session={session} bountyId={bountyId} />
  }

  return (
    <PayoutCelebration
      session={session}
      bountyId={bountyId}
      payoutId={payoutId}
      proofId={proofId}
    />
  )
}

function FailurePanel({
  session,
  bountyId,
}: {
  session: QuizSession
  bountyId: string
}) {
  return (
    <div className="rounded-md border border-rule bg-surface p-10 lg:p-14">
      <div className="flex items-center gap-3">
        <span className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.28em] text-terracotta">
          Not yet
        </span>
        <span className="h-px w-10 bg-terracotta/40" />
        <span className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-faint">
          {session.scorePct ?? 0}% · need 60%
        </span>
      </div>
      <h1 className="display-lg mt-6 max-w-[20ch] text-balance text-ink">
        Almost there. <span className="display-italic text-teal">Run it again.</span>
      </h1>
      <p className="mt-4 max-w-xl text-[0.9375rem] leading-relaxed text-ink-muted">
        Spend a little more time with the tutor — it cites the exact sections
        that map to each topic — then take the quiz again with a fresh
        question set and a fresh shuffle.
      </p>
      <div className="mt-7 flex flex-wrap gap-4">
        <Link
          href={`/learn/${bountyId}`}
          className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-[0.875rem] font-medium text-paper transition-colors hover:bg-ink/90"
        >
          Back to tutor →
        </Link>
        <Link
          href={`/learn/${bountyId}/quiz`}
          className="inline-flex items-center gap-2 rounded-full border border-rule bg-surface px-6 py-3 text-[0.875rem] font-medium text-ink-soft transition-colors hover:border-ink/30 hover:text-ink"
        >
          Retry quiz
        </Link>
      </div>
    </div>
  )
}
