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
import {
  buildLearningPath,
  loadNotes,
  masteryProgress,
  rememberPosition,
  saveNotes,
  type Note,
} from "@/lib/learning-path"

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
  autoTeachModuleIndex = null,
}: {
  enrollment: EnrollmentDetail
  initialMessages: ChatMessage[]
  initialSessions?: SessionSummary[]
  initialSessionIndex?: number
  autoTeachModuleIndex?: number | null
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
  const [notesOpen, setNotesOpen] = useState(false)
  const [notes, setNotes] = useState<Note[]>([])
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

  // Tutor message ids that just arrived this session and should type in
  // (typewriter). Ids loaded from history are not in here, so they render
  // instantly instead of replaying on every session switch.
  const streamRef = useRef<Set<string>>(new Set())
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

  // ── Notes (localStorage, per enrollment) ──
  useEffect(() => {
    setNotes(loadNotes(initialEnrollment.id))
  }, [initialEnrollment.id])
  const addNote = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setNotes((prev) => {
      const next: Note[] = [
        ...prev,
        {
          id: `n-${Date.now()}`,
          text: trimmed,
          moduleIndex: sessionIndex > 0 ? sessionIndex - 1 : null,
          createdAt: new Date().toISOString(),
        },
      ]
      saveNotes(initialEnrollment.id, next)
      return next
    })
  }
  const removeNote = (id: string) => {
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== id)
      saveNotes(initialEnrollment.id, next)
      return next
    })
  }

  // ── Voice support ──
  useEffect(() => {
    if (typeof window === "undefined") return
    setVoiceSupport({
      recognition: getSpeechRecognitionCtor() !== null,
      synthesis: typeof window.speechSynthesis !== "undefined",
    })
  }, [])

  // ── Auto-teach a module if requested by the parent overview page ──
  const autoTaughtRef = useRef(false)
  useEffect(() => {
    if (autoTaughtRef.current) return
    if (autoTeachModuleIndex === null || autoTeachModuleIndex === undefined) return
    const idx = autoTeachModuleIndex
    const syllabus = initialEnrollment.curriculum.syllabus
    if (idx < 0 || idx >= syllabus.length) return
    autoTaughtRef.current = true
    teachModule(idx)
    // teachModule is stable for this purpose; deps intentionally narrow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTeachModuleIndex])

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
  // Modules the student has *mastered* (3 correct check answers in a row).
  // Seeded from server progress fetches; the sidebar uses this to render the
  // ✓ checkmarks. A taught-but-not-mastered module is shown as "touched".
  const [masteredModules, setMasteredModules] = useState<Set<number>>(new Set())
  useEffect(() => {
    let cancelled = false
    apiFetch<{ coveredModuleIndexes: number[]; progressPct: number }>(
      `/tutor/progress/${initialEnrollment.id}`,
    )
      .then((p) => {
        if (cancelled) return
        setMasteredModules(new Set(p.coveredModuleIndexes))
        setProgressPct(p.progressPct)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [initialEnrollment.id])

  const touchedTopics = useMemo(() => {
    const set = new Set<string>()
    for (const m of messages)
      for (const c of m.citations ?? []) {
        const t = c.source.split("#").pop()
        if (t) set.add(t)
      }
    return set
  }, [messages])

  // Modules the student has opened at least once (a lesson exists in their
  // chat history for that module). Module N lives in sessionIndex N + 1,
  // so any session with idx >= 1 and at least one message means the module
  // was viewed. Seeded from the sessions list on mount and updated locally
  // whenever the student opens / teaches a new module.
  const viewedModules = useMemo(() => {
    const set = new Set<number>()
    for (const s of sessions) {
      if (s.sessionIndex >= 1 && s.messageCount > 0) {
        set.add(s.sessionIndex - 1)
      }
    }
    // The currently active module's session may have just received its first
    // message before sessions was refreshed; include it from local messages.
    for (const m of messages) {
      if (m.meta?.kind === "lesson") set.add(m.meta.moduleIndex)
    }
    return set
  }, [sessions, messages])

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
      streamRef.current.add(res.tutor.id)
      setMessages((prev) => [...prev.filter((m) => m.id !== optimistic.id), res.user, res.tutor])
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      setError(err instanceof ApiClientError ? err.message : "Could not reach the tutor")
    } finally {
      setPending(false)
      inputRef.current?.focus()
    }
  }

  // Each module owns its own chat. We map moduleIndex N → sessionIndex N + 1.
  // sessionIndex 0 stays reserved for free-form/general chat across the whole
  // course, so it stays out of the per-module numbering.
  const sessionIndexForModule = (moduleIndex: number) => moduleIndex + 1

  async function teachModule(moduleIndex: number, opts?: { force?: boolean }) {
    if (lessonInFlight !== null || pending) return
    const target = sessionIndexForModule(moduleIndex)
    rememberPosition(initialEnrollment.id, moduleIndex)
    setError(null); setPendingCheck(null); setLessonInFlight(moduleIndex)
    try {
      // If we are not already in this module's chat, switch to it first.
      // Load any existing history for that session so the user sees prior
      // turns for this module, not a blank slate that hides earlier lessons.
      let history: ChatMessage[] = messages
      if (target !== sessionIndex) {
        setSessionLoading(true)
        try {
          const hist = await apiFetch<{ messages: ChatMessage[] }>(
            `/tutor/history/${initialEnrollment.id}?session=${target}`,
          )
          history = hist.messages
          setMessages(hist.messages)
        } catch {
          history = []
          setMessages([])
        } finally {
          setSessionLoading(false)
        }
        setSessionIndex(target)
        setSessions((prev) =>
          prev.some((s) => s.sessionIndex === target)
            ? prev
            : [...prev, { sessionIndex: target, messageCount: 0, startedAt: new Date().toISOString() }],
        )
      }

      // Don't regenerate a lesson if one already exists in this module's
      // chat. The student is just revisiting. Pass { force: true } to
      // override (e.g. a future "re-teach this module" button).
      const alreadyTaught = history.some(
        (m) => m.meta?.kind === "lesson" && m.meta.moduleIndex === moduleIndex,
      )
      if (alreadyTaught && !opts?.force) return

      const res = await apiFetch<{ tutor: ChatMessage }>("/tutor/lesson", {
        method: "POST",
        json: { enrollmentId: initialEnrollment.id, moduleIndex, lang: tutorLang, sessionIndex: target },
      })
      streamRef.current.add(res.tutor.id)
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
      const res = await apiFetch<{
        correct: boolean
        correctIndex: number
        message: ChatMessage
        streak?: number
        threshold?: number
        mastered?: boolean
        justMastered?: boolean
      }>(
        "/tutor/check/submit",
        { method: "POST", json: { enrollmentId: initialEnrollment.id, moduleIndex: pendingCheck.question.moduleIndex, questionId: pendingCheck.question.questionId, answeredIndex, sessionIndex } },
      )
      streamRef.current.add(res.message.id)
      setMessages((prev) => [...prev, res.message])
      setPendingCheck(null)
      // After every check answer, refresh progress + mastered set so the
      // sidebar checkmarks and the % indicator stay truthful.
      apiFetch<{ coveredModuleIndexes: number[]; progressPct: number }>(
        `/tutor/progress/${initialEnrollment.id}`,
      )
        .then((p) => {
          setMasteredModules(new Set(p.coveredModuleIndexes))
          setProgressPct(p.progressPct)
        })
        .catch(() => {})
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

  const [confirmClear, setConfirmClear] = useState(false)
  const [clearing, setClearing] = useState(false)
  async function clearContext() {
    if (clearing) return
    setClearing(true); setError(null)
    try {
      await apiFetch<{ deleted: number }>("/tutor/session/clear", {
        method: "POST",
        json: { enrollmentId: initialEnrollment.id, sessionIndex },
      })
      setMessages([]); setPendingCheck(null)
      setSessions((prev) => prev.map((s) =>
        s.sessionIndex === sessionIndex ? { ...s, messageCount: 0, startedAt: new Date().toISOString() } : s,
      ))
      setConfirmClear(false)
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not clear this chat")
    } finally {
      setClearing(false)
    }
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
          lessonedModules={masteredModules}
          viewedModules={viewedModules}
          activeModuleIndex={sessionIndex > 0 ? sessionIndex - 1 : null}
          touchedTopics={touchedTopics}
          lessonInFlight={lessonInFlight}
          onTeach={teachModule}
          onOpenNotes={() => setNotesOpen(true)}
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
          onClearChat={() => setConfirmClear(true)}
          canClearChat={messages.length > 0 && !clearing}
        />

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
          {isFirstTurn && (lessonInFlight !== null || sessionLoading) ? (
            <ModuleSwitchingLoader
              moduleIndex={lessonInFlight}
              curriculum={initialEnrollment.curriculum}
            />
          ) : isFirstTurn ? (
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
                    onPrompt={send}
                    stream={streamRef.current.has(m.id)}
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
            send(`Review my ${ld.label} code. Is the logic correct? Any improvements?\n\`\`\`${ld.fence}\n${code}\n\`\`\``)
          }}
          pending={pending}
        />
      </div>

      {confirmClear && (
        <ConfirmClearModal
          onCancel={() => (clearing ? null : setConfirmClear(false))}
          onConfirm={clearContext}
          working={clearing}
        />
      )}

      <NotesPanel
        open={notesOpen}
        notes={notes}
        syllabus={initialEnrollment.curriculum.syllabus}
        onClose={() => setNotesOpen(false)}
        onAdd={addNote}
        onRemove={removeNote}
      />
    </div>
  )
}

function NotesPanel({
  open,
  notes,
  syllabus,
  onClose,
  onAdd,
  onRemove,
}: {
  open: boolean
  notes: Note[]
  syllabus: { module: string }[]
  onClose: () => void
  onAdd: (text: string) => void
  onRemove: (id: string) => void
}) {
  const [draft, setDraft] = useState("")

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
          <motion.div
            className="relative z-10 flex h-full w-[min(420px,90vw)] flex-col border-l border-rule bg-surface"
            initial={{ x: 40 }}
            animate={{ x: 0 }}
            exit={{ x: 40 }}
            transition={{ duration: 0.24, ease: ease.outQuart }}
          >
            <div className="flex items-center justify-between border-b border-rule px-5 py-4">
              <div>
                <h3 className="font-display text-[1.0625rem] font-medium text-ink">My notes</h3>
                <p className="text-[0.75rem] text-ink-muted">{notes.length} saved · stays on this device</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close notes"
                className="grid h-7 w-7 place-items-center rounded-full border border-rule text-ink-faint transition-colors hover:border-ink/30 hover:text-ink"
              >
                ×
              </button>
            </div>

            <div className="border-b border-rule p-4">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Jot something down, or highlight tutor text and click Save selection."
                rows={3}
                className="w-full resize-none rounded-lg border border-rule bg-paper px-3 py-2 text-[0.875rem] text-ink placeholder:text-ink-faint focus:border-ink/30 focus:outline-none"
              />
              <div className="mt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    const sel = window.getSelection?.()?.toString() ?? ""
                    if (sel.trim()) { onAdd(sel); }
                  }}
                  className="text-[0.75rem] text-ink-faint underline-offset-4 transition-colors hover:text-ink hover:underline"
                >
                  Save selection
                </button>
                <button
                  type="button"
                  onClick={() => { onAdd(draft); setDraft("") }}
                  disabled={!draft.trim()}
                  className="rounded-full bg-ink px-4 py-1.5 text-[0.8125rem] font-medium text-paper transition-colors hover:bg-ink/85 disabled:opacity-40"
                >
                  Add note
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {notes.length === 0 ? (
                <p className="mt-8 text-center text-[0.875rem] text-ink-faint">
                  No notes yet. Anything you save shows up here.
                </p>
              ) : (
                <ul className="space-y-2">
                  {[...notes].reverse().map((n) => (
                    <li
                      key={n.id}
                      className="group rounded-lg border border-rule bg-paper p-3"
                    >
                      <p className="whitespace-pre-wrap text-[0.875rem] leading-relaxed text-ink">{n.text}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="font-mono text-[0.625rem] text-ink-faint">
                          {n.moduleIndex !== null && syllabus[n.moduleIndex]
                            ? syllabus[n.moduleIndex].module
                            : "General"}
                        </span>
                        <button
                          type="button"
                          onClick={() => onRemove(n.id)}
                          className="text-[0.6875rem] text-ink-faint opacity-0 transition-opacity hover:text-terracotta group-hover:opacity-100"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function ConfirmClearModal({
  onCancel,
  onConfirm,
  working,
}: {
  onCancel: () => void
  onConfirm: () => void
  working: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 px-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-rule bg-paper p-6 shadow-xl"
      >
        <div className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-ink-faint">
          Reset this chat
        </div>
        <h3 className="mt-2 font-display text-[1.125rem] font-medium text-ink">
          Clear all messages in this chat?
        </h3>
        <p className="mt-2 text-[0.875rem] leading-relaxed text-ink-muted">
          This wipes the conversation history for the current session, so the tutor starts fresh.
          Your progress on completed modules stays. This cannot be undone.
        </p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={working}
            className="inline-flex items-center rounded-xl border border-rule bg-surface px-4 py-2 text-[0.8125rem] font-medium text-ink-soft transition-colors hover:border-ink/20 hover:text-ink disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={working}
            className="inline-flex items-center rounded-xl bg-terracotta px-4 py-2 text-[0.8125rem] font-medium text-paper transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {working ? "Clearing…" : "Clear chat"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── ChatHeader ───────────────────────────────────────────────────────────────

function ChatHeader({
  enrollment, progressPct, lang, onLangChange, persona, onPersonaChange,
  speakReplies, onToggleSpeak, synthesisSupported,
  sessions, sessionIndex, sessionLoading, onSwitchSession, onNewSession,
  sidebarOpen, onToggleSidebar, codeOpen, onToggleCode,
  onClearChat, canClearChat,
}: {
  enrollment: EnrollmentDetail
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
  onClearChat: () => void
  canClearChat: boolean
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
          title="Back to bounties"
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-rule bg-paper px-3 text-[0.8125rem] font-medium text-ink-soft transition-colors hover:border-ink/30 hover:text-ink"
        >
          <span className="text-[1rem] leading-none">←</span>
          <span className="hidden sm:inline">Back</span>
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

        <button
          type="button"
          onClick={onClearChat}
          disabled={!canClearChat}
          title="Clear this chat"
          className={cn(
            "ml-auto inline-flex h-6 items-center gap-1 rounded-full border px-2.5 font-mono text-[0.55rem] font-semibold uppercase tracking-[0.14em] transition-colors",
            canClearChat
              ? "border-rule bg-paper text-ink-faint hover:border-terracotta/40 hover:text-terracotta"
              : "cursor-not-allowed border-rule text-ink-faint opacity-40",
          )}
        >
          Clear chat
        </button>
      </div>
    </header>
  )
}

// ─── ModuleSwitchingLoader ────────────────────────────────────────────────────
// Shown when we are switching into a module's chat and the lesson has not yet
// arrived. Prevents the course-overview panel from flashing back in during the
// brief window where messages.length === 0 and a teach call is in flight.

function ModuleSwitchingLoader({
  moduleIndex,
  curriculum,
}: {
  moduleIndex: number | null
  curriculum: EnrollmentDetail["curriculum"]
}) {
  const mod = moduleIndex !== null ? curriculum.syllabus[moduleIndex] : null
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: ease.outQuart }}
      className="mx-auto flex max-w-2xl flex-col items-start gap-4 py-10"
    >
      <span className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-teal">
        {moduleIndex !== null ? `Preparing module ${moduleIndex + 1}` : "Loading chat"}
      </span>
      {mod && (
        <h2 className="display-md display-italic text-balance text-ink">{mod.module}</h2>
      )}
      <div className="flex items-center gap-2 pt-1">
        <Dot delay="0ms" /><Dot delay="120ms" /><Dot delay="240ms" />
        <span className="ml-2 font-mono text-[0.6875rem] text-ink-faint">
          the tutor is writing your lesson…
        </span>
      </div>
      <div className="mt-4 w-full space-y-3">
        <div className="h-3 w-2/3 animate-pulse rounded-full bg-rule/40" />
        <div className="h-3 w-full animate-pulse rounded-full bg-rule/30" />
        <div className="h-3 w-5/6 animate-pulse rounded-full bg-rule/30" />
        <div className="h-3 w-4/6 animate-pulse rounded-full bg-rule/20" />
      </div>
    </motion.div>
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

const PRESET_PROMPTS: { label: string; prompt: string }[] = [
  { label: "Explain it simpler", prompt: "Explain that again, but simpler — like I'm new to this." },
  { label: "Give an example", prompt: "Give me a concrete, worked example of this." },
  { label: "Why does it matter?", prompt: "Why does this matter? Where would I actually use it?" },
  { label: "Common mistakes", prompt: "What do people most often get wrong about this?" },
  { label: "Quiz me", prompt: "Ask me a question to test if I understood this." },
]

// Reveals tutor text progressively (typewriter) the first time a message
// arrives, then settles into fully formatted markdown. History messages
// pass stream={false} so they render instantly.
function StreamedText({ text, stream }: { text: string; stream: boolean }) {
  const [count, setCount] = useState(stream ? 0 : text.length)

  useEffect(() => {
    if (!stream) { setCount(text.length); return }
    const total = text.length
    // Reveal in ~1.6s for short replies, capped so long lessons don't crawl.
    const step = Math.max(3, Math.round(total / 110))
    let i = 0
    const id = window.setInterval(() => {
      i += step
      if (i >= total) {
        setCount(total)
        window.clearInterval(id)
      } else {
        setCount(i)
      }
    }, 16)
    return () => window.clearInterval(id)
    // Stream decision is fixed at mount; text is stable for a given message.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const done = count >= text.length
  return (
    <>
      <FormattedContent text={text.slice(0, count)} />
      {!done && (
        <span className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[0.15em] animate-pulse bg-ink/50" />
      )}
    </>
  )
}

function MessageBubble({ message, onCheck, onPrompt, stream, canCheck }: {
  message: ChatMessage
  onCheck: (i: number) => void
  onPrompt: (text: string) => void
  stream: boolean
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
      <div className={cn(isLesson ? "max-w-[92%] space-y-3" : "max-w-[82%] space-y-2", isUser && "items-end")}>
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
          isUser
            ? "rounded-2xl bg-ink px-5 py-4 text-[0.9375rem] leading-relaxed text-paper"
            : isLesson
            ? "rounded-2xl border border-rule bg-paper px-7 py-6 text-[0.9375rem] leading-[1.75] text-ink shadow-[0_1px_0_0_hsl(var(--rule))]"
            : "rounded-xl border border-rule bg-surface-soft px-5 py-4 text-[0.9375rem] leading-relaxed text-ink",
        )}>
          {isUser ? (
            <FormattedContent text={message.content} />
          ) : (
            <StreamedText text={message.content} stream={stream} />
          )}
        </div>
        {isLesson && message.meta?.kind === "lesson" && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {PRESET_PROMPTS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => onPrompt(p.prompt)}
                disabled={!canCheck}
                className="inline-flex items-center rounded-full border border-rule bg-surface px-3 py-1 text-[0.75rem] font-medium text-ink-soft transition-colors hover:border-ink/30 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => { if (message.meta?.kind === "lesson") onCheck(message.meta.moduleIndex) }}
              disabled={!canCheck}
              className="inline-flex items-center gap-1.5 rounded-full border border-forest/30 bg-forest/5 px-3 py-1 text-[0.75rem] font-medium text-forest transition-colors hover:bg-forest/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              I'm ready — check me →
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

function CurriculumSidebar({
  enrollment,
  progressPct,
  lessonedModules,
  viewedModules,
  activeModuleIndex,
  touchedTopics: _touchedTopics,
  lessonInFlight,
  onTeach,
  onOpenNotes,
}: {
  enrollment: EnrollmentDetail
  progressPct: number
  lessonedModules: Set<number>
  viewedModules: Set<number>
  activeModuleIndex: number | null
  touchedTopics: Set<string>
  lessonInFlight: number | null
  onTeach: (i: number) => void
  onOpenNotes: () => void
}) {
  const syllabus = enrollment.curriculum.syllabus
  const { nodes, currentIndex, allMastered } = buildLearningPath(
    syllabus,
    lessonedModules,
    viewedModules,
    activeModuleIndex,
  )
  const { done, total } = masteryProgress(syllabus, lessonedModules)
  const progress = Math.min(100, Math.max(0, progressPct))

  return (
    <aside className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-rule px-4 py-4">
        <p className="font-mono text-[0.5625rem] uppercase tracking-[0.2em] text-ink-faint">{total} modules</p>
        <h3 className="mt-1 font-display text-[0.9375rem] font-medium leading-snug text-ink">{enrollment.curriculum.title}</h3>
        <div className="mt-3">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="font-mono text-[0.5625rem] uppercase tracking-[0.18em] text-ink-faint">Completed</span>
            <span className="tabular font-mono text-[0.5625rem] text-ink-faint">{done}/{total}</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-rule/50">
            <motion.div className="h-full rounded-full bg-forest" initial={false} animate={{ width: `${progress}%` }} transition={{ duration: 0.7, ease: ease.outQuart }} />
          </div>
        </div>
        {currentIndex !== null && (
          <button
            type="button"
            onClick={() => onTeach(currentIndex)}
            disabled={lessonInFlight !== null}
            className="mt-3 flex w-full items-center justify-between gap-2 rounded-lg border border-forest/30 bg-forest/5 px-3 py-2 text-left transition-colors hover:border-forest/50 disabled:opacity-40"
          >
            <span className="min-w-0">
              <span className="block font-mono text-[0.5rem] uppercase tracking-[0.16em] text-forest">Resume</span>
              <span className="block truncate text-[0.75rem] font-medium text-ink">
                {nodes[currentIndex].title}
              </span>
            </span>
            <span className="shrink-0 text-forest">→</span>
          </button>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[0.5625rem] uppercase tracking-[0.16em] text-ink-faint">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-forest" />
            completed
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber" />
            seen
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full border border-rule bg-surface" />
            new
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {nodes.length > 0 ? (
          <ol className="py-2">
            {nodes.map((node) => {
              const loading = lessonInFlight === node.index
              const accent =
                node.status === "completed"
                  ? "text-forest"
                  : node.status === "seen"
                    ? "text-amber"
                    : "text-ink-faint"
              return (
                <li key={node.title} className="relative">
                  <button
                    type="button"
                    onClick={() => !node.locked && onTeach(node.index)}
                    disabled={lessonInFlight !== null || node.locked}
                    title={node.locked ? "Complete the previous module to unlock this" : undefined}
                    className={cn(
                      "group relative flex w-full items-center gap-3 px-4 py-2.5 text-left transition-all duration-150",
                      node.status === "completed"
                        ? "bg-forest/5"
                        : node.status === "seen"
                          ? "bg-amber/5"
                          : "hover:bg-surface-soft",
                      node.locked && "cursor-not-allowed opacity-50",
                      lessonInFlight !== null && !loading && !node.locked && "cursor-not-allowed opacity-35",
                    )}
                  >
                    {node.isCurrent && !node.locked && (
                      <span className="absolute inset-y-1 left-0 w-0.5 rounded-r-full bg-forest" />
                    )}
                    <div className={cn("flex h-5 w-5 shrink-0 items-center justify-center", accent)}>
                      {node.status === "completed" ? (
                        <CheckIcon className="h-3.5 w-3.5" />
                      ) : loading ? (
                        <span className="font-mono text-[0.5625rem]">…</span>
                      ) : node.locked ? (
                        <LockIcon className="h-3 w-3" />
                      ) : node.status === "seen" ? (
                        <EyeIcon className="h-3.5 w-3.5" />
                      ) : (
                        <span className="tabular font-mono text-[0.5625rem] text-ink-faint/60">
                          {String(node.index + 1).padStart(2, "0")}
                        </span>
                      )}
                    </div>
                    <span className={cn(
                      "min-w-0 flex-1 truncate font-display text-[0.8rem] leading-snug",
                      node.locked ? "text-ink-faint" : node.status === "open" ? "text-ink-soft group-hover:text-ink" : "text-ink",
                    )}>
                      {node.title}
                    </span>
                    <span className="shrink-0 tabular font-mono text-[0.5625rem] text-ink-faint/60">{node.durationMinutes}m</span>
                  </button>

                  {/* Submodule branch — only for unlocked modules */}
                  {!node.locked && (
                    <ul className="ml-[26px] border-l border-rule/70 pb-1">
                      {node.subSteps.map((step) => (
                        <li
                          key={step.kind}
                          className="flex items-center gap-2 py-1 pl-3 pr-4 text-[0.6875rem]"
                        >
                          <span
                            className={cn(
                              "inline-block h-1.5 w-1.5 shrink-0 rounded-full",
                              step.status === "done"
                                ? "bg-forest"
                                : step.status === "active"
                                  ? "bg-amber"
                                  : "border border-rule bg-surface",
                            )}
                          />
                          <span
                            className={cn(
                              "truncate",
                              step.status === "done"
                                ? "text-forest"
                                : step.status === "active"
                                  ? "text-ink"
                                  : "text-ink-faint",
                            )}
                          >
                            {step.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
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

      <div className="shrink-0 space-y-3 border-t border-rule p-4">
        <button
          type="button"
          onClick={onOpenNotes}
          className="flex w-full items-center justify-between rounded-lg border border-rule bg-surface px-3 py-2 text-[0.75rem] font-medium text-ink-soft transition-colors hover:border-ink/30 hover:text-ink"
        >
          <span>My notes</span>
          <span className="text-ink-faint">✎</span>
        </button>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono text-[0.5625rem] uppercase tracking-[0.18em] text-ink-faint">Earn when ready</p>
            <p className="mt-0.5 font-display text-[0.9375rem] font-medium text-ink">
              <span className="text-amber">₹</span>{enrollment.bounty.rewardInr.toLocaleString("en-IN")}
            </p>
          </div>
          {allMastered ? (
            <Link
              href={`/learn/${enrollment.bountyId}/quiz`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-forest px-4 py-2 text-[0.75rem] font-medium text-paper transition-all hover:bg-forest/85"
            >
              Final exam <span className="text-paper/60">→</span>
            </Link>
          ) : (
            <div
              title={`Complete all ${total} modules to unlock the final exam (${done}/${total} done)`}
              className="inline-flex shrink-0 cursor-not-allowed items-center gap-1.5 rounded-xl border border-rule bg-surface px-4 py-2 text-[0.75rem] font-medium text-ink-faint"
            >
              <LockIcon className="h-3 w-3" /> {done}/{total}
            </div>
          )}
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
              className="my-5 overflow-x-auto rounded-xl border border-rule bg-paper-deep px-5 py-4 font-mono text-[0.8125rem] leading-[1.7] text-ink-soft"
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

        // Horizontal rule: separates major lesson sections. Give it real air.
        if (/^---+$/.test(trimmed)) {
          return <hr key={i} className="my-6 border-t border-rule-soft" />
        }

        // Blockquote: lines that begin with "> ". Render as an indented,
        // bordered quote pulled directly from the curriculum source.
        if (trimmed.split("\n").every((l) => /^>\s?/.test(l))) {
          const quote = trimmed
            .split("\n")
            .map((l) => l.replace(/^>\s?/, ""))
            .join("\n")
            .trim()
          return (
            <blockquote
              key={i}
              className="my-4 border-l-2 border-teal/40 bg-surface-soft/50 px-4 py-3 text-[0.9375rem] leading-[1.7] text-ink-soft"
            >
              <InlineMarkdown text={quote} />
            </blockquote>
          )
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
              className="my-4 list-disc space-y-2 pl-6 text-[0.9375rem] leading-[1.7] marker:text-ink-faint"
            >
              {items.map((it, j) => (
                <li key={j} className="pl-1">
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
              className="my-4 list-decimal space-y-2 pl-6 text-[0.9375rem] leading-[1.7] marker:font-mono marker:text-[0.75rem] marker:text-ink-faint"
            >
              {items.map((it, j) => (
                <li key={j} className="pl-1">
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
              className="mt-7 font-display text-[1.0625rem] font-semibold tracking-tight text-ink"
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
              className="mt-7 font-display text-[1.1875rem] font-semibold tracking-tight text-ink"
            >
              <InlineMarkdown text={h1[1] ?? ""} />
            </h3>
          )
        }

        // Section heading: a single line that is entirely bold (and short),
        // e.g. **Ownership: the core idea**. The lesson prompt emits these.
        // Render as a real heading so it gets the spacing it deserves.
        const headingMatch = trimmed.match(/^\*\*([^*\n]+)\*\*\s*:?\s*$/)
        if (headingMatch && !trimmed.includes("\n")) {
          return (
            <h3
              key={i}
              className="font-display text-[1.0625rem] font-semibold tracking-tight text-ink [&:not(:first-child)]:mt-7"
            >
              {headingMatch[1]}
            </h3>
          )
        }

        // Plain prose. If the model returned multiple sentences joined by
        // single newlines (instead of blank-line paragraph breaks), split
        // them apart so the lesson does not become a wall of text.
        const lines = trimmed.split(/\n+/).map((l) => l.trim()).filter(Boolean)
        if (lines.length > 1) {
          return (
            <div key={i} className="[&:not(:first-child)]:mt-4 space-y-4">
              {lines.map((line, j) => (
                <p
                  key={j}
                  className="text-[0.9375rem] leading-[1.75] text-ink-soft"
                >
                  <InlineMarkdown text={line} />
                </p>
              ))}
            </div>
          )
        }

        // A single paragraph that has grown into one long block. If it
        // contains more than ~3 sentences, split on sentence boundaries so
        // the reader still gets visual breathing room.
        if (trimmed.length > 280) {
          const sentences = trimmed
            .split(/(?<=[.!?])\s+(?=[A-Z(])/)
            .map((s) => s.trim())
            .filter(Boolean)
          if (sentences.length >= 3) {
            // Group every 2 sentences into a paragraph for a natural rhythm.
            const groups: string[] = []
            for (let k = 0; k < sentences.length; k += 2) {
              groups.push(sentences.slice(k, k + 2).join(" "))
            }
            return (
              <div key={i} className="[&:not(:first-child)]:mt-4 space-y-4">
                {groups.map((g, j) => (
                  <p
                    key={j}
                    className="text-[0.9375rem] leading-[1.75] text-ink-soft"
                  >
                    <InlineMarkdown text={g} />
                  </p>
                ))}
              </div>
            )
          }
        }

        return (
          <p
            key={i}
            className="text-[0.9375rem] leading-[1.75] text-ink-soft [&:not(:first-child)]:mt-4"
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
              <strong key={i} className="font-bold text-ink">
                {t.value}
              </strong>
            )
          case "italic":
            return (
              <em key={i} className="italic text-ink">
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

function TypingBubble({ label }: { label?: string }) {
  return (
    <div className="flex gap-3">
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

function LockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="3" y="7" width="10" height="7" rx="1.5" />
      <path d="M5 7V5a3 3 0 0 1 6 0v2" />
    </svg>
  )
}

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

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
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
