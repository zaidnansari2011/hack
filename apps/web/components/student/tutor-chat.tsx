"use client"

import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useMemo, useRef, useState } from "react"
import type {
  ChatMessage,
  CheckQuestion,
  EnrollmentDetail,
  TutorLanguage,
  TutorPersona,
} from "@pol/shared"

import { ApiClientError, apiFetch } from "@/lib/api"
import { ease } from "@/lib/motion"
import { cn } from "@/lib/utils"

// ─── Tutor language / persona ─────────────────────────────────────────────────

const LANG_LOCALES: Record<TutorLanguage, string> = {
  en: "en-US", hi: "hi-IN", ta: "ta-IN", te: "te-IN",
}
const LANG_LABELS: Record<TutorLanguage, string> = {
  en: "EN", hi: "हिंदी", ta: "தமிழ்", te: "తెలుగు",
}
const LANG_VERB: Record<TutorLanguage, string> = {
  en: "Replying in English",
  hi: "हिंदी में जवाब देगा",
  ta: "தமிழில் பதிலளிக்கும்",
  te: "తెలుగులో సమాధానం",
}
const PERSONAS: { id: TutorPersona; label: string; tagline: string }[] = [
  { id: "mentor",   label: "Mentor",   tagline: "Warm, Socratic. Leads you to the answer." },
  { id: "examiner", label: "Examiner", tagline: "Rigorous. Cites every claim, no handwaving." },
  { id: "coach",    label: "Coach",    tagline: "High-energy. Short sentences, momentum first." },
]

// ─── Code sandbox languages ───────────────────────────────────────────────────

type CodeLang =
  | "python" | "javascript" | "typescript" | "java" | "cpp" | "c"
  | "go" | "rust" | "kotlin" | "swift" | "ruby" | "sql"

const LANGUAGES: {
  id: CodeLang; label: string; fence: string; runHint: string; starter: string
}[] = [
  {
    id: "python", label: "Python", fence: "python", runHint: "python solution.py",
    starter: `def solution():\n    # write your code here\n    pass\n\nprint(solution())\n`,
  },
  {
    id: "javascript", label: "JavaScript", fence: "javascript", runHint: "node solution.js",
    starter: `function solution() {\n  // write your code here\n}\n\nconsole.log(solution());\n`,
  },
  {
    id: "typescript", label: "TypeScript", fence: "typescript", runHint: "ts-node solution.ts",
    starter: `function solution(): void {\n  // write your code here\n}\n\nsolution();\n`,
  },
  {
    id: "java", label: "Java", fence: "java", runHint: "javac Solution.java && java Solution",
    starter: `public class Solution {\n    public static void main(String[] args) {\n        // write your code here\n    }\n}\n`,
  },
  {
    id: "cpp", label: "C++", fence: "cpp", runHint: "g++ -o sol solution.cpp && ./sol",
    starter: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // write your code here\n    return 0;\n}\n`,
  },
  {
    id: "c", label: "C", fence: "c", runHint: "gcc -o sol solution.c && ./sol",
    starter: `#include <stdio.h>\n\nint main() {\n    // write your code here\n    return 0;\n}\n`,
  },
  {
    id: "go", label: "Go", fence: "go", runHint: "go run solution.go",
    starter: `package main\n\nimport "fmt"\n\nfunc main() {\n    // write your code here\n    fmt.Println("hello")\n}\n`,
  },
  {
    id: "rust", label: "Rust", fence: "rust", runHint: "rustc solution.rs && ./solution",
    starter: `fn main() {\n    // write your code here\n    println!("hello, world!");\n}\n`,
  },
  {
    id: "kotlin", label: "Kotlin", fence: "kotlin",
    runHint: "kotlinc solution.kt -include-runtime -d sol.jar && java -jar sol.jar",
    starter: `fun main() {\n    // write your code here\n    println("hello")\n}\n`,
  },
  {
    id: "swift", label: "Swift", fence: "swift", runHint: "swift solution.swift",
    starter: `import Foundation\n\n// write your code here\nprint("hello, world!")\n`,
  },
  {
    id: "ruby", label: "Ruby", fence: "ruby", runHint: "ruby solution.rb",
    starter: `# write your code here\ndef solution\n  # ...\nend\n\np solution\n`,
  },
  {
    id: "sql", label: "SQL", fence: "sql", runHint: "psql -f solution.sql",
    starter: `-- write your query here\nSELECT *\nFROM table_name\nWHERE condition;\n`,
  },
]

function langById(id: CodeLang) {
  return LANGUAGES.find((l) => l.id === id)!
}

function detectDefaultLang(curriculum: EnrollmentDetail["curriculum"]): CodeLang {
  const text = (curriculum.title + " " + curriculum.topics.join(" ")).toLowerCase()
  if (text.includes("python"))                                          return "python"
  if (text.includes("typescript") || text.includes(" ts "))            return "typescript"
  if (text.includes("javascript") || text.includes("node"))            return "javascript"
  if (text.includes("java") && !text.includes("javascript"))           return "java"
  if (text.includes("c++") || text.includes("cpp"))                    return "cpp"
  if (text.includes("golang") || text.includes(" go "))                return "go"
  if (text.includes("rust"))                                           return "rust"
  if (text.includes("kotlin") || text.includes("android"))             return "kotlin"
  if (text.includes("swift") || text.includes("ios"))                  return "swift"
  if (text.includes("ruby") || text.includes("rails"))                 return "ruby"
  if (text.includes("sql") || text.includes("database") || text.includes("postgres")) return "sql"
  if (text.includes(" c ") || text.includes("c programming"))          return "c"
  return "python"
}

// ─── Resize hook ──────────────────────────────────────────────────────────────

function useResizePanel(initial: number, min: number, max: number) {
  const [size, setSize] = useState(initial)
  const [dragging, setDragging] = useState(false)
  const stateRef = useRef({ size: initial, dragging: false })

  function startDrag(e: React.MouseEvent, direction: 1 | -1 = 1) {
    e.preventDefault()
    const startX = e.clientX
    const startSize = stateRef.current.size
    stateRef.current.dragging = true
    setDragging(true)

    function onMove(ev: MouseEvent) {
      const dx = (ev.clientX - startX) * direction
      const next = Math.min(max, Math.max(min, startSize + dx))
      stateRef.current.size = next
      setSize(next)
    }
    function onUp() {
      stateRef.current.dragging = false
      setDragging(false)
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
  }

  // Keep ref in sync
  useEffect(() => { stateRef.current.size = size }, [size])

  return { size, dragging, startDrag }
}

// ─── ResizeHandle ─────────────────────────────────────────────────────────────

function ResizeHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <div
      onMouseDown={onMouseDown}
      className="group relative z-10 flex w-1.5 shrink-0 cursor-col-resize select-none items-center justify-center bg-transparent transition-colors hover:bg-teal/10 active:bg-teal/20"
    >
      <div className="h-10 w-px rounded-full bg-rule transition-colors group-hover:bg-teal/50 group-active:bg-teal" />
    </div>
  )
}

