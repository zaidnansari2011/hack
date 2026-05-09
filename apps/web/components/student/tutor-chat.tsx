"use client"

import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useMemo, useRef, useState } from "react"
import type {
  ChatMessage,
  CheckQuestion,
  EnrollmentDetail,
  TutorLanguage,
} from "@pol/shared"

import { ApiClientError, apiFetch } from "@/lib/api"
import { ease } from "@/lib/motion"
import { cn } from "@/lib/utils"

// Maps tutor language → BCP-47 locale used by the browser's SpeechRecognition
// and SpeechSynthesis APIs. Web Speech support varies by browser/OS but the
// recognition languages are widely available on Chromium-based browsers.
const LANG_LOCALES: Record<TutorLanguage, string> = {
  en: "en-US",
  hi: "hi-IN",
  ta: "ta-IN",
  te: "te-IN",
}

const LANG_LABELS: Record<TutorLanguage, string> = {
  en: "EN",
  hi: "हिंदी",
  ta: "தமிழ்",
  te: "తెలుగు",
}

function suggestedPromptsFor(curriculum: EnrollmentDetail["curriculum"]): string[] {
  if (curriculum.syllabus.length > 0) {
    const picks = curriculum.syllabus.slice(0, 4)
    return picks.map(
      (m, i) =>
        i === 0
          ? `Walk me through ${m.module.toLowerCase()} step by step`
          : i === 1
            ? `Explain ${m.module.toLowerCase()} like I've never seen it before`
            : i === 2
              ? `What's the most common mistake people make with ${m.module.toLowerCase()}?`
              : `How does ${m.module.toLowerCase()} fit with everything else?`,
    )
  }
  return [
    `Give me a 90-second tour of ${curriculum.title}`,
    `What's the most important concept here?`,
    `What do beginners get wrong?`,
    `What should I learn first?`,
  ]
}

