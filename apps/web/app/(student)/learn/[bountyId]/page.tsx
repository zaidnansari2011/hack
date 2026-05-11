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

type Launch = { view: "overview" } | { view: "chat"; moduleIndex: number | null }

export default function BountyLearnPage() {
  const params = useParams<{ bountyId: string }>()
  const bountyId = params.bountyId
  const [state, setState] = useState<BootState>({ status: "loading" })
  const [launch, setLaunch] = useState<Launch>({ view: "overview" })

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

  if (launch.view === "overview") {
    return (
      <CourseOverview
        enrollment={state.enrollment}
        hasHistory={state.messages.length > 0}
        onPickModule={(idx) => setLaunch({ view: "chat", moduleIndex: idx })}
        onResume={() => setLaunch({ view: "chat", moduleIndex: null })}
      />
    )
  }

  return (
    <TutorChat
      enrollment={state.enrollment}
      initialMessages={state.messages}
      initialSessions={state.sessions}
      initialSessionIndex={state.initialSessionIndex}
      autoTeachModuleIndex={launch.moduleIndex}
    />
  )
}

function CourseOverview({
  enrollment,
  hasHistory,
  onPickModule,
  onResume,
}: {
  enrollment: EnrollmentDetail
  hasHistory: boolean
  onPickModule: (i: number) => void
  onResume: () => void
}) {
  const { curriculum, bounty, progressPct } = enrollment
  const totalMin = curriculum.syllabus.reduce((s, m) => s + m.durationMinutes, 0)

  return (
    <div className="mx-auto max-w-3xl space-y-10 py-8">
      <div>
        <Link
          href="/learn"
          className="inline-flex items-center gap-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-faint transition-colors hover:text-ink-soft"
        >
          ← Back to bounties
        </Link>
        <div className="mt-6">
          <span className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-ink-faint">
            Course overview
          </span>
          <h1 className="display-md display-italic mt-2 text-balance text-teal">{curriculum.title}</h1>
          <p className="mt-3 max-w-xl text-[0.9375rem] leading-relaxed text-ink-muted">
            {curriculum.summary}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {totalMin > 0 && (
              <span className="inline-flex items-center gap-2 rounded-full border border-rule bg-surface-soft px-3 py-1 font-mono text-[0.6875rem] text-ink-faint">
                ~{totalMin} min total
              </span>
            )}
            <span className="inline-flex items-center gap-2 rounded-full border border-rule bg-surface-soft px-3 py-1 font-mono text-[0.6875rem] text-ink-faint">
              {curriculum.syllabus.length} modules
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-rule bg-surface-soft px-3 py-1 font-mono text-[0.6875rem] text-ink-faint">
              <span className="capitalize">{curriculum.difficulty}</span>
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-rule bg-surface-soft px-3 py-1 font-mono text-[0.6875rem] text-ink-faint">
              <span className="text-amber">₹</span>
              {bounty.rewardInr.toLocaleString("en-IN")} on pass
            </span>
            {progressPct > 0 && (
              <span className="inline-flex items-center gap-2 rounded-full border border-teal/30 bg-teal-tint/40 px-3 py-1 font-mono text-[0.6875rem] text-teal">
                {Math.round(progressPct)}% done
              </span>
            )}
          </div>
        </div>
      </div>

      {curriculum.syllabus.length > 0 && (
        <div>
          <div className="mb-3 font-mono text-[0.625rem] uppercase tracking-[0.22em] text-ink-faint">
            Pick a module to start
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {curriculum.syllabus.map((m, i) => (
              <button
                key={m.module}
                type="button"
                onClick={() => onPickModule(i)}
                className="group relative flex flex-col gap-2 overflow-hidden rounded-xl border border-rule bg-surface p-4 text-left transition-all duration-300 hover:border-teal/40 hover:shadow-sm"
              >
                <div className="absolute inset-y-0 left-0 w-0.5 rounded-r-full bg-teal opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-[0.625rem] text-ink-faint">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-mono text-[0.625rem] text-ink-faint">{m.durationMinutes}m</span>
                </div>
                <div>
                  <span className="block font-display text-[0.9375rem] font-medium leading-snug text-ink">
                    {m.module}
                  </span>
                  <span className="mt-1 line-clamp-2 block text-[0.75rem] leading-relaxed text-ink-muted">
                    {m.summary}
                  </span>
                </div>
                <span className="mt-auto font-mono text-[0.625rem] uppercase tracking-[0.18em] text-ink-faint opacity-0 transition-opacity duration-300 group-hover:text-teal group-hover:opacity-100">
                  Teach this →
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-6">
        <button
          type="button"
          onClick={onResume}
          className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2 text-[0.75rem] font-medium text-paper transition-all hover:bg-teal"
        >
          {hasHistory ? "Resume chat" : "Open tutor chat"} <span className="text-paper/60">→</span>
        </button>
        <Link
          href={`/learn/${enrollment.bountyId}/quiz`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-rule bg-surface px-4 py-2 text-[0.75rem] font-medium text-ink transition-all hover:border-teal/40 hover:text-teal"
        >
          Take quiz <span className="text-ink-faint">→</span>
        </Link>
      </div>
    </div>
  )
}