// ─── LangDropdown ─────────────────────────────────────────────────────────────

function LangDropdown({ value, onChange }: { value: CodeLang; onChange: (l: CodeLang) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [open])

  const current = langById(value)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-7 items-center gap-1.5 rounded-lg border px-2.5 font-mono text-[0.625rem] font-semibold uppercase tracking-[0.1em] transition-colors",
          open
            ? "border-teal/40 bg-teal-soft text-teal"
            : "border-rule bg-paper text-ink-faint hover:border-ink/20 hover:text-ink-soft",
        )}
      >
        {current.label}
        <ChevronDownIcon className={cn("h-2.5 w-2.5 transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15, ease: ease.outQuart }}
            className="absolute left-0 top-full z-20 mt-1.5 w-44 overflow-hidden rounded-xl border border-rule bg-paper shadow-lg"
          >
            {LANGUAGES.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => { onChange(l.id); setOpen(false) }}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-surface-soft",
                  l.id === value ? "text-teal" : "text-ink-soft",
                )}
              >
                <span className="font-mono text-[0.6875rem]">{l.label}</span>
                {l.id === value && <CheckIcon className="ml-auto h-3 w-3 text-teal" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Suggested prompts ────────────────────────────────────────────────────────

function suggestedPromptsFor(curriculum: EnrollmentDetail["curriculum"]): string[] {
  if (curriculum.syllabus.length > 0) {
    const picks = curriculum.syllabus.slice(0, 4)
    return picks.map((m, i) =>
      i === 0 ? `Walk me through ${m.module.toLowerCase()} step by step`
      : i === 1 ? `Explain ${m.module.toLowerCase()} like I've never seen it before`
      : i === 2 ? `What's the most common mistake people make with ${m.module.toLowerCase()}?`
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

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionSummary = { sessionIndex: number; messageCount: number; startedAt: string }

// ─── TutorChat ────────────────────────────────────────────────────────────────

export function TutorChat({
  enrollment: initialEnrollment,
  initialMessages,
  initialSessions = [],
  initialSessionIndex = 0,
}: {
  enrollment: EnrollmentDetail
  initialMessages: ChatMessage[]
  initialSessions?: SessionSummary[]
  initialSessionIndex?: number
}) {
  // ── Core state ──
  const [progressPct, setProgressPct] = useState(initialEnrollment.progressPct)
  const [sessionIndex, setSessionIndex] = useState(initialSessionIndex)
  const [sessions, setSessions] = useState<SessionSummary[]>(
    initialSessions.length > 0
      ? initialSessions
      : [{ sessionIndex: 0, messageCount: initialMessages.length, startedAt: new Date().toISOString() }],
  )
  const [sessionLoading, setSessionLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState("")
  const [pending, setPending] = useState(false)
  const [lessonInFlight, setLessonInFlight] = useState<number | null>(null)
  const [pendingCheck, setPendingCheck] = useState<{ question: CheckQuestion; submitting: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [groqLive, setGroqLive] = useState<boolean | null>(null)
  const [tutorLang, setTutorLang] = useState<TutorLanguage>("en")
  const [persona, setPersona] = useState<TutorPersona>("mentor")
  const [listening, setListening] = useState(false)
  const [speakReplies, setSpeakReplies] = useState(false)
  const [voiceSupport, setVoiceSupport] = useState<{ recognition: boolean; synthesis: boolean }>(
    { recognition: false, synthesis: false },
  )

  // ── Layout state ──
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [codeOpen, setCodeOpen] = useState(false)
  const sidebarResize = useResizePanel(256, 160, 520)
  const codeResize = useResizePanel(420, 280, 720)

  // ── Code editor state (lifted so send() can read it) ──
  const defaultLang = useMemo(
    () => detectDefaultLang(initialEnrollment.curriculum),
    [initialEnrollment.curriculum],
  )
  const [codeLang, setCodeLang] = useState<CodeLang>(defaultLang)
  const [codes, setCodes] = useState<Record<CodeLang, string>>(() => {
    const init = {} as Record<CodeLang, string>
    for (const l of LANGUAGES) init[l.id] = l.starter
    return init
  })
  const codeText = codes[codeLang]
  const isCodeModified = codeText.trim() !== "" && codeText.trim() !== langById(codeLang).starter.trim()

  function setCodeForLang(lang: CodeLang, text: string) {
    setCodes((prev) => ({ ...prev, [lang]: text }))
  }

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const lastSpokenIdRef = useRef<string | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  // ── Persist prefs ──
  useEffect(() => {
    if (typeof window === "undefined") return
    const l = window.localStorage.getItem("pol:tutor:lang") as TutorLanguage | null
    if (l && ["en", "hi", "ta", "te"].includes(l)) setTutorLang(l)
    const p = window.localStorage.getItem("pol:tutor:persona") as TutorPersona | null
    if (p && ["mentor", "examiner", "coach"].includes(p)) setPersona(p)
  }, [])
  useEffect(() => { if (typeof window !== "undefined") window.localStorage.setItem("pol:tutor:lang", tutorLang) }, [tutorLang])
  useEffect(() => { if (typeof window !== "undefined") window.localStorage.setItem("pol:tutor:persona", persona) }, [persona])

  // ── Voice support ──
  useEffect(() => {
    if (typeof window === "undefined") return
    setVoiceSupport({
      recognition: getSpeechRecognitionCtor() !== null,
      synthesis: typeof window.speechSynthesis !== "undefined",
    })
  }, [])

  // ── Groq status ──
  useEffect(() => {
    apiFetch<{ groq: "live" | "offline" }>("/tutor/status")
      .then((s) => setGroqLive(s.groq === "live"))
      .catch(() => setGroqLive(null))
  }, [])

  // ── TTS ──
  useEffect(() => {
    if (!speakReplies || typeof window === "undefined") return
    const synth = window.speechSynthesis
    if (!synth) return
    const last = [...messages].reverse().find((m) => m.role === "tutor")
    if (!last || last.id === lastSpokenIdRef.current) return
    lastSpokenIdRef.current = last.id
    const utt = new SpeechSynthesisUtterance(stripMarkdown(last.content))
    utt.lang = LANG_LOCALES[tutorLang]; utt.rate = 1.05
    synth.cancel(); synth.speak(utt)
  }, [messages, speakReplies, tutorLang])

  // ── Auto-scroll ──
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages.length, pending, lessonInFlight, pendingCheck])

  const isFirstTurn = messages.length === 0
  const suggestedPrompts = useMemo(
    () => suggestedPromptsFor(initialEnrollment.curriculum),
    [initialEnrollment.curriculum],
  )
  const lessonedModules = useMemo(() => {
    const set = new Set<number>()
    for (const m of messages) if (m.meta?.kind === "lesson") set.add(m.meta.moduleIndex)
    return set
  }, [messages])
  const touchedTopics = useMemo(() => {
    const set = new Set<string>()
    for (const m of messages)
      for (const c of m.citations ?? []) {
        const t = c.source.split("#").pop()
        if (t) set.add(t)
      }
    return set
  }, [messages])

  // ── API handlers ──

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || pending) return
    setError(null)

    // Append sandbox code as context when panel is open and code has been edited
    let fullMessage = trimmed
    if (codeOpen && isCodeModified) {
      const ld = langById(codeLang)
      fullMessage += `\n\n[My current ${ld.label} code in the sandbox]\n\`\`\`${ld.fence}\n${codeText}\n\`\`\``
    }

    const optimistic: ChatMessage = {
      id: `tmp-${Date.now()}`, role: "user",
      content: fullMessage, createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])
    setInput("")
    setPending(true)
    try {
      const res = await apiFetch<{ user: ChatMessage; tutor: ChatMessage }>("/tutor/messages", {
        method: "POST",
        json: { enrollmentId: initialEnrollment.id, message: fullMessage, lang: tutorLang, persona, sessionIndex },
      })
      setMessages((prev) => [...prev.filter((m) => m.id !== optimistic.id), res.user, res.tutor])
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      setError(err instanceof ApiClientError ? err.message : "Could not reach the tutor")
    } finally {
      setPending(false)
      inputRef.current?.focus()
    }
  }

  async function teachModule(moduleIndex: number) {
    if (lessonInFlight !== null || pending) return
    setError(null); setPendingCheck(null); setLessonInFlight(moduleIndex)
    try {
      const res = await apiFetch<{ tutor: ChatMessage }>("/tutor/lesson", {
        method: "POST",
        json: { enrollmentId: initialEnrollment.id, moduleIndex, lang: tutorLang, sessionIndex },
      })
      setMessages((prev) => [...prev, res.tutor])
      const prog = await apiFetch<{ coveredModuleIndexes: number[]; progressPct: number }>(
        `/tutor/progress/${initialEnrollment.id}`,
      )
      setProgressPct(prog.progressPct)
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't generate the lesson")
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
      setError(err instanceof ApiClientError ? err.message : "Couldn't fetch a check question")
    }
  }

  async function submitCheck(answeredIndex: number) {
    if (!pendingCheck || pendingCheck.submitting) return
    setPendingCheck({ ...pendingCheck, submitting: true })
    try {
      const res = await apiFetch<{ correct: boolean; correctIndex: number; message: ChatMessage }>(
        "/tutor/check/submit",
        { method: "POST", json: { enrollmentId: initialEnrollment.id, moduleIndex: pendingCheck.question.moduleIndex, questionId: pendingCheck.question.questionId, answeredIndex, sessionIndex } },
      )
      setMessages((prev) => [...prev, res.message])
      setPendingCheck(null)
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't submit your answer")
      setPendingCheck({ ...pendingCheck, submitting: false })
    }
  }

  async function switchSession(targetIndex: number) {
    if (targetIndex === sessionIndex || sessionLoading) return
    setSessionLoading(true); setError(null)
    try {
      const res = await apiFetch<{ messages: ChatMessage[] }>(`/tutor/history/${initialEnrollment.id}?session=${targetIndex}`)
      setMessages(res.messages); setSessionIndex(targetIndex)
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not load session")
    } finally {
      setSessionLoading(false)
    }
  }

  function startNewSession() {
    const nextIndex = Math.max(...sessions.map((s) => s.sessionIndex)) + 1
    setSessions((prev) => [...prev, { sessionIndex: nextIndex, messageCount: 0, startedAt: new Date().toISOString() }])
    setSessionIndex(nextIndex); setMessages([]); setPendingCheck(null); setError(null)
  }

  function toggleSpeakReplies() {
    if (typeof window === "undefined") return
    if (!voiceSupport.synthesis) { setError("Voice output isn't supported in this browser."); return }
    if (speakReplies) window.speechSynthesis?.cancel()
    setSpeakReplies((v) => !v)
  }

  function toggleListening() {
    if (typeof window === "undefined") return
    const SR = getSpeechRecognitionCtor()
    if (!SR) { setError("Voice input isn't supported in this browser. Try Chrome, Edge, or Safari over HTTPS."); return }
    if (listening) { recognitionRef.current?.stop(); setListening(false); return }
    try {
      const rec = new SR()
      rec.lang = LANG_LOCALES[tutorLang]; rec.interimResults = false; rec.continuous = false
      rec.onresult = (e: SpeechRecognitionEventLike) => {
        const t = e.results[0]?.[0]?.transcript ?? ""
        if (t) { setInput((prev) => (prev ? `${prev} ${t}` : t)); inputRef.current?.focus() }
      }
      rec.onerror = (ev?: { error?: string }) => {
        setListening(false)
        if (ev?.error === "not-allowed" || ev?.error === "service-not-allowed")
          setError("Microphone permission denied.")
        else if (ev?.error === "no-speech") setError("Didn't hear anything. Try again.")
      }
      rec.onend = () => setListening(false)
      recognitionRef.current = rec; rec.start(); setListening(true); setError(null)
    } catch (err) {
      setListening(false)
      setError(err instanceof Error ? `Voice input failed: ${err.message}` : "Voice input failed")
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex overflow-hidden bg-paper"
      // Prevent text selection during resize drags
      style={{ userSelect: sidebarResize.dragging || codeResize.dragging ? "none" : undefined }}
    >
      {/* ── Left sidebar ── */}
      <div
        style={{ width: sidebarOpen ? sidebarResize.size : 0 }}
        className={cn(
          "flex flex-col overflow-hidden border-r border-rule bg-surface",
          !sidebarResize.dragging && "transition-[width] duration-300 ease-in-out",
        )}
      >
        <CurriculumSidebar
          enrollment={initialEnrollment}
          progressPct={progressPct}
          lessonedModules={lessonedModules}
          touchedTopics={touchedTopics}
          lessonInFlight={lessonInFlight}
          onTeach={teachModule}
        />
      </div>

      {/* Sidebar resize handle */}
      {sidebarOpen && (
        <ResizeHandle onMouseDown={(e) => sidebarResize.startDrag(e, 1)} />
      )}

      {/* ── Main chat ── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <ChatHeader
          enrollment={initialEnrollment}
          groqLive={groqLive}
          progressPct={progressPct}
          lang={tutorLang}
          onLangChange={setTutorLang}
          persona={persona}
          onPersonaChange={setPersona}
          speakReplies={speakReplies}
          onToggleSpeak={toggleSpeakReplies}
          synthesisSupported={voiceSupport.synthesis}
          sessions={sessions}
          sessionIndex={sessionIndex}
          sessionLoading={sessionLoading}
          onSwitchSession={switchSession}
          onNewSession={startNewSession}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          codeOpen={codeOpen}
          onToggleCode={() => setCodeOpen((v) => !v)}
        />

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
          {isFirstTurn ? (
            <CourseOverviewPanel
              onPick={send}
              onTeach={teachModule}
              curriculum={initialEnrollment.curriculum}
              prompts={suggestedPrompts}
              lessonInFlight={lessonInFlight}
            />
          ) : (
            <div className="space-y-6">
              <AnimatePresence initial={false}>
                {messages.map((m) => (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    onCheck={startCheck}
                    canCheck={m.meta?.kind === "lesson" && pendingCheck === null && lessonInFlight === null}
                  />
                ))}
              </AnimatePresence>
              {lessonInFlight !== null && <TypingBubble label={`Preparing module ${lessonInFlight + 1}…`} />}
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

        {/* Input bar */}
        <div className="shrink-0 border-t border-rule-soft bg-surface-soft px-5 py-3">
          {error && (
            <div className="mb-2 rounded-lg border border-terracotta/20 bg-terracotta/5 px-3 py-2 text-[0.8125rem] text-terracotta">
              {error}
            </div>
          )}
          {codeOpen && isCodeModified && (
            <div className="mb-2 flex items-center gap-1.5">
              <CodeBracketIcon className="h-3 w-3 text-teal" />
              <span className="font-mono text-[0.5625rem] uppercase tracking-[0.14em] text-teal">
                {langById(codeLang).label} code will be included
              </span>
            </div>
          )}
          <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); send(input) }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input) } }}
              placeholder={`Ask anything about ${initialEnrollment.curriculum.title}…`}
              rows={1}
              className="flex max-h-28 min-h-[42px] flex-1 resize-none rounded-xl border border-rule bg-surface px-4 py-2.5 text-[0.9375rem] leading-relaxed text-ink transition-colors placeholder:text-ink-faint focus-visible:border-ink/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/6"
            />
            <button
              type="button"
              onClick={toggleListening}
              disabled={!voiceSupport.recognition}
              title={listening ? "Stop listening" : "Voice input"}
              className={cn(
                "inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border transition-colors",
                !voiceSupport.recognition ? "cursor-not-allowed border-rule bg-surface text-ink-faint opacity-40"
                  : listening ? "animate-pulse border-terracotta/40 bg-terracotta/8 text-terracotta"
                  : "border-rule bg-surface text-ink-faint hover:border-ink/30 hover:text-ink-soft",
              )}
            >
              <MicrophoneIcon className="h-4 w-4" />
            </button>
            <button
              type="submit"
              disabled={pending || !input.trim() || lessonInFlight !== null}
              className="inline-flex h-[42px] shrink-0 items-center gap-1.5 rounded-xl bg-ink px-5 text-[0.8125rem] font-medium text-paper transition-colors hover:bg-ink/88 disabled:opacity-35"
            >
              {pending ? "…" : "Send"}
              <span className="text-[0.75rem] text-paper/50">↵</span>
            </button>
          </form>
        </div>
      </div>

      {/* Code panel resize handle */}
      {codeOpen && (
        <ResizeHandle onMouseDown={(e) => codeResize.startDrag(e, -1)} />
      )}

      {/* ── Right code panel ── */}
      <div
        style={{ width: codeOpen ? codeResize.size : 0 }}
        className={cn(
          "flex flex-col overflow-hidden border-l border-rule bg-surface",
          !codeResize.dragging && "transition-[width] duration-300 ease-in-out",
        )}
      >
        <CodePanel
          codeLang={codeLang}
          onLangChange={(l) => setCodeLang(l)}
          code={codeText}
          onCodeChange={(text) => setCodeForLang(codeLang, text)}
          onClose={() => setCodeOpen(false)}
          onAskAI={(code) => {
            const ld = langById(codeLang)
            send(`Review my ${ld.label} code — is the logic correct? Any improvements?\n\`\`\`${ld.fence}\n${code}\n\`\`\``)
          }}
          pending={pending}
        />
      </div>
    </div>
  )
}