export function TutorChat({
  enrollment: initialEnrollment,
  initialMessages,
}: {
  enrollment: EnrollmentDetail
  initialMessages: ChatMessage[]
}) {
  // Keep a local copy of progressPct so we can bump it after each lesson
  // without a full page round-trip.
  const [progressPct, setProgressPct] = useState(
    initialEnrollment.progressPct,
  )
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState("")
  const [pending, setPending] = useState(false)
  const [lessonInFlight, setLessonInFlight] = useState<number | null>(null)
  const [pendingCheck, setPendingCheck] = useState<{
    question: CheckQuestion
    submitting: boolean
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [groqLive, setGroqLive] = useState<boolean | null>(null)
  const [lang, setLang] = useState<TutorLanguage>("en")
  const [listening, setListening] = useState(false)
  const [speakReplies, setSpeakReplies] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const lastSpokenIdRef = useRef<string | null>(null)

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    apiFetch<{ groq: "live" | "offline" }>("/tutor/status")
      .then((s) => setGroqLive(s.groq === "live"))
      .catch(() => setGroqLive(null))
  }, [])

  // Auto-TTS the most recent tutor reply when the speak toggle is on.
  useEffect(() => {
    if (!speakReplies || typeof window === "undefined") return
    const synth = window.speechSynthesis
    if (!synth) return
    const last = [...messages].reverse().find((m) => m.role === "tutor")
    if (!last || last.id === lastSpokenIdRef.current) return
    lastSpokenIdRef.current = last.id
    const utt = new SpeechSynthesisUtterance(stripMarkdown(last.content))
    utt.lang = LANG_LOCALES[lang]
    utt.rate = 1.05
    synth.cancel()
    synth.speak(utt)
  }, [messages, speakReplies, lang])

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [messages.length, pending, lessonInFlight, pendingCheck])

  const isFirstTurn = messages.length === 0
  const suggestedPrompts = useMemo(
    () => suggestedPromptsFor(initialEnrollment.curriculum),
    [initialEnrollment.curriculum],
  )

  // Modules the student has already received a lesson on. Drives the green
  // checkmark + "Re-teach" copy in the sidebar.
  const lessonedModules = useMemo(() => {
    const set = new Set<number>()
    for (const m of messages) {
      if (m.meta?.kind === "lesson") set.add(m.meta.moduleIndex)
    }
    return set
  }, [messages])

  // Modules cited in any answer (lesson or Q&A). Lighter "touched" highlight.
  const touchedTopics = useMemo(() => {
    const set = new Set<string>()
    for (const m of messages) {
      for (const c of m.citations ?? []) {
        const topic = c.source.split("#").pop()
        if (topic) set.add(topic)
      }
    }
    return set
  }, [messages])

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || pending) return
    setError(null)

    const optimistic: ChatMessage = {
      id: `tmp-${Date.now()}`,
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])
    setInput("")
    setPending(true)

    try {
      const res = await apiFetch<{ user: ChatMessage; tutor: ChatMessage }>(
        "/tutor/messages",
        {
          method: "POST",
          json: {
            enrollmentId: initialEnrollment.id,
            message: trimmed,
            lang,
          },
        },
      )
      setMessages((prev) => {
        const withoutOptimistic = prev.filter((m) => m.id !== optimistic.id)
        return [...withoutOptimistic, res.user, res.tutor]
      })
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Could not reach the tutor",
      )
    } finally {
      setPending(false)
      inputRef.current?.focus()
    }
  }

  async function teachModule(moduleIndex: number) {
    if (lessonInFlight !== null || pending) return
    setError(null)
    setPendingCheck(null)
    setLessonInFlight(moduleIndex)

    try {
      const res = await apiFetch<{ tutor: ChatMessage }>("/tutor/lesson", {
        method: "POST",
        json: { enrollmentId: initialEnrollment.id, moduleIndex },
      })
      setMessages((prev) => [...prev, res.tutor])
      // Recompute progress from fresh server data (covered/total).
      const prog = await apiFetch<{
        coveredModuleIndexes: number[]
        progressPct: number
      }>(`/tutor/progress/${initialEnrollment.id}`)
      setProgressPct(prog.progressPct)
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Couldn't generate the lesson",
      )
    } finally {
      setLessonInFlight(null)
    }
  }

  async function startCheck(moduleIndex: number) {
    if (pendingCheck || lessonInFlight !== null) return
    setError(null)
    try {
      const res = await apiFetch<{ question: CheckQuestion }>("/tutor/check", {
        method: "POST",
        json: { enrollmentId: initialEnrollment.id, moduleIndex },
      })
      setPendingCheck({ question: res.question, submitting: false })
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Couldn't fetch a check question",
      )
    }
  }

  async function submitCheck(answeredIndex: number) {
    if (!pendingCheck || pendingCheck.submitting) return
    setPendingCheck({ ...pendingCheck, submitting: true })
    try {
      const res = await apiFetch<{
        correct: boolean
        correctIndex: number
        message: ChatMessage
      }>("/tutor/check/submit", {
        method: "POST",
        json: {
          enrollmentId: initialEnrollment.id,
          moduleIndex: pendingCheck.question.moduleIndex,
          questionId: pendingCheck.question.questionId,
          answeredIndex,
        },
      })
      setMessages((prev) => [...prev, res.message])
      setPendingCheck(null)
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Couldn't submit your answer",
      )
      setPendingCheck({ ...pendingCheck, submitting: false })
    }
  }

  function toggleListening() {
    if (typeof window === "undefined") return
    const SR = getSpeechRecognitionCtor()
    if (!SR) {
      setError("Speech input isn't supported in this browser")
      return
    }
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }
    const rec = new SR()
    rec.lang = LANG_LOCALES[lang]
    rec.interimResults = false
    rec.continuous = false
    rec.onresult = (e: SpeechRecognitionEventLike) => {
      const transcript = e.results[0]?.[0]?.transcript ?? ""
      if (transcript) setInput((prev) => (prev ? `${prev} ${transcript}` : transcript))
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)
    recognitionRef.current = rec
    rec.start()
    setListening(true)
  }

  function toggleSpeakReplies() {
    if (speakReplies && typeof window !== "undefined") {
      window.speechSynthesis?.cancel()
    }
    setSpeakReplies((v) => !v)
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="flex h-[calc(100vh-220px)] min-h-[560px] flex-col overflow-hidden rounded-md border border-rule bg-surface">
        <ChatHeader
          enrollment={initialEnrollment}
          groqLive={groqLive}
          progressPct={progressPct}
          lang={lang}
          onLangChange={setLang}
          speakReplies={speakReplies}
          onToggleSpeak={toggleSpeakReplies}
        />

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-8">
          {isFirstTurn ? (
            <FirstTurnPanel
              onPick={send}
              onTeach={teachModule}
              curriculum={initialEnrollment.curriculum}
              prompts={suggestedPrompts}
              lessonInFlight={lessonInFlight}
            />
          ) : (
            <div className="space-y-7">
              <AnimatePresence initial={false}>
                {messages.map((m) => (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    onCheck={startCheck}
                    canCheck={
                      m.meta?.kind === "lesson" &&
                      pendingCheck === null &&
                      lessonInFlight === null
                    }
                  />
                ))}
              </AnimatePresence>
              {lessonInFlight !== null && (
                <TypingBubble label={`Preparing module ${lessonInFlight + 1}…`} />
              )}
              {pending && <TypingBubble />}
              {pendingCheck && (
                <PendingCheckCard
                  question={pendingCheck.question}
                  submitting={pendingCheck.submitting}
                  onSubmit={submitCheck}
                  onCancel={() => setPendingCheck(null)}
                />
              )}
            </div>
          )}
        </div>

        <div className="border-t border-rule px-5 py-4">
          {error && (
            <div className="mb-3 border-l-2 border-terracotta bg-terracotta/5 px-3 py-2 text-[0.8125rem] text-terracotta">
              {error}
            </div>
          )}
          <form
            className="flex items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  send(input)
                }
              }}
              placeholder={`Ask anything about ${initialEnrollment.curriculum.title}…`}
              rows={1}
              className="flex max-h-40 min-h-[44px] flex-1 resize-none rounded-sm border border-rule bg-surface-soft px-4 py-3 text-[0.9375rem] leading-relaxed text-ink transition-colors placeholder:text-ink-faint focus-visible:border-ink focus-visible:outline-none"
            />
            <button
              type="button"
              onClick={toggleListening}
              title={listening ? "Stop listening" : "Speak your question"}
              className={cn(
                "inline-flex h-11 w-11 items-center justify-center rounded-full border text-[0.8125rem] transition-colors",
                listening
                  ? "border-terracotta bg-terracotta/10 text-terracotta animate-pulse"
                  : "border-rule bg-surface text-ink-soft hover:border-ink/40 hover:text-ink",
              )}
            >
              {listening ? "●" : "🎙"}
            </button>
            <button
              type="submit"
              disabled={pending || !input.trim() || lessonInFlight !== null}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[0.8125rem] font-medium text-paper transition-colors hover:bg-ink/90 disabled:opacity-40"
            >
              {pending ? "…" : "Send"}
              <span className="text-paper/60">↵</span>
            </button>
          </form>
        </div>
      </div>

      <CurriculumSidebar
        enrollment={initialEnrollment}
        progressPct={progressPct}
        lessonedModules={lessonedModules}
        touchedTopics={touchedTopics}
        lessonInFlight={lessonInFlight}
        onTeach={teachModule}
      />
    </div>
  )
}

