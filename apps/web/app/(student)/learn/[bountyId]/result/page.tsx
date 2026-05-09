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
  const [remediation, setRemediation] = useState<{
    weakTopics: string[]
    microLesson: string
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requested, setRequested] = useState(false)

  useEffect(() => {
    if (requested || session.status !== "failed") return
    setRequested(true)
    setLoading(true)
    apiFetch<{ weakTopics: string[]; microLesson: string }>(
      "/tutor/remediate",
      {
        method: "POST",
        json: { sessionId: session.id },
      },
    )
      .then((data) =>
        setRemediation({
          weakTopics: data.weakTopics,
          microLesson: data.microLesson,
        }),
      )
      .catch((err) =>
        setError(
          err instanceof ApiClientError
            ? err.message
            : "Could not generate remediation",
        ),
      )
      .finally(() => setLoading(false))
  }, [requested, session.id, session.status])

  return (
    <div className="space-y-6">
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
          Almost there.{" "}
          <span className="display-italic text-teal">Patch the gaps.</span>
        </h1>
        <p className="mt-4 max-w-xl text-[0.9375rem] leading-relaxed text-ink-muted">
          The tutor analyzed which questions you missed and is writing a
          targeted micro-lesson for just those topics. Read it, retake the
          quiz with a fresh question set, get paid.
        </p>
      </div>

      <div className="rounded-md border border-rule bg-surface p-8 lg:p-10">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-teal">
            Adaptive remediation
          </span>
          {loading && (
            <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-ink-faint">
              analyzing…
            </span>
          )}
        </div>

        {error && (
          <div className="mt-4 text-[0.8125rem] text-terracotta">{error}</div>
        )}

        {!loading && remediation && (
          <>
            {remediation.weakTopics.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {remediation.weakTopics.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-rule bg-paper px-3 py-1 font-mono text-[0.6875rem] text-ink-soft"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
            <div className="prose prose-sm mt-5 max-w-2xl whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-ink-soft">
              {remediation.microLesson}
            </div>
          </>
        )}

        {loading && (
          <div className="mt-5 space-y-2">
            <div className="h-3 w-2/3 animate-pulse rounded bg-rule/60" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-rule/60" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-rule/60" />
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-4 pt-2">
        <Link
          href={`/learn/${bountyId}/quiz`}
          className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-[0.875rem] font-medium text-paper transition-colors hover:bg-ink/90"
        >
          Retry quiz →
        </Link>
        <Link
          href={`/learn/${bountyId}`}
          className="inline-flex items-center gap-2 rounded-full border border-rule bg-surface px-6 py-3 text-[0.875rem] font-medium text-ink-soft transition-colors hover:border-ink/30 hover:text-ink"
        >
          Back to tutor
        </Link>
      </div>
    </div>
  )
}
