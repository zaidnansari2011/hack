"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import type { ChatMessage, EnrollmentDetail } from "@pol/shared"

import { ApiClientError, apiFetch } from "@/lib/api"
import { TutorChat } from "@/components/student/tutor-chat"

type BootState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready"
      enrollment: EnrollmentDetail
      messages: ChatMessage[]
    }

export default function BountyLearnPage() {
  const params = useParams<{ bountyId: string }>()
  const bountyId = params.bountyId
  const [state, setState] = useState<BootState>({ status: "loading" })

  useEffect(() => {
    let cancelled = false

    async function boot() {
      try {
        // 1. Try to find an existing enrollment for this bounty.
        const existing = await apiFetch<{ enrollment: EnrollmentDetail | null }>(
          `/enrollments/by-bounty/${bountyId}`,
        )

        let enrollment: EnrollmentDetail | null = existing.enrollment

        // 2. If none, create one. (POST /enrollments is idempotent on the
        //    backend.)
        if (!enrollment) {
          const created = await apiFetch<{ enrollment: EnrollmentDetail }>(
            "/enrollments",
            { method: "POST", json: { bountyId } },
          )
          // The created response gives us the enrollment without bounty/curriculum
          // joins; refetch the detail view to get the full shape.
          const detail = await apiFetch<{ enrollment: EnrollmentDetail }>(
            `/enrollments/${created.enrollment.id}`,
          )
          enrollment = detail.enrollment
        }

        // 3. Load chat history.
        const history = await apiFetch<{ messages: ChatMessage[] }>(
          `/tutor/history/${enrollment.id}`,
        )

        if (!cancelled) {
          setState({
            status: "ready",
            enrollment,
            messages: history.messages,
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
          Couldn't open this curriculum
        </h2>
        <p className="mt-1 text-sm text-red-700">{state.message}</p>
        <Link
          href="/learn"
          className="mt-3 inline-block text-sm font-semibold text-red-900 underline-offset-4 hover:underline"
        >
          ← Back to bounties
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link
          href="/learn"
          className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 hover:text-slate-700"
        >
          ← All bounties
        </Link>
      </div>
      <TutorChat
        enrollment={state.enrollment}
        initialMessages={state.messages}
      />
    </div>
  )
}