// ─── ChatHeader ───────────────────────────────────────────────────────────────

function ChatHeader({
  enrollment, groqLive, progressPct, lang, onLangChange, persona, onPersonaChange,
  speakReplies, onToggleSpeak, synthesisSupported,
  sessions, sessionIndex, sessionLoading, onSwitchSession, onNewSession,
  sidebarOpen, onToggleSidebar, codeOpen, onToggleCode,
}: {
  enrollment: EnrollmentDetail
  groqLive: boolean | null
  progressPct: number
  lang: TutorLanguage
  onLangChange: (l: TutorLanguage) => void
  persona: TutorPersona
  onPersonaChange: (p: TutorPersona) => void
  speakReplies: boolean
  onToggleSpeak: () => void
  synthesisSupported: boolean
  sessions: SessionSummary[]
  sessionIndex: number
  sessionLoading: boolean
  onSwitchSession: (index: number) => void
  onNewSession: () => void
  sidebarOpen: boolean
  onToggleSidebar: () => void
  codeOpen: boolean
  onToggleCode: () => void
}) {
  return (
    <header className="shrink-0 border-b border-rule-soft px-4 pb-2.5 pt-3">
      {/* Row 1 */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onToggleSidebar}
          title={sidebarOpen ? "Collapse syllabus" : "Open syllabus"}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-rule bg-paper text-ink-faint transition-colors hover:border-ink/20 hover:text-ink-soft"
        >
          <PanelLeftIcon className="h-3.5 w-3.5" open={sidebarOpen} />
        </button>

        <Link
          href="/learn"
          className="shrink-0 font-mono text-[0.5625rem] uppercase tracking-[0.18em] text-ink-faint transition-colors hover:text-ink-soft"
        >
          ←
        </Link>

        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-[1rem] font-medium leading-snug text-ink">
            {enrollment.curriculum.title}
          </h2>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden tabular font-mono text-[0.5625rem] text-ink-faint sm:inline">
            {progressPct}%
          </span>
          <span className={cn(
            "pill text-[0.5625rem]",
            groqLive === true ? "border-forest/40 bg-forest-soft text-forest"
              : groqLive === false ? "border-amber/30 bg-amber/8 text-amber"
              : "border-rule bg-surface text-ink-faint",
          )}>
            <span className={cn("h-1.5 w-1.5 rounded-full", groqLive === true ? "bg-forest" : groqLive === false ? "bg-amber" : "bg-rule")} />
            {groqLive === true ? "live" : groqLive === false ? "RAG" : "…"}
          </span>
          {lang !== "en" && (
            <span className="hidden items-center gap-1 rounded-full bg-teal-soft px-2 py-0.5 text-[0.5625rem] font-medium text-teal sm:inline-flex">
              {LANG_VERB[lang]}
            </span>
          )}
          <button
            type="button"
            onClick={onToggleCode}
            title={codeOpen ? "Close code editor" : "Open code editor"}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-lg border px-2.5 font-mono text-[0.5625rem] font-semibold uppercase tracking-[0.12em] transition-colors",
              codeOpen
                ? "border-teal/30 bg-teal-soft text-teal"
                : "border-rule bg-paper text-ink-faint hover:border-ink/20 hover:text-ink-soft",
            )}
          >
            <CodeBracketIcon className="h-3 w-3" />
            Code
          </button>
        </div>
      </div>

      {/* Row 2 — controls */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5 pt-2">
        <div className="flex items-center gap-0.5 rounded-full border border-rule bg-paper p-0.5">
          {(Object.keys(LANG_LABELS) as TutorLanguage[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => onLangChange(l)}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[0.6rem] font-medium transition-colors",
                lang === l ? "bg-ink text-paper" : "text-ink-faint hover:text-ink-soft",
              )}
            >
              {LANG_LABELS[l]}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onToggleSpeak}
          disabled={!synthesisSupported}
          className={cn(
            "inline-flex h-6 items-center gap-1 rounded-full border px-2.5 font-mono text-[0.55rem] font-semibold uppercase tracking-[0.14em] transition-colors",
            !synthesisSupported ? "cursor-not-allowed border-rule text-ink-faint opacity-40"
              : speakReplies ? "border-teal/30 bg-teal-soft text-teal"
              : "border-rule bg-paper text-ink-faint hover:text-ink-soft",
          )}
        >
          {speakReplies ? <SpeakerWaveIcon className="h-2.5 w-2.5" /> : <SpeakerOffIcon className="h-2.5 w-2.5" />}
          {speakReplies ? "on" : "off"}
        </button>
      </div>
    </header>
  )
}

