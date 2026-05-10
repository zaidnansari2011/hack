"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import type { ChatMessage, EnrollmentDetail } from "@pol/shared"

import { ApiClientError, apiFetch } from "@/lib/api"
import { TutorChat } from "@/components/student/tutor-chat"

type SessionSummary = { sessionIndex: number; messageCount: number; startedAt: string }

type BootState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready"
      enrollment: EnrollmentDetail
      messages: ChatMessage[]
      sessions: SessionSummary[]
      initialSessionIndex: number
    }

export default function BountyLearnPage() {
  const params = useParams<{ bountyId: string }>()
  const bountyId = params.bountyId
  const [state, setState] = useState<BootState>({ status: "loading" })

  useEffect(() => {
    let cancelled = false

    async function boot() {
      try {
        const existing = await apiFetch<{ enrollment: EnrollmentDetail | null }>(
          `/enrollments/by-bounty/${bountyId}`,
        )

        let enrollment: EnrollmentDetail | null = existing.enrollment

        if (!enrollment) {
          const created = await apiFetch<{ enrollment: EnrollmentDetail }>(
            "/enrollments",
            { method: "POST", json: { bountyId } },
          )
          const detail = await apiFetch<{ enrollment: EnrollmentDetail }>(
            `/enrollments/${created.enrollment.id}`,
          )
          enrollment = detail.enrollment
        }

        // Try to load session list. Gracefully fall back to session 0 if the
        // endpoint isn't available yet (e.g. migration hasn't run).
        let sessions: SessionSummary[] = []
        let latestSessionIndex = 0
        try {
          const sessionRes = await apiFetch<{ sessions: SessionSummary[] }>(
            `/tutor/sessions/${enrollment.id}`,
          )
          sessions = sessionRes.sessions
          if (sessions.length > 0) {
            latestSessionIndex = Math.max(...sessions.map((s) => s.sessionIndex))
          }
        } catch {
          // Sessions not available — treat everything as session 0.
        }

        const historyRes = await apiFetch<{ messages: ChatMessage[] }>(
          `/tutor/history/${enrollment.id}?session=${latestSessionIndex}`,
        )

        if (!cancelled) {
          setState({
            status: "ready",
            enrollment,
            messages: historyRes.messages,
            sessions,
            initialSessionIndex: latestSessionIndex,
          })
        }
      } catch (err) {
        if (cancelled) return
        setState({
          status: "error",
          message:
            err instanceof ApiClientError
              ? err.message
              : "Could not start this curriculum",
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
      <div className="space-y-3">
        <div className="h-4 w-32 animate-pulse rounded-full bg-rule/40" />
        <div className="h-[calc(100vh-130px)] animate-pulse rounded-xl border border-rule bg-surface" />
      </div>
    )
  }

  if (state.status === "error") {
    return (
      <div className="rounded-xl border border-rule bg-surface p-7">
        <h2 className="font-display text-[1rem] font-medium text-terracotta">
          Couldn't open this curriculum
        </h2>
        <p className="mt-2 text-[0.875rem] leading-relaxed text-ink-muted">{state.message}</p>
        <Link
          href="/learn"
          className="mt-4 inline-flex items-center gap-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-faint transition-colors hover:text-ink-soft"
        >
          ← Back to bounties
        </Link>
      </div>
    )
  }

  return (
    // TutorChat uses fixed inset-0 z-50 — this wrapper is just a mount point.
    <TutorChat
      enrollment={state.enrollment}
      initialMessages={state.messages}
      initialSessions={state.sessions}
      initialSessionIndex={state.initialSessionIndex}
    />
  )
}