function ChatHeader({
  enrollment,
  groqLive,
  progressPct,
  lang,
  onLangChange,
  speakReplies,
  onToggleSpeak,
}: {
  enrollment: EnrollmentDetail
  groqLive: boolean | null
  progressPct: number
  lang: TutorLanguage
  onLangChange: (l: TutorLanguage) => void
  speakReplies: boolean
  onToggleSpeak: () => void
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-8 py-5">
      <div>
        <span className="eyebrow eyebrow-tick text-[0.625rem]">AI Tutor</span>
        <h2 className="mt-1 font-display text-[1.0625rem] font-medium text-ink">
          {enrollment.curriculum.title}
        </h2>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-full border border-rule bg-paper px-1 py-1">
          {(Object.keys(LANG_LABELS) as TutorLanguage[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => onLangChange(l)}
              className={cn(
                "rounded-full px-2.5 py-1 font-mono text-[0.6875rem] font-semibold transition-colors",
                lang === l
                  ? "bg-ink text-paper"
                  : "text-ink-faint hover:text-ink",
              )}
            >
              {LANG_LABELS[l]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onToggleSpeak}
          title={speakReplies ? "Speaking replies" : "Read replies aloud"}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.18em] transition-colors",
            speakReplies
              ? "border-teal/40 bg-teal-soft text-teal"
              : "border-rule bg-paper text-ink-faint hover:text-ink",
          )}
        >
          <span>{speakReplies ? "🔊" : "🔇"}</span>
          {speakReplies ? "voice on" : "voice off"}
        </button>
        <span className="hidden tabular font-mono text-[0.6875rem] text-ink-faint sm:inline-flex">
          {progressPct}% covered
        </span>
        <span
          className={cn(
            "pill",
            groqLive === true
              ? "border-forest/40 bg-forest-soft text-forest"
              : groqLive === false
                ? "border-amber/40 bg-amber/10 text-amber"
                : "border-rule bg-surface text-ink-faint",
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              groqLive === true
                ? "bg-forest"
                : groqLive === false
                  ? "bg-amber"
                  : "bg-rule",
            )}
          />
          {groqLive === true
            ? "Groq · live"
            : groqLive === false
              ? "RAG only"
              : "…"}
        </span>
      </div>
    </header>
  )
}