// ─── CourseOverviewPanel ──────────────────────────────────────────────────────

function CourseOverviewPanel({ onPick, onTeach, curriculum, prompts, lessonInFlight }: {
  onPick: (p: string) => void
  onTeach: (i: number) => void
  curriculum: EnrollmentDetail["curriculum"]
  prompts: string[]
  lessonInFlight: number | null
}) {
  const totalMin = curriculum.syllabus.reduce((s, m) => s + m.durationMinutes, 0)
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: ease.outQuart }}
      className="mx-auto max-w-2xl space-y-8 py-6"
    >
      <div>
        <span className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-ink-faint">Course overview</span>
        <h2 className="display-md display-italic mt-2 text-balance text-teal">{curriculum.title}</h2>
        <p className="mt-3 max-w-lg text-[0.9375rem] leading-relaxed text-ink-muted">{curriculum.summary}</p>
        {totalMin > 0 && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-rule bg-surface-soft px-3 py-1">
            <span className="font-mono text-[0.6875rem] text-ink-faint">~{totalMin} min total</span>
            <span className="text-rule">·</span>
            <span className="font-mono text-[0.6875rem] text-ink-faint">{curriculum.syllabus.length} modules</span>
          </div>
        )}
      </div>

      {curriculum.syllabus.length > 0 && (
        <div>
          <div className="mb-3 font-mono text-[0.625rem] uppercase tracking-[0.22em] text-ink-faint">Tap any module to start</div>
          <div className="grid gap-3 sm:grid-cols-2">
            {curriculum.syllabus.map((m, i) => (
              <motion.button
                key={m.module}
                type="button"
                onClick={() => onTeach(i)}
                disabled={lessonInFlight !== null}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.04, ease: ease.outQuart }}
                className="group relative flex flex-col gap-2 overflow-hidden rounded-xl border border-rule bg-surface p-4 text-left transition-all duration-300 hover:border-teal/40 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="absolute inset-y-0 left-0 w-0.5 rounded-r-full bg-teal opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-[0.625rem] text-ink-faint">{String(i + 1).padStart(2, "0")}</span>
                  <span className="font-mono text-[0.625rem] text-ink-faint">{m.durationMinutes}m</span>
                </div>
                <div>
                  <span className="block font-display text-[0.9375rem] font-medium leading-snug text-ink">{m.module}</span>
                  <span className="mt-1 line-clamp-2 block text-[0.75rem] leading-relaxed text-ink-muted">{m.summary}</span>
                </div>
                <span className="mt-auto font-mono text-[0.625rem] uppercase tracking-[0.18em] text-ink-faint opacity-0 transition-opacity duration-300 group-hover:text-teal group-hover:opacity-100">
                  Teach this →
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2.5">
        <div className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-ink-faint">Or jump in with a question</div>
        <div className="grid gap-2">
          {prompts.map((p, i) => (
            <button
              key={p}
              type="button"
              onClick={() => onPick(p)}
              className="group flex items-baseline justify-between gap-4 rounded-xl border border-rule bg-surface-soft px-4 py-3 text-left text-[0.875rem] font-medium text-ink-soft transition-all hover:border-ink/20 hover:bg-surface hover:text-ink"
            >
              <span className="flex items-baseline gap-3">
                <span className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-ink-faint">{String(i + 1).padStart(2, "0")}</span>
                <span>{p}</span>
              </span>
              <span className="shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink">→</span>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// ─── MessageBubble ────────────────────────────────────────────────────────────

function MessageBubble({ message, onCheck, canCheck }: {
  message: ChatMessage
  onCheck: (i: number) => void
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
      transition={{ duration: 0.4, ease: ease.outQuart }}
      className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && (
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-teal-soft font-display text-[0.75rem] font-medium text-teal">
          T
        </div>
      )}
      <div className={cn("max-w-[82%] space-y-2", isUser && "items-end")}>
        {isLesson && message.meta?.kind === "lesson" && (
          <div className="flex items-center gap-2 px-1">
            <span className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-teal">
              Lesson · Module {message.meta.moduleIndex + 1}
            </span>
            <span className="text-[0.625rem] text-rule">·</span>
            <span className="font-display text-[0.75rem] font-medium text-ink-soft">{message.meta.module}</span>
          </div>
        )}
        {isCheckResult && message.meta?.kind === "check" && (
          <div className={cn("flex items-center gap-2 px-1 font-mono text-[0.625rem] uppercase tracking-[0.2em]", message.meta.correct ? "text-forest" : "text-terracotta")}>
            {message.meta.correct ? "✓ Correct" : "✗ Not yet"} · Module {message.meta.moduleIndex + 1}
          </div>
        )}
        <div className={cn(
          "px-5 py-4 text-[0.9375rem] leading-relaxed",
          isUser ? "rounded-2xl bg-ink text-paper" : "rounded-xl border border-rule bg-surface-soft text-ink",
        )}>
          <FormattedContent text={message.content} />
        </div>
        {!isUser && message.citations && message.citations.length > 0 && (
          <Citations citations={message.citations} />
        )}
        {isLesson && message.meta?.kind === "lesson" && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => { if (message.meta?.kind === "lesson") onCheck(message.meta.moduleIndex) }}
              disabled={!canCheck}
              className="inline-flex items-center gap-2 rounded-xl border border-teal/30 bg-teal-tint px-4 py-1.5 text-[0.8125rem] font-medium text-teal transition-colors hover:bg-teal-soft disabled:cursor-not-allowed disabled:opacity-40"
            >
              Check yourself →
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── PendingCheckCard ─────────────────────────────────────────────────────────

function PendingCheckCard({ question, submitting, onSubmit, onCancel }: {
  question: CheckQuestion; submitting: boolean; onSubmit: (i: number) => void; onCancel: () => void
}) {
  const [picked, setPicked] = useState<number | null>(null)
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: ease.outQuart }} className="flex gap-3">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-rule bg-surface font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink-faint">?</div>
      <div className="max-w-[82%] flex-1 space-y-4 rounded-xl border border-rule/60 bg-surface-soft p-6">
        <div>
          <div className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-ink-faint">
            Check yourself · Module {question.moduleIndex + 1} · {question.module}
          </div>
          <p className="mt-3 font-display text-[1.125rem] font-medium leading-snug text-ink">{question.prompt}</p>
        </div>
        <ul className="space-y-2">
          {question.choices.map((c, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => setPicked(i)}
                disabled={submitting}
                className={cn(
                  "flex w-full items-baseline gap-3 rounded-xl border px-4 py-2.5 text-left text-[0.875rem] transition-all duration-200",
                  picked === i ? "border-ink bg-surface text-ink" : "border-rule bg-surface text-ink-soft hover:border-ink/30 hover:text-ink",
                  submitting && "cursor-not-allowed opacity-50",
                )}
              >
                <span className="shrink-0 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-ink-faint">{String.fromCharCode(65 + i)}</span>
                <span>{c}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t border-rule-soft pt-3">
          <button type="button" onClick={onCancel} disabled={submitting} className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-faint transition-colors hover:text-ink">cancel</button>
          <button
            type="button"
            onClick={() => picked !== null && onSubmit(picked)}
            disabled={picked === null || submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-ink px-6 py-2 text-[0.8125rem] font-medium text-paper transition-colors hover:bg-ink/88 disabled:opacity-35"
          >
            {submitting ? "Checking…" : "Submit answer"}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── CodePanel ────────────────────────────────────────────────────────────────

function CodePanel({ codeLang, onLangChange, code, onCodeChange, onClose, onAskAI, pending }: {
  codeLang: CodeLang
  onLangChange: (l: CodeLang) => void
  code: string
  onCodeChange: (text: string) => void
  onClose: () => void
  onAskAI: (code: string) => void
  pending: boolean
}) {
  const [copied, setCopied] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleLangChange(next: CodeLang) {
    onLangChange(next)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  function copyCode() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  const ld = langById(codeLang)
  const hasCode = code.trim() !== "" && code.trim() !== ld.starter.trim()

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-rule bg-surface-soft px-4 py-2.5">
        <LangDropdown value={codeLang} onChange={handleLangChange} />

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={copyCode}
            disabled={!code.trim()}
            className="inline-flex h-6 items-center gap-1 rounded-lg border border-rule bg-paper px-2.5 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-ink-faint transition-colors hover:text-ink-soft disabled:opacity-40"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Close editor"
            className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-rule bg-paper text-ink-faint transition-colors hover:text-ink-soft"
          >
            <CloseIcon className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Editor */}
      <textarea
        ref={textareaRef}
        value={code}
        onChange={(e) => onCodeChange(e.target.value)}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        className="flex-1 resize-none bg-paper-deep px-4 py-4 font-mono text-[0.8125rem] leading-relaxed text-ink-soft outline-none"
        placeholder={`Write your ${ld.label} code here…`}
      />

      {/* Footer */}
      <div className="shrink-0 space-y-2.5 border-t border-rule bg-surface-soft px-4 py-3">
        <p className="font-mono text-[0.5625rem] text-ink-faint">
          <span className="uppercase tracking-[0.12em]">Run:</span>{" "}
          <span className="text-ink-soft">{ld.runHint}</span>
        </p>
        <button
          type="button"
          onClick={() => onAskAI(code)}
          disabled={!hasCode || pending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-2.5 text-[0.8125rem] font-medium text-paper transition-colors hover:bg-teal disabled:opacity-35"
        >
          <SparkleIcon className="h-3.5 w-3.5" />
          {pending ? "Waiting for reply…" : "Ask AI to review"}
        </button>
      </div>
    </div>
  )
}

// ─── CurriculumSidebar ────────────────────────────────────────────────────────

function CurriculumSidebar({ enrollment, progressPct, lessonedModules, touchedTopics, lessonInFlight, onTeach }: {
  enrollment: EnrollmentDetail; progressPct: number; lessonedModules: Set<number>
  touchedTopics: Set<string>; lessonInFlight: number | null; onTeach: (i: number) => void
}) {
  const progress = Math.min(100, Math.max(0, progressPct))
  const done = lessonedModules.size
  const total = enrollment.curriculum.syllabus.length

  return (
    <aside className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-rule px-4 py-4">
        <p className="font-mono text-[0.5625rem] uppercase tracking-[0.2em] text-ink-faint">{total} modules</p>
        <h3 className="mt-1 font-display text-[0.9375rem] font-medium leading-snug text-ink">{enrollment.curriculum.title}</h3>
        <div className="mt-3">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="font-mono text-[0.5625rem] uppercase tracking-[0.18em] text-ink-faint">Progress</span>
            <span className="tabular font-mono text-[0.5625rem] text-ink-faint">{done}/{total}</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-rule/50">
            <motion.div className="h-full rounded-full bg-teal" initial={false} animate={{ width: `${progress}%` }} transition={{ duration: 0.7, ease: ease.outQuart }} />
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {enrollment.curriculum.syllabus.length > 0 ? (
          <ol className="py-1">
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
                      "group flex w-full items-center gap-3 px-4 py-2.5 text-left transition-all duration-150",
                      lessoned ? "bg-teal-tint/40" : touched ? "bg-surface-soft/60" : "hover:bg-surface-soft",
                      lessonInFlight !== null && !loading && "cursor-not-allowed opacity-35",
                    )}
                  >
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                      {lessoned
                        ? <CheckIcon className="h-3.5 w-3.5 text-teal" />
                        : loading
                        ? <span className="font-mono text-[0.5625rem] text-ink-faint">…</span>
                        : <span className="tabular font-mono text-[0.5625rem] text-ink-faint/60">{String(i + 1).padStart(2, "0")}</span>}
                    </div>
                    <span className={cn("min-w-0 flex-1 truncate font-display text-[0.8rem] leading-snug", lessoned ? "text-ink" : "text-ink-soft group-hover:text-ink")}>
                      {m.module}
                    </span>
                    <span className="shrink-0 tabular font-mono text-[0.5625rem] text-ink-faint/60">{m.durationMinutes}m</span>
                  </button>
                </li>
              )
            })}
          </ol>
        ) : (
          <ul className="space-y-1 p-4">
            {enrollment.curriculum.topics.map((t) => <li key={t} className="text-[0.8125rem] text-ink-muted">{t}</li>)}
          </ul>
        )}
      </div>

      <div className="shrink-0 border-t border-rule p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[0.5625rem] uppercase tracking-[0.18em] text-ink-faint">Earn when ready</p>
            <p className="mt-0.5 font-display text-[0.9375rem] font-medium text-ink">
              <span className="text-amber">₹</span>{enrollment.bounty.rewardInr.toLocaleString("en-IN")}
            </p>
          </div>
          <Link
            href={`/learn/${enrollment.bountyId}/quiz`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2 text-[0.75rem] font-medium text-paper transition-all hover:bg-teal"
          >
            Take quiz <span className="text-paper/60">→</span>
          </Link>
        </div>
      </div>
    </aside>
  )
}

// ─── Shared small components ──────────────────────────────────────────────────

// Renders the tutor's markdown-ish output. Handles ```code fences```,
// **bold**, *italic*, `inline code`, --- horizontal rules, and numbered/
// bulleted lists. Strips [^citation-id] markers since those are surfaced
// separately by the Citations pills below the message.
function FormattedContent({ text }: { text: string }) {
  // 1) Split out code fences so we don't apply inline markdown inside them.
  const fenced = text.split(/(```[\s\S]*?```)/g)
  return (
    <>
      {fenced.map((chunk, i) => {
        if (chunk.startsWith("```")) {
          const inner = chunk.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "")
          return (
            <pre
              key={i}
              className="my-3 overflow-x-auto rounded-lg border border-rule bg-paper-deep p-4 font-mono text-[0.75rem] leading-relaxed text-ink-soft"
            >
              <code>{inner}</code>
            </pre>
          )
        }
        return <MarkdownBlocks key={i} text={chunk} />
      })}
    </>
  )
}

// Strip citation markers like [^abc123-def] / [^source] before display.
// The Citations pills below the message already render these.
function stripInlineCitations(s: string): string {
  return s.replace(/\[\^[^\]]+\]/g, "").replace(/\s{2,}/g, " ")
}

function MarkdownBlocks({ text }: { text: string }) {
  const cleaned = stripInlineCitations(text)
  // Split into blocks by blank lines; each block becomes its own paragraph/list/hr.
  const blocks = cleaned.split(/\n{2,}/)
  return (
    <>
      {blocks.map((block, i) => {
        const trimmed = block.trim()
        if (!trimmed) return null

        // Horizontal rule — three or more dashes on their own line.
        if (/^---+$/.test(trimmed)) {
          return <hr key={i} className="my-3 border-t border-rule" />
        }

        // Unordered list: lines starting with "- " or "* ".
        if (/^([-*])\s+/.test(trimmed.split("\n")[0] ?? "")) {
          const items = trimmed
            .split("\n")
            .map((l) => l.replace(/^([-*])\s+/, ""))
            .filter(Boolean)
          return (
            <ul
              key={i}
              className="my-2 list-disc space-y-1 pl-5 text-[0.9375rem] leading-relaxed"
            >
              {items.map((it, j) => (
                <li key={j}>
                  <InlineMarkdown text={it} />
                </li>
              ))}
            </ul>
          )
        }

        // Ordered list: lines starting with "1. ", "2. ", etc.
        if (/^\d+\.\s+/.test(trimmed.split("\n")[0] ?? "")) {
          const items = trimmed
            .split("\n")
            .map((l) => l.replace(/^\d+\.\s+/, ""))
            .filter(Boolean)
          return (
            <ol
              key={i}
              className="my-2 list-decimal space-y-1 pl-5 text-[0.9375rem] leading-relaxed"
            >
              {items.map((it, j) => (
                <li key={j}>
                  <InlineMarkdown text={it} />
                </li>
              ))}
            </ol>
          )
        }

        // Heading via #/## (rarely emitted by our prompt, but support it).
        const h2 = trimmed.match(/^##\s+(.+)$/)
        if (h2) {
          return (
            <h4
              key={i}
              className="mt-3 font-display text-[1rem] font-medium text-ink"
            >
              <InlineMarkdown text={h2[1] ?? ""} />
            </h4>
          )
        }
        const h1 = trimmed.match(/^#\s+(.+)$/)
        if (h1) {
          return (
            <h3
              key={i}
              className="mt-3 font-display text-[1.0625rem] font-medium text-ink"
            >
              <InlineMarkdown text={h1[1] ?? ""} />
            </h3>
          )
        }

        return (
          <p
            key={i}
            className="whitespace-pre-wrap text-[0.9375rem] leading-relaxed [&:not(:first-child)]:mt-2"
          >
            <InlineMarkdown text={trimmed} />
          </p>
        )
      })}
    </>
  )
}

// Inline markdown — **bold**, *italic*, _italic_, `code`. Process in order:
// inline-code first (so its contents aren't re-parsed), then bold, then italic.
function InlineMarkdown({ text }: { text: string }) {
  // Tokenize into a flat array preserving the original text.
  type Token =
    | { type: "text"; value: string }
    | { type: "bold"; value: string }
    | { type: "italic"; value: string }
    | { type: "code"; value: string }

  const tokens: Token[] = [{ type: "text", value: text }]

  const apply = (
    re: RegExp,
    asType: Token["type"],
  ): void => {
    const next: Token[] = []
    for (const t of tokens) {
      if (t.type !== "text") {
        next.push(t)
        continue
      }
      let lastIndex = 0
      let m: RegExpExecArray | null
      re.lastIndex = 0
      while ((m = re.exec(t.value)) !== null) {
        if (m.index > lastIndex) {
          next.push({ type: "text", value: t.value.slice(lastIndex, m.index) })
        }
        next.push({ type: asType, value: m[1] ?? "" })
        lastIndex = m.index + m[0].length
      }
      if (lastIndex < t.value.length) {
        next.push({ type: "text", value: t.value.slice(lastIndex) })
      }
    }
    tokens.splice(0, tokens.length, ...next)
  }

  apply(/`([^`]+)`/g, "code")
  apply(/\*\*([^*]+)\*\*/g, "bold")
  apply(/(?:^|(?<=\s))[*_]([^*_\n]+)[*_](?=\s|$|[.,;:!?)])/g, "italic")

  return (
    <>
      {tokens.map((t, i) => {
        switch (t.type) {
          case "bold":
            return (
              <strong key={i} className="font-medium text-ink">
                {t.value}
              </strong>
            )
          case "italic":
            return (
              <em key={i} className="italic">
                {t.value}
              </em>
            )
          case "code":
            return (
              <code
                key={i}
                className="rounded bg-paper-deep px-1.5 py-0.5 font-mono text-[0.8125rem] text-ink"
              >
                {t.value}
              </code>
            )
          default:
            return <span key={i}>{t.value}</span>
        }
      })}
    </>
  )
}

function Citations({ citations }: { citations: NonNullable<ChatMessage["citations"]> }) {
  return (
    <div className="flex flex-wrap gap-1.5 pl-1">
      {citations.map((c) => (
        <span key={c.chunkId} title={`relevance ${c.score.toFixed(3)}`} className="inline-flex items-center gap-1.5 rounded-full border border-rule bg-surface px-2.5 py-0.5 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-ink-faint">
          <span className="text-teal">§</span>{c.source.split("#").pop() ?? c.source}
        </span>
      ))}
    </div>
  )
}

function TypingBubble({ label }: { label?: string }) {
  return (
    <div className="flex gap-3">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-teal-soft font-display text-[0.75rem] font-medium text-teal">T</div>
      <div className="rounded-xl border border-rule bg-surface-soft px-5 py-3">
        <span className="inline-flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5">
            <Dot delay="0ms" /><Dot delay="120ms" /><Dot delay="240ms" />
          </span>
          {label && <span className="font-mono text-[0.6875rem] text-ink-faint">{label}</span>}
        </span>
      </div>
    </div>
  )
}

function Dot({ delay }: { delay: string }) {
  return <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-faint" style={{ animationDelay: delay }} />
}

// ─── Voice helpers ─────────────────────────────────────────────────────────────

function stripMarkdown(s: string): string {
  return s
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\[\^[^\]]+\]/g, "")
    .replace(/^---+$/gm, "")
    .replace(/[*_#>`~]/g, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\s+/g, " ")
    .trim()
}

type SpeechRecognitionResultLike = { 0?: { transcript: string } }
type SpeechRecognitionEventLike = { results: ArrayLike<SpeechRecognitionResultLike> }
type SpeechRecognitionLike = {
  lang: string; continuous: boolean; interimResults: boolean
  onresult: (e: SpeechRecognitionEventLike) => void
  onerror: (e?: { error?: string }) => void; onend: () => void
  start(): void; stop(): void
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

// ─── Icons ─────────────────────────────────────────────────────────────────────

function PanelLeftIcon({ className, open }: { className?: string; open: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className={className} aria-hidden>
      <rect x="1" y="1" width="14" height="14" rx="2" />
      <line x1="6" y1="1" x2="6" y2="15" />
      {open && <line x1="3.5" y1="5" x2="3.5" y2="11" />}
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden><path d="M20 6 9 17l-5-5" /></svg>
}

function PlusIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden><path d="M12 5v14M5 12h14" /></svg>
}

function CloseIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden><path d="M18 6 6 18M6 6l12 12" /></svg>
}

function CodeBracketIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden><path d="M8 9l-3 3 3 3M16 9l3 3-3 3M14 4l-4 16" /></svg>
}

function ChevronDownIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden><path d="m6 9 6 6 6-6" /></svg>
}

function MicrophoneIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" /><path d="M9 21h6" /></svg>
}

function SpeakerWaveIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden><path d="M11 5 6 9H3v6h3l5 4z" /><path d="M16 8a5 5 0 0 1 0 8" /><path d="M19 5a9 9 0 0 1 0 14" /></svg>
}

function SpeakerOffIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden><path d="M11 5 6 9H3v6h3l5 4z" /><path d="M16 9l5 5" /><path d="M21 9l-5 5" /></svg>
}

function SparkleIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" /><circle cx="12" cy="12" r="3" /></svg>
}
