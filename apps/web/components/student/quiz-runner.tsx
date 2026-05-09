"use client"

import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useMemo, useRef, useState } from "react"
import type { QuizResult, QuizSession } from "@pol/shared"

import { ApiClientError, apiFetch } from "@/lib/api"
import { ease } from "@/lib/motion"
import { cn } from "@/lib/utils"

type Props = {
  bountyId: string
  session: QuizSession
}

type AnswerMap = Record<string, number>

export function QuizRunner({ bountyId, session }: Props) {
  const router = useRouter()
  const [answers, setAnswers] = useState<AnswerMap>({})
  const [index, setIndex] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(
      0,
      Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000),
    ),
  )

  const fingerprintRef = useRef<Record<string, unknown>>({})

  useEffect(() => {
    if (typeof window === "undefined") return
    fingerprintRef.current = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screen: `${window.screen.width}x${window.screen.height}`,
      pixelRatio: window.devicePixelRatio,
      platform: (navigator as { platform?: string }).platform ?? "unknown",
    }
  }, [])

  useEffect(() => {
    if (secondsLeft <= 0) return
    const id = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [secondsLeft])

  const total = session.questions.length
  const current = session.questions[index]
  const allAnswered = session.questions.every((q) => answers[q.id] !== undefined)

  const timerLabel = useMemo(() => {
    const m = Math.floor(secondsLeft / 60)
      .toString()
      .padStart(2, "0")
    const s = (secondsLeft % 60).toString().padStart(2, "0")
    return `${m}:${s}`
  }, [secondsLeft])

  const expired = secondsLeft === 0

  async function submit() {
    if (submitting) return
    setError(null)
    setSubmitting(true)
    try {
      const data = await apiFetch<{ result: QuizResult }>(
        `/quiz/${session.id}/submit`,
        {
          method: "POST",
          json: {
            answers: session.questions.map((q) => ({
              questionId: q.id,
              choiceIndex: answers[q.id] ?? -1,
            })),
            fingerprint: fingerprintRef.current,
          },
        },
      )
      router.push(
        `/learn/${bountyId}/result?sessionId=${session.id}&payout=${data.result.payoutId ?? ""}&proof=${data.result.proofId ?? ""}`,
      )
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Submission failed — try again",
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (!current) {
    return (
      <div className="rounded-md border border-rule bg-surface p-8 text-center text-[0.875rem] text-ink-muted">
        No questions in this session.
      </div>
    )
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_280px]">
      <div className="space-y-6">
        <ProgressBar
          questions={session.questions}
          currentIndex={index}
          answers={answers}
        />

        <AnimatePresence mode="wait">
          <motion.article
            key={current.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.45, ease: ease.outQuart }}
            className="rounded-md border border-rule bg-surface p-9"
          >
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-ink-faint">
                Question {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
              </span>
            </div>
            <h2 className="display-md mt-4 max-w-[42ch] text-balance text-ink">
              {current.prompt}
            </h2>

            <div className="mt-7 grid gap-2">
              {current.choices.map((choice, i) => {
                const selected = answers[current.id] === i
                return (
                  <motion.button
                    key={`${current.id}-${i}`}
                    type="button"
                    whileTap={{ scale: 0.99 }}
                    onClick={() =>
                      setAnswers((prev) => ({ ...prev, [current.id]: i }))
                    }
                    disabled={expired}
                    className={cn(
                      "group flex w-full items-start gap-4 rounded-sm border p-4 text-left transition-all duration-300 ease-out-quart",
                      selected
                        ? "border-ink bg-ink/[0.04]"
                        : "border-rule bg-surface hover:border-ink/30",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border font-mono text-[0.75rem] font-semibold transition-all",
                        selected
                          ? "border-ink bg-ink text-paper"
                          : "border-rule text-ink-muted",
                      )}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="text-[0.9375rem] leading-relaxed text-ink">
                      {choice}
                    </span>
                  </motion.button>
                )
              })}
            </div>
          </motion.article>
        </AnimatePresence>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="inline-flex items-center gap-2 rounded-full border border-rule bg-surface px-5 py-2.5 text-[0.8125rem] font-medium text-ink-soft transition-colors hover:border-ink/30 hover:text-ink disabled:opacity-40"
          >
            ← Previous
          </button>

          {index < total - 1 ? (
            <button
              type="button"
              onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
              disabled={answers[current.id] === undefined}
              className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[0.8125rem] font-medium text-paper transition-colors hover:bg-ink/90 disabled:opacity-40"
            >
              Next
              <span>→</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!allAnswered || submitting || expired}
              className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-2.5 text-[0.8125rem] font-medium text-paper transition-colors hover:bg-ink/90 disabled:opacity-40"
            >
              {submitting ? "Scoring…" : "Submit quiz"}
              <span>→</span>
            </button>
          )}
        </div>

        {error && (
          <div className="border-l-2 border-terracotta bg-terracotta/5 px-4 py-2.5 text-[0.8125rem] text-terracotta">
            {error}
          </div>
        )}
      </div>

      <SidePanel
        timerLabel={timerLabel}
        expired={expired}
        answeredCount={Object.keys(answers).length}
        total={total}
        questions={session.questions}
        answers={answers}
        currentIndex={index}
        onJump={setIndex}
      />
    </div>
  )
}