function FirstTurnPanel({
  onPick,
  onTeach,
  curriculum,
  prompts,
  lessonInFlight,
}: {
  onPick: (prompt: string) => void
  onTeach: (moduleIndex: number) => void
  curriculum: EnrollmentDetail["curriculum"]
  prompts: string[]
  lessonInFlight: number | null
}) {
  const totalMin = curriculum.syllabus.reduce(
    (sum, m) => sum + m.durationMinutes,
    0,
  )
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: ease.outQuart }}
      className="mx-auto max-w-2xl py-10"
    >
      <div className="text-center">
        <span className="font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-terracotta">
          First turn
        </span>
        <h2 className="display-md mt-4 text-balance text-ink">
          Welcome to{" "}
          <span className="display-italic text-teal">{curriculum.title}</span>.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-[0.9375rem] leading-relaxed text-ink-muted">
          {curriculum.summary}
        </p>
      </div>

      {curriculum.syllabus.length > 0 && (
        <div className="mt-9 rounded-md border border-rule bg-surface-soft p-5">
          <div className="flex items-baseline justify-between border-b border-rule-soft pb-3">
            <span className="eyebrow eyebrow-tick text-[0.625rem]">
              Syllabus · {curriculum.syllabus.length} modules
            </span>
            {totalMin > 0 && (
              <span className="tabular font-mono text-[0.6875rem] text-ink-faint">
                ~{totalMin} min total
              </span>
            )}
          </div>
          <ol className="mt-3 grid gap-1.5">
            {curriculum.syllabus.map((m, i) => (
              <li key={m.module}>
                <button
                  type="button"
                  onClick={() => onTeach(i)}
                  disabled={lessonInFlight !== null}
                  className="group grid w-full grid-cols-[auto_1fr_auto] items-baseline gap-3 rounded-sm border border-transparent px-2.5 py-2 text-left transition-all duration-200 hover:border-ink/30 hover:bg-surface disabled:opacity-50"
                >
                  <span className="tabular font-mono text-[0.625rem] text-ink-faint">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display text-[0.9375rem] font-medium leading-snug text-ink">
                      {m.module}
                    </span>
                    <span className="block truncate text-[0.75rem] text-ink-muted">
                      {m.summary}
                    </span>
                  </span>
                  <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-ink-faint group-hover:text-teal">
                    Teach&nbsp;→
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="mt-7 space-y-2">
        <div className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-ink-faint">
          Or jump in with one of these
        </div>
        <div className="grid gap-2">
          {prompts.map((p, i) => (
            <button
              key={p}
              type="button"
              onClick={() => onPick(p)}
              className="group flex items-baseline justify-between gap-4 rounded-sm border border-rule bg-surface-soft px-4 py-3 text-left text-[0.875rem] font-medium text-ink-soft transition-all duration-300 ease-out-quart hover:border-ink/40 hover:bg-surface hover:text-ink"
            >
              <span className="flex items-baseline gap-3">
                <span className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-ink-faint">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{p}</span>
              </span>
              <span className="text-ink-faint transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-ink">
                →
              </span>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

function MessageBubble({
  message,
  onCheck,
  canCheck,
}: {
  message: ChatMessage
  onCheck: (moduleIndex: number) => void
  canCheck: boolean
}) {
  const isUser = message.role === "user"
  const isLesson = message.meta?.kind === "lesson"
  const isCheckResult = message.meta?.kind === "check"

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: ease.outQuart }}
      className={cn("flex gap-4", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && (
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink font-display text-[0.6875rem] text-paper">
          T
        </div>
      )}
      <div className={cn("max-w-[78%] space-y-2", isUser && "items-end")}>
        {isLesson && message.meta?.kind === "lesson" && (
          <div className="flex items-baseline gap-2 px-1 font-mono text-[0.625rem] uppercase tracking-[0.22em] text-teal">
            <span>Lesson · Module {message.meta.moduleIndex + 1}</span>
            <span className="text-ink-faint">·</span>
            <span className="font-display text-[0.75rem] font-medium normal-case tracking-normal text-ink-soft">
              {message.meta.module}
            </span>
          </div>
        )}
        {isCheckResult && message.meta?.kind === "check" && (
          <div
            className={cn(
              "flex items-baseline gap-2 px-1 font-mono text-[0.625rem] uppercase tracking-[0.22em]",
              message.meta.correct ? "text-forest" : "text-terracotta",
            )}
          >
            <span>
              {message.meta.correct ? "Correct" : "Not yet"} · Module{" "}
              {message.meta.moduleIndex + 1}
            </span>
          </div>
        )}
        <div
          className={cn(
            "px-4 py-3 text-[0.9375rem] leading-relaxed",
            isUser
              ? "rounded-md bg-ink text-paper"
              : isLesson
                ? "rounded-md border-l-2 border-l-teal border-y border-r border-y-rule border-r-rule bg-surface-soft text-ink"
                : "rounded-md border border-rule bg-surface-soft text-ink",
          )}
        >
          <FormattedContent text={message.content} />
        </div>
        {!isUser && message.citations && message.citations.length > 0 && (
          <Citations citations={message.citations} />
        )}
        {isLesson && message.meta?.kind === "lesson" && (
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                if (message.meta?.kind === "lesson") {
                  onCheck(message.meta.moduleIndex)
                }
              }}
              disabled={!canCheck}
              className="inline-flex items-center gap-2 rounded-full border border-teal/40 bg-teal-tint px-4 py-1.5 text-[0.75rem] font-medium text-teal transition-colors hover:bg-teal hover:text-paper disabled:cursor-not-allowed disabled:opacity-50"
            >
              Check yourself <span>→</span>
            </button>
            <span className="font-mono text-[0.6875rem] text-ink-faint">
              one quick MCQ to lock it in
            </span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function PendingCheckCard({
  question,
  submitting,
  onSubmit,
  onCancel,
}: {
  question: CheckQuestion
  submitting: boolean
  onSubmit: (index: number) => void
  onCancel: () => void
}) {
  const [picked, setPicked] = useState<number | null>(null)
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: ease.outQuart }}
      className="flex gap-4"
    >
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-rule bg-paper font-mono text-[0.625rem] uppercase tracking-[0.18em] text-ink">
        ?
      </div>
      <div className="max-w-[78%] flex-1 space-y-3 rounded-md border border-amber/30 bg-amber/5 p-5">
        <div className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-amber">
          Check yourself · Module {question.moduleIndex + 1} · {question.module}
        </div>
        <p className="font-display text-[1rem] font-medium leading-snug text-ink">
          {question.prompt}
        </p>
        <ul className="space-y-1.5">
          {question.choices.map((c, i) => {
            const isPicked = picked === i
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => setPicked(i)}
                  disabled={submitting}
                  className={cn(
                    "flex w-full items-baseline gap-3 rounded-sm border px-3 py-2 text-left text-[0.875rem] transition-all",
                    isPicked
                      ? "border-ink bg-surface text-ink"
                      : "border-rule bg-surface text-ink-soft hover:border-ink/40 hover:text-ink",
                    submitting && "cursor-not-allowed opacity-60",
                  )}
                >
                  <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-ink-faint">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span>{c}</span>
                </button>
              </li>
            )
          })}
        </ul>
        <div className="flex items-center justify-between border-t border-rule-soft pt-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-faint hover:text-ink"
          >
            cancel
          </button>
          <button
            type="button"
            onClick={() => picked !== null && onSubmit(picked)}
            disabled={picked === null || submitting}
            className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2 text-[0.8125rem] font-medium text-paper transition-colors hover:bg-ink/90 disabled:opacity-40"
          >
            {submitting ? "Checking…" : "Submit answer"}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

function FormattedContent({ text }: { text: string }) {
  const parts = text.split(/(```[\s\S]*?```)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("```")) {
          const inner = part.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "")
          return (
            <pre
              key={i}
              className="my-2 overflow-x-auto rounded-sm border border-rule bg-paper-deep p-3 font-mono text-[0.75rem] leading-relaxed text-ink-soft"
            >
              <code>{inner}</code>
            </pre>
          )
        }
        return (
          <span key={i} className="whitespace-pre-wrap">
            {part}
          </span>
        )
      })}
    </>
  )
}