function ProgressBar({
  questions,
  currentIndex,
  answers,
}: {
  questions: { id: string }[]
  currentIndex: number
  answers: AnswerMap
}) {
  return (
    <div className="flex items-center gap-1.5">
      {questions.map((q, i) => {
        const answered = answers[q.id] !== undefined
        const isCurrent = i === currentIndex
        return (
          <div
            key={q.id}
            className={cn(
              "h-px flex-1 transition-all duration-500",
              isCurrent
                ? "h-0.5 bg-ink"
                : answered
                  ? "bg-teal"
                  : "bg-rule",
            )}
          />
        )
      })}
      <span className="ml-3 font-mono text-[0.625rem] uppercase tracking-[0.18em] tabular-nums text-ink-faint">
        {currentIndex + 1} / {questions.length}
      </span>
    </div>
  )
}

function SidePanel({
  timerLabel,
  expired,
  answeredCount,
  total,
  questions,
  answers,
  currentIndex,
  onJump,
}: {
  timerLabel: string
  expired: boolean
  answeredCount: number
  total: number
  questions: { id: string }[]
  answers: AnswerMap
  currentIndex: number
  onJump: (i: number) => void
}) {
  return (
    <aside className="space-y-4">
      <div
        className={cn(
          "rounded-md border p-5 transition-colors",
          expired
            ? "border-terracotta/40 bg-terracotta/5"
            : "border-rule bg-surface",
        )}
      >
        <span className="eyebrow eyebrow-tick text-[0.625rem]">Time left</span>
        <div
          className={cn(
            "tabular mt-3 font-mono text-[2.5rem] font-medium leading-none",
            expired ? "text-terracotta" : "text-ink",
          )}
        >
          {timerLabel}
        </div>
        <p className="mt-3 text-[0.6875rem] leading-relaxed text-ink-muted">
          {expired
            ? "Session expired — start a new quiz to retry."
            : "Pass with sixty percent or higher to claim the bounty."}
        </p>
      </div>

      <div className="rounded-md border border-rule bg-surface p-5">
        <div className="flex items-baseline justify-between">
          <span className="eyebrow eyebrow-tick text-[0.625rem]">Answered</span>
          <span className="tabular font-display text-[1.25rem] font-medium text-ink">
            {answeredCount} / {total}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-5 gap-1">
          {questions.map((q, i) => {
            const isCurrent = i === currentIndex
            const isAnswered = answers[q.id] !== undefined
            return (
              <button
                key={q.id}
                onClick={() => onJump(i)}
                className={cn(
                  "grid h-9 place-items-center font-mono text-[0.6875rem] font-semibold transition-colors",
                  isCurrent
                    ? "bg-ink text-paper"
                    : isAnswered
                      ? "border border-teal bg-teal-tint text-teal"
                      : "border border-rule bg-surface text-ink-faint hover:border-ink/30 hover:text-ink",
                )}
              >
                {String(i + 1).padStart(2, "0")}
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-md border border-rule bg-surface-soft p-5 text-[0.75rem] leading-relaxed text-ink-muted">
        <span className="eyebrow eyebrow-tick text-[0.625rem]">Anti-cheat</span>
        <p className="mt-3">
          Question order and answer order are randomized per session. Browser
          fingerprint is captured on submit. One submission per session.
        </p>
      </div>
    </aside>
  )
}