function Citations({
  citations,
}: {
  citations: NonNullable<ChatMessage["citations"]>
}) {
  return (
    <div className="flex flex-wrap gap-1.5 pl-1">
      {citations.map((c) => (
        <span
          key={c.chunkId}
          title={`relevance ${c.score.toFixed(3)}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-rule bg-surface px-2 py-0.5 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink-muted"
        >
          <span className="text-teal">§</span>
          {c.source.split("#").pop() ?? c.source}
        </span>
      ))}
    </div>
  )
}

function TypingBubble({ label }: { label?: string }) {
  return (
    <div className="flex gap-4">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink font-display text-[0.6875rem] text-paper">
        T
      </div>
      <div className="rounded-md border border-rule bg-surface-soft px-4 py-3">
        <span className="inline-flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5">
            <Dot delay="0ms" />
            <Dot delay="120ms" />
            <Dot delay="240ms" />
          </span>
          {label && (
            <span className="font-mono text-[0.6875rem] text-ink-faint">
              {label}
            </span>
          )}
        </span>
      </div>
    </div>
  )
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-muted"
      style={{ animationDelay: delay }}
    />
  )
}

function CurriculumSidebar({
  enrollment,
  progressPct,
  lessonedModules,
  touchedTopics,
  lessonInFlight,
  onTeach,
}: {
  enrollment: EnrollmentDetail
  progressPct: number
  lessonedModules: Set<number>
  touchedTopics: Set<string>
  lessonInFlight: number | null
  onTeach: (moduleIndex: number) => void
}) {
  const progress = Math.min(100, Math.max(0, progressPct))
  const totalModules = enrollment.curriculum.syllabus.length
  return (
    <aside className="space-y-4">
      <div className="surface-paper rounded-md p-5">
        <div className="eyebrow eyebrow-tick text-[0.625rem]">Bounty</div>
        <h3 className="mt-2 font-display text-[1rem] font-medium leading-snug text-ink">
          {enrollment.bounty.title}
        </h3>
        <div className="mt-4 flex items-baseline justify-between border-t border-rule-soft pt-3">
          <span className="eyebrow text-[0.625rem]">Reward</span>
          <span className="tabular font-display text-[1.5rem] font-medium text-ink">
            ₹{enrollment.bounty.rewardInr.toLocaleString("en-IN")}
          </span>
        </div>
        <p className="mt-2 text-[0.6875rem] leading-relaxed text-ink-muted">
          Paid via UPI on quiz pass · escrow on Base Sepolia
        </p>
      </div>

      <div className="surface-paper rounded-md p-5">
        <div className="flex items-baseline justify-between">
          <span className="eyebrow eyebrow-tick text-[0.625rem]">Progress</span>
          <span className="tabular font-mono text-[0.6875rem] text-ink-soft">
            {lessonedModules.size}/{totalModules} · {progress}%
          </span>
        </div>
        <div className="mt-3 h-px overflow-hidden bg-rule">
          <motion.div
            className="h-full bg-teal"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: ease.outQuart }}
          />
        </div>
      </div>

      <div className="surface-paper rounded-md p-5">
        <div className="flex items-baseline justify-between">
          <span className="eyebrow eyebrow-tick text-[0.625rem]">Syllabus</span>
          <span className="tabular font-mono text-[0.6875rem] text-ink-faint">
            tap a row →
          </span>
        </div>
        {enrollment.curriculum.syllabus.length > 0 ? (
          <ol className="mt-3 space-y-1">
            {enrollment.curriculum.syllabus.map((m, i) => {
              const slug = m.module.toLowerCase().replace(/\s+/g, "-")
              const lessoned = lessonedModules.has(i)
              const touched = !lessoned && touchedTopics.has(slug)
              const loading = lessonInFlight === i
              return (
                <li key={m.module}>
                  <button
                    type="button"
                    onClick={() => onTeach(i)}
                    disabled={lessonInFlight !== null}
                    className={cn(
                      "group block w-full rounded-sm border-l-2 px-3 py-2 text-left transition-all duration-200",
                      lessoned
                        ? "border-l-teal bg-teal-tint/40"
                        : touched
                          ? "border-l-ink/30 bg-surface"
                          : "border-l-rule-soft hover:border-l-ink/40 hover:bg-surface",
                      lessonInFlight !== null &&
                        !loading &&
                        "cursor-not-allowed opacity-50",
                    )}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className={cn(
                          "flex items-baseline gap-1.5 font-display text-[0.8125rem] font-medium leading-snug",
                          lessoned ? "text-ink" : "text-ink-soft",
                        )}
                      >
                        {lessoned ? (
                          <span className="text-teal">✓</span>
                        ) : (
                          <span className="font-mono text-[0.625rem] text-ink-faint">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                        )}
                        {m.module}
                      </span>
                      <span className="tabular font-mono text-[0.625rem] text-ink-faint">
                        {loading ? "…" : `${m.durationMinutes}m`}
                      </span>
                    </div>
                    <p className="mt-1 text-[0.75rem] leading-snug text-ink-muted">
                      {m.summary}
                    </p>
                    <span
                      className={cn(
                        "mt-1.5 inline-flex font-mono text-[0.625rem] uppercase tracking-[0.18em] transition-colors",
                        lessoned
                          ? "text-teal"
                          : "text-ink-faint group-hover:text-ink",
                      )}
                    >
                      {lessoned ? "Re-teach" : "Teach this"} →
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {enrollment.curriculum.topics.map((t) => (
              <li key={t} className="text-[0.8125rem] text-ink-muted">
                {t}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-md border border-amber/30 bg-amber/5 p-5">
        <span className="eyebrow eyebrow-tick text-[0.625rem] text-amber">
          Next step
        </span>
        <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-soft">
          When you feel ready, take the quiz to earn{" "}
          <strong className="text-ink">
            ₹{enrollment.bounty.rewardInr.toLocaleString("en-IN")}
          </strong>
          . The result settles in seconds.
        </p>
        <Link
          href={`/learn/${enrollment.bountyId}/quiz`}
          className="mt-4 inline-flex w-full items-center justify-between rounded-full bg-ink px-5 py-2.5 text-[0.8125rem] font-medium text-paper transition-all duration-300 ease-out-quart hover:bg-ink/90"
        >
          Take quiz
          <span>→</span>
        </Link>
      </div>
    </aside>
  )
}

// ─── Voice helpers ──────────────────────────────────────────────────────────

// Strip markdown tokens that read poorly when spoken aloud.
function stripMarkdown(s: string): string {
  return s
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\[\^[^\]]+\]/g, "")
    .replace(/[*_#>`~]/g, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\s+/g, " ")
    .trim()
}

type SpeechRecognitionResultLike = {
  0?: { transcript: string }
}
type SpeechRecognitionEventLike = {
  results: ArrayLike<SpeechRecognitionResultLike>
}
type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: (e: SpeechRecognitionEventLike) => void
  onerror: () => void
  onend: () => void
  start(): void
  stop(): void
}

function getSpeechRecognitionCtor():
  | (new () => SpeechRecognitionLike)
  | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike
    webkitSpeechRecognition?: new () => SpeechRecognitionLike
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}
