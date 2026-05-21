"use client"

import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useMemo, useRef, useState } from "react"
import type {
  ChatMessage,
  CheckQuestion,
  EnrollmentDetail,
  TutorFormat,
  TutorLanguage,
  TutorPersona,
} from "@pol/shared"

import { ApiClientError, apiFetch, apiStream } from "@/lib/api"
import { ease } from "@/lib/motion"
import { cn } from "@/lib/utils"
import {
  buildLearningPath,
  extractSubmodules,
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
const LANG_NAMES_EN: Record<TutorLanguage, string> = {
  en: "English",
  hi: "Hindi",
  ta: "Tamil",
  te: "Telugu",
}
// Default tutor voice. Students can flip to "socratic" from the settings
// modal: same RAG + same curriculum, but the tutor refuses to state
// answers and only asks leading questions, so the learner reasons their
// way there. Choice is persisted to localStorage.
const DEFAULT_PERSONA: TutorPersona = "mentor"
const PERSONA_LABELS: Record<TutorPersona, string> = {
  mentor: "Mentor",
  examiner: "Examiner",
  coach: "Coach",
  socratic: "Socratic",
}
const PERSONA_BLURBS: Record<TutorPersona, string> = {
  mentor: "Warm, patient explanations with examples and follow-up questions.",
  examiner: "Precise, definition-led, treats every answer like it's being graded.",
  coach: "High-energy, momentum-first, celebrates small wins.",
  socratic: "Never gives the answer outright. Asks leading questions so you derive it yourself.",
}

// Response shape preference. Independent of persona: a Coach can answer in
// Bullets or Prose, same voice, different layout. Persisted to localStorage.
const DEFAULT_FORMAT: TutorFormat = "prose"
const FORMAT_LABELS: Record<TutorFormat, string> = {
  prose: "Prose",
  bullets: "Bullets",
  examples: "Examples-first",
  brief: "Brief",
}
const FORMAT_BLURBS: Record<TutorFormat, string> = {
  prose: "Conversational paragraphs. The default.",
  bullets: "Tight bulleted lists you can scan.",
  examples: "Lead with a concrete example, then the concept.",
  brief: "Direct answer in 3 sentences, no fluff.",
}

// Unicode ranges for the Indic scripts we support. Used to heuristically
// detect what language an already-persisted tutor reply is in, since the
// backend doesn't store a language tag on each message. The threshold of
// 10 characters filters out incidental English text in a Hindi reply
// (e.g. a stray "function" or "smart contract" inside Devanagari prose).
const SCRIPT_RANGES: Record<Exclude<TutorLanguage, "en">, RegExp> = {
  hi: /[ऀ-ॿ]/g,
  ta: /[஀-௿]/g,
  te: /[ఀ-౿]/g,
}

function messageMatchesLanguage(text: string, lang: TutorLanguage): boolean {
  if (lang === "en") {
    // Treat as English when the content has no meaningful chunk of Indic
    // script. Tiny embedded fragments don't count; an actual Hindi/Tamil/
    // Telugu reply will have many.
    const indic = text.match(/[ऀ-ॿ஀-௿ఀ-౿]/g)
    return !indic || indic.length < 10
  }
  const matches = text.match(SCRIPT_RANGES[lang])
  return !!matches && matches.length >= 10
}

// ─── Code sandbox languages ───────────────────────────────────────────────────

type CodeLang =
  | "python" | "javascript" | "typescript" | "java" | "cpp" | "c"
  | "go" | "rust" | "kotlin" | "swift" | "ruby" | "sql"

// `piston` is the language id we send to the Piston public sandbox
// (https://emkc.org/api/v2/piston). `indent` is what Tab inserts; `comment`
// is the line-comment prefix Ctrl+/ toggles.
const LANGUAGES: {
  id: CodeLang
  label: string
  fence: string
  runHint: string
  starter: string
  piston: string | null
  indent: string
  comment: string
}[] = [
  {
    id: "python", label: "Python", fence: "python", runHint: "python solution.py",
    starter: `def solution():\n    # write your code here\n    pass\n\nprint(solution())\n`,
    piston: "python", indent: "    ", comment: "# ",
  },
  {
    id: "javascript", label: "JavaScript", fence: "javascript", runHint: "node solution.js",
    starter: `function solution() {\n  // write your code here\n}\n\nconsole.log(solution());\n`,
    piston: "javascript", indent: "  ", comment: "// ",
  },
  {
    id: "typescript", label: "TypeScript", fence: "typescript", runHint: "ts-node solution.ts",
    starter: `function solution(): void {\n  // write your code here\n}\n\nsolution();\n`,
    piston: "typescript", indent: "  ", comment: "// ",
  },
  {
    id: "java", label: "Java", fence: "java", runHint: "javac Solution.java && java Solution",
    starter: `public class Solution {\n    public static void main(String[] args) {\n        // write your code here\n    }\n}\n`,
    piston: "java", indent: "    ", comment: "// ",
  },
  {
    id: "cpp", label: "C++", fence: "cpp", runHint: "g++ -o sol solution.cpp && ./sol",
    starter: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // write your code here\n    return 0;\n}\n`,
    piston: "c++", indent: "    ", comment: "// ",
  },
  {
    id: "c", label: "C", fence: "c", runHint: "gcc -o sol solution.c && ./sol",
    starter: `#include <stdio.h>\n\nint main() {\n    // write your code here\n    return 0;\n}\n`,
    piston: "c", indent: "    ", comment: "// ",
  },
  {
    id: "go", label: "Go", fence: "go", runHint: "go run solution.go",
    starter: `package main\n\nimport "fmt"\n\nfunc main() {\n    // write your code here\n    fmt.Println("hello")\n}\n`,
    piston: "go", indent: "\t", comment: "// ",
  },
  {
    id: "rust", label: "Rust", fence: "rust", runHint: "rustc solution.rs && ./solution",
    starter: `fn main() {\n    // write your code here\n    println!("hello, world!");\n}\n`,
    piston: "rust", indent: "    ", comment: "// ",
  },
  {
    id: "kotlin", label: "Kotlin", fence: "kotlin",
    runHint: "kotlinc solution.kt -include-runtime -d sol.jar && java -jar sol.jar",
    starter: `fun main() {\n    // write your code here\n    println("hello")\n}\n`,
    piston: "kotlin", indent: "    ", comment: "// ",
  },
  {
    id: "swift", label: "Swift", fence: "swift", runHint: "swift solution.swift",
    starter: `import Foundation\n\n// write your code here\nprint("hello, world!")\n`,
    piston: "swift", indent: "    ", comment: "// ",
  },
  {
    id: "ruby", label: "Ruby", fence: "ruby", runHint: "ruby solution.rb",
    starter: `# write your code here\ndef solution\n  # ...\nend\n\np solution\n`,
    piston: "ruby", indent: "  ", comment: "# ",
  },
  {
    id: "sql", label: "SQL", fence: "sql", runHint: "psql -f solution.sql",
    starter: `-- write your query here\nSELECT *\nFROM table_name\nWHERE condition;\n`,
    piston: "sqlite3", indent: "  ", comment: "-- ",
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

// Languages the course actually uses / recommends — surfaced in the IDE
// language picker so the student knows what the lessons assume. The detected
// primary language is always included first.
function recommendedLangs(curriculum: EnrollmentDetail["curriculum"]): CodeLang[] {
  const text = (
    curriculum.title +
    " " +
    curriculum.topics.join(" ") +
    " " +
    curriculum.syllabus.map((m) => m.module + " " + m.summary).join(" ")
  ).toLowerCase()
  const probes: [CodeLang, string[]][] = [
    ["python", ["python", "pandas", "numpy", "django", "flask"]],
    ["typescript", ["typescript", " ts "]],
    ["javascript", ["javascript", "node", "react", " js "]],
    ["java", ["java "]],
    ["cpp", ["c++", "cpp"]],
    ["c", ["c programming"]],
    ["go", ["golang", " go "]],
    ["rust", ["rust"]],
    ["kotlin", ["kotlin", "android"]],
    ["swift", ["swift", "ios"]],
    ["ruby", ["ruby", "rails"]],
    ["sql", ["sql", "database", "postgres", "query"]],
  ]
  const primary = detectDefaultLang(curriculum)
  const found = new Set<CodeLang>([primary])
  for (const [lang, needles] of probes) {
    if (needles.some((n) => text.includes(n))) found.add(lang)
  }
  return [primary, ...Array.from(found).filter((l) => l !== primary)]
}

// Executes student code in the Piston public sandbox
// (https://github.com/engineer-man/piston). We send `version: "*"` to let
// Piston pick the latest installed runtime for each language. Returns the
// combined stdout/stderr lines and an exit-code suffix the terminal renders.
// Network failures fall back to a friendly message instead of crashing the UI.
const PISTON_URL = "https://emkc.org/api/v2/piston/execute"

type RunResult = { lines: string[]; ok: boolean }

async function runViaPiston(
  lang: CodeLang,
  code: string,
  stdin: string,
): Promise<RunResult> {
  const ld = langById(lang)
  if (!ld.piston) {
    return {
      lines: [`Run is not wired up for ${ld.label} yet.`],
      ok: false,
    }
  }
  const ext = LANG_EXT[lang]
  // Java is the one language Piston pins to a class-named file. Our starter
  // declares `public class Solution`, so we name the file accordingly.
  const fileName = lang === "java" ? `Solution.${ext}` : `solution.${ext}`
  try {
    const res = await fetch(PISTON_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: ld.piston,
        version: "*",
        files: [{ name: fileName, content: code }],
        stdin,
        compile_timeout: 10000,
        run_timeout: 5000,
      }),
    })
    if (!res.ok) {
      return {
        lines: [`Sandbox returned HTTP ${res.status}. Try again in a moment.`],
        ok: false,
      }
    }
    const data = (await res.json()) as {
      run?: { stdout?: string; stderr?: string; output?: string; code?: number; signal?: string | null }
      compile?: { stdout?: string; stderr?: string; output?: string; code?: number }
      message?: string
    }
    if (data.message) {
      return { lines: [`Sandbox: ${data.message}`], ok: false }
    }
    const lines: string[] = []
    const compileErr = (data.compile?.stderr ?? "").trim()
    if (compileErr) {
      lines.push("— compile error —")
      lines.push(...compileErr.split("\n"))
    }
    const stdout = (data.run?.stdout ?? "").trim()
    const stderr = (data.run?.stderr ?? "").trim()
    if (stdout) lines.push(...stdout.split("\n"))
    if (stderr) {
      if (stdout) lines.push("— stderr —")
      lines.push(...stderr.split("\n"))
    }
    const exit = data.run?.code ?? 0
    const signal = data.run?.signal
    if (lines.length === 0) {
      lines.push(`Program finished with no output (exit ${exit})`)
    } else {
      lines.push(`— exit ${exit}${signal ? ` · signal ${signal}` : ""} —`)
    }
    return { lines, ok: exit === 0 && !compileErr }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error"
    return {
      lines: [
        "Could not reach the code sandbox.",
        `(${msg})`,
        "Check your connection — the sandbox runs at emkc.org/api/v2/piston.",
      ],
      ok: false,
    }
  }
}

// Map a fenced-code language tag (the bit after ``` in markdown) to one of
// our editor language ids. Used by "Send to editor" buttons.
function fenceToLang(fence: string): CodeLang | null {
  const norm = fence.trim().toLowerCase()
  const direct = LANGUAGES.find((l) => l.fence === norm || l.id === norm)
  if (direct) return direct.id
  switch (norm) {
    case "py": return "python"
    case "js": case "jsx": case "node": return "javascript"
    case "ts": case "tsx": return "typescript"
    case "c++": case "cxx": return "cpp"
    case "golang": return "go"
    case "rs": return "rust"
    case "kt": return "kotlin"
    case "rb": return "ruby"
    case "postgres": case "postgresql": case "mysql": return "sql"
    default: return null
  }
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

function LangDropdown({ value, onChange, recommended }: {
  value: CodeLang
  onChange: (l: CodeLang) => void
  recommended: CodeLang[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const recSet = new Set(recommended)
  // Recommended languages float to the top of the list, in course order.
  const ordered = [
    ...recommended.map((id) => LANGUAGES.find((l) => l.id === id)!).filter(Boolean),
    ...LANGUAGES.filter((l) => !recSet.has(l.id)),
  ]

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
        {recSet.has(value) && (
          <span className="rounded-full bg-teal/15 px-1 text-[0.5rem] text-teal">★</span>
        )}
        <ChevronDownIcon className={cn("h-2.5 w-2.5 transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15, ease: ease.outQuart }}
            className="absolute left-0 top-full z-20 mt-1.5 max-h-72 w-52 overflow-y-auto rounded-xl border border-rule bg-paper shadow-lg"
          >
            {ordered.map((l, i) => {
              const isRec = recSet.has(l.id)
              const firstNonRec = i === recommended.length && recommended.length > 0
              return (
                <div key={l.id}>
                  {firstNonRec && (
                    <div className="border-t border-rule px-3 py-1 font-mono text-[0.5rem] uppercase tracking-[0.16em] text-ink-faint">
                      Other languages
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => { onChange(l.id); setOpen(false) }}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-surface-soft",
                      l.id === value ? "text-teal" : "text-ink-soft",
                    )}
                  >
                    <span className="font-mono text-[0.6875rem]">{l.label}</span>
                    {isRec && (
                      <span className="rounded-full bg-teal/12 px-1.5 py-0.5 font-mono text-[0.5rem] uppercase tracking-[0.14em] text-teal">
                        in course
                      </span>
                    )}
                    {l.id === value && <CheckIcon className="ml-auto h-3 w-3 text-teal" />}
                  </button>
                </div>
              )
            })}
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
  const [tutorPersona, setTutorPersona] = useState<TutorPersona>(DEFAULT_PERSONA)
  const [tutorFormat, setTutorFormat] = useState<TutorFormat>(DEFAULT_FORMAT)
  // Id of the tutor message currently being streamed in via SSE. While
  // non-null, the bubble for that id renders `liveTutorContent` instead of
  // its (empty) entry in `messages`. This keeps the messages array stable
  // during streaming, so framer-motion + every effect that keys off
  // `messages` doesn't thrash on each token.
  const [liveStreamingId, setLiveStreamingId] = useState<string | null>(null)
  const [liveTutorContent, setLiveTutorContent] = useState("")
  // Tokens accumulate into the ref synchronously; we flush to state on a
  // rAF tick so re-renders cap out at the browser's frame rate, not at
  // network packet rate.
  const liveContentRef = useRef("")
  const liveFlushScheduledRef = useRef(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
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
  const recommendedLanguages = useMemo(
    () => recommendedLangs(initialEnrollment.curriculum),
    [initialEnrollment.curriculum],
  )
  const [codeLang, setCodeLang] = useState<CodeLang>(defaultLang)
  const [codes, setCodes] = useState<Record<CodeLang, string>>(() => {
    const init = {} as Record<CodeLang, string>
    for (const l of LANGUAGES) init[l.id] = l.starter
    return init
  })
  // Hydrate persisted code + active language for this enrollment from
  // localStorage. We hydrate inside an effect (not lazy useState init) so
  // SSR markup matches client markup and we avoid hydration mismatches.
  const codeStorageKey = `pol:code:${initialEnrollment.id}`
  const codeLangStorageKey = `pol:code:${initialEnrollment.id}:lang`
  const [codeHydrated, setCodeHydrated] = useState(false)
  useEffect(() => {
    if (typeof window === "undefined") { setCodeHydrated(true); return }
    try {
      const rawCodes = window.localStorage.getItem(codeStorageKey)
      if (rawCodes) {
        const parsed = JSON.parse(rawCodes) as Partial<Record<CodeLang, string>>
        setCodes((prev) => {
          const next = { ...prev }
          for (const l of LANGUAGES) {
            if (typeof parsed[l.id] === "string") next[l.id] = parsed[l.id] as string
          }
          return next
        })
      }
      const savedLang = window.localStorage.getItem(codeLangStorageKey) as CodeLang | null
      if (savedLang && LANGUAGES.some((l) => l.id === savedLang)) {
        setCodeLang(savedLang)
      }
    } catch {
      // Corrupt JSON or quota error — ignore and start fresh.
    }
    setCodeHydrated(true)
  }, [codeStorageKey, codeLangStorageKey])
  useEffect(() => {
    if (!codeHydrated || typeof window === "undefined") return
    try { window.localStorage.setItem(codeStorageKey, JSON.stringify(codes)) } catch { /* quota */ }
  }, [codes, codeHydrated, codeStorageKey])
  useEffect(() => {
    if (!codeHydrated || typeof window === "undefined") return
    try { window.localStorage.setItem(codeLangStorageKey, codeLang) } catch { /* quota */ }
  }, [codeLang, codeHydrated, codeLangStorageKey])

  const codeText = codes[codeLang]
  const isCodeModified = codeText.trim() !== "" && codeText.trim() !== langById(codeLang).starter.trim()

  function setCodeForLang(lang: CodeLang, text: string) {
    setCodes((prev) => ({ ...prev, [lang]: text }))
  }

  // Drop an AI-suggested code block into the editor: switch language, set
  // the buffer for that language, and open the side panel if hidden. This is
  // the wiring behind the "Send to editor" button on tutor code fences.
  function sendCodeToEditor(lang: CodeLang, text: string) {
    setCodes((prev) => ({ ...prev, [lang]: text }))
    setCodeLang(lang)
    setCodeOpen(true)
  }

  // Tutor message ids that just arrived this session and should type in
  // (typewriter). Ids loaded from history are not in here, so they render
  // instantly instead of replaying on every session switch.
  const streamRef = useRef<Set<string>>(new Set())
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const voicesRef = useRef<SpeechSynthesisVoice[]>([])
  const [voiceForLang, setVoiceForLang] = useState<Partial<Record<TutorLanguage, boolean>>>({})
  // Id of the message whose audio is currently playing — used to flip the
  // play button into a stop button and to allow tapping any other reply's
  // play button to swap targets cleanly. `null` means nothing is speaking.
  const [speakingId, setSpeakingId] = useState<string | null>(null)
  const speakingIdRef = useRef<string | null>(null)
  const lastSpokenIdRef = useRef<string | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  // ── Persist prefs ──
  // `langHydrated` flips true once we've finished restoring the saved
  // language from localStorage; the re-teach watcher below uses it to skip
  // the restore itself (which is a programmatic change, not a user one).
  const [langHydrated, setLangHydrated] = useState(false)
  const prevLangRef = useRef<TutorLanguage>("en")
  useEffect(() => {
    if (typeof window === "undefined") return
    const l = window.localStorage.getItem("pol:tutor:lang") as TutorLanguage | null
    if (l && ["en", "hi", "ta", "te"].includes(l)) {
      setTutorLang(l)
      prevLangRef.current = l
    }
    setLangHydrated(true)
  }, [])
  useEffect(() => { if (typeof window !== "undefined") window.localStorage.setItem("pol:tutor:lang", tutorLang) }, [tutorLang])

  // Hydrate + persist persona. Falls back to mentor on any unknown saved
  // value so legacy "examiner"/"coach" strings still work after a future
  // schema change.
  useEffect(() => {
    if (typeof window === "undefined") return
    const p = window.localStorage.getItem("pol:tutor:persona") as TutorPersona | null
    if (p && (["mentor", "examiner", "coach", "socratic"] as TutorPersona[]).includes(p)) {
      setTutorPersona(p)
    }
  }, [])
  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem("pol:tutor:persona", tutorPersona)
  }, [tutorPersona])

  // Hydrate + persist response-shape preference. Same defensive parsing as
  // persona: unknown saved values silently fall back to the prose default.
  useEffect(() => {
    if (typeof window === "undefined") return
    const f = window.localStorage.getItem("pol:tutor:format") as TutorFormat | null
    if (f && (["prose", "bullets", "examples", "brief"] as TutorFormat[]).includes(f)) {
      setTutorFormat(f)
    }
  }, [])
  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem("pol:tutor:format", tutorFormat)
  }, [tutorFormat])

  // When the student changes the tutor language while inside a module's
  // chat, transparently re-teach that module's lesson in the new language.
  // The user's complaint: the first lesson in a chapter always loads in
  // English, which is fine — but flipping the language setting should
  // also flip that first lesson, not just future replies. We compare the
  // most recent lesson by its script (not by metadata, since older lessons
  // don't carry a language tag) so the check is self-healing across
  // history. Free-form chat (sessionIndex 0) is skipped because there is
  // no canonical lesson to regenerate; new turns in that chat already
  // come back in the selected language via the existing send flow.
  useEffect(() => {
    if (!langHydrated) return
    if (prevLangRef.current === tutorLang) return
    prevLangRef.current = tutorLang
    if (sessionIndex <= 0) return
    const moduleIdx = sessionIndex - 1
    // findLast: the most recently emitted lesson wins. If a student bounces
    // EN → HI → EN, we should reteach back into English from the Hindi
    // version, not get stuck because the *first* lesson is still English.
    const recentLesson = [...messages]
      .reverse()
      .find(
        (m) => m.meta?.kind === "lesson" && m.meta.moduleIndex === moduleIdx,
      )
    if (!recentLesson) return
    if (messageMatchesLanguage(recentLesson.content, tutorLang)) return
    teachModule(moduleIdx, { force: true })
    // teachModule is stable enough; depending on it would re-fire this
    // effect on every render of the parent and is not what we want.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorLang, langHydrated, sessionIndex, messages])

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

  // Load the synthesis voice catalog. Browsers populate this asynchronously;
  // Chrome on Windows fires `voiceschanged` once the system voices finish
  // loading, while Safari has them ready synchronously. We cache the catalog
  // in a ref so `speak()` can pick a matching voice without re-querying, and
  // mirror "do we have a voice for this language?" to state so the settings
  // panel can warn the student when the OS lacks a Hindi/Tamil/Telugu voice.
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return
    const synth = window.speechSynthesis
    const refresh = () => {
      const list = synth.getVoices()
      voicesRef.current = list
      const support: Partial<Record<TutorLanguage, boolean>> = {}
      ;(["en", "hi", "ta", "te"] as TutorLanguage[]).forEach((l) => {
        support[l] = list.some((v) => v.lang.toLowerCase().startsWith(l))
      })
      setVoiceForLang(support)
    }
    refresh()
    synth.addEventListener?.("voiceschanged", refresh)
    return () => synth.removeEventListener?.("voiceschanged", refresh)
  }, [])

  // Stop any in-flight TTS when the chat unmounts. Without this, leaving
  // the tutor mid-playback keeps the speech going on the next page.
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        window.speechSynthesis?.cancel()
      }
    }
  }, [])

  // Pick the best available voice for a tutor language. Prefer an exact
  // locale match (e.g. "hi-IN"), then any voice whose lang starts with the
  // 2-letter prefix ("hi"). Returns null if the system has no matching
  // voice — the caller can decide to surface a warning.
  function pickVoiceFor(lang: TutorLanguage): SpeechSynthesisVoice | null {
    const want = LANG_LOCALES[lang].toLowerCase()
    const prefix = lang.toLowerCase()
    const all = voicesRef.current
    if (all.length === 0) return null
    const exact = all.find((v) => v.lang.toLowerCase() === want)
    if (exact) return exact
    const byPrefix = all.find((v) => v.lang.toLowerCase().startsWith(prefix))
    if (byPrefix) return byPrefix
    return null
  }

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

  // Speak (or stop) a single message. The play button on a reply calls this
  // with the message's id, so tapping it again behaves as a toggle (stop)
  // and tapping a *different* reply's button cleanly cancels the previous
  // utterance before starting the new one. The autoplay path passes the
  // synthetic id `auto` so its lifecycle still lives in the same state.
  function speak(text: string, id: string = "auto") {
    if (typeof window === "undefined") return
    const synth = window.speechSynthesis
    if (!synth) return

    // Toggle: tapping the same button that's currently playing stops it.
    if (speakingIdRef.current === id) {
      synth.cancel()
      speakingIdRef.current = null
      setSpeakingId(null)
      return
    }

    const utt = new SpeechSynthesisUtterance(stripMarkdown(text))
    utt.lang = LANG_LOCALES[tutorLang]
    utt.rate = 1.05
    // Setting `utt.lang` alone is a hint browsers tend to ignore: most ship
    // with only a handful of English voices, so without an explicit voice
    // they read non-English text in an English voice (the symptom: "only
    // the accent changes"). Picking a voice whose `.lang` matches the
    // tutor language is the only reliable way to switch the actual TTS.
    const voice = pickVoiceFor(tutorLang)
    if (voice) {
      utt.voice = voice
    } else if (tutorLang !== "en") {
      setError(
        `Your device doesn't have a ${LANG_NAMES_EN[tutorLang]} text-to-speech voice installed. The reply will still be in ${LANG_NAMES_EN[tutorLang]}, but read aloud in the default voice.`,
      )
    }
    // Clear `speakingId` whenever the utterance ends naturally OR is
    // interrupted by the user clicking another play button. The ref guard
    // protects against races: a stale `onend` from a cancelled utterance
    // must not reset state belonging to a fresher one.
    utt.onend = () => {
      if (speakingIdRef.current === id) {
        speakingIdRef.current = null
        setSpeakingId(null)
      }
    }
    utt.onerror = utt.onend

    synth.cancel()
    speakingIdRef.current = id
    setSpeakingId(id)
    synth.speak(utt)
  }

  // ── TTS autoplay — only NEW replies, never an already-present chat ──
  // When autoplay is toggled on we seed lastSpokenIdRef with the current
  // last tutor message (see toggleSpeakReplies) so the existing chat is
  // not read aloud; only messages that arrive afterwards autoplay.
  useEffect(() => {
    if (!speakReplies || typeof window === "undefined") return
    const last = [...messages].reverse().find((m) => m.role === "tutor")
    if (!last || last.id === lastSpokenIdRef.current) return
    lastSpokenIdRef.current = last.id
    speak(last.content)
    // speak is stable enough for this; deps intentionally narrow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, speakReplies, tutorLang])

  // ── Auto-scroll ──
  // Track length only (not content of every message) so this doesn't fire
  // on each rAF flush of live streaming text — that path uses its own
  // dependency below to keep the viewport pinned to the bottom while the
  // tutor types.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages.length, pending, lessonInFlight, pendingCheck])

  // While the tutor is streaming, keep the viewport pinned to the bottom as
  // tokens flow in. `behavior: "auto"` (no smooth) avoids fighting the
  // browser when frames pile up; smooth scroll only on the initial paint
  // above.
  useEffect(() => {
    if (!liveStreamingId) return
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [liveTutorContent, liveStreamingId])

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

  // Per-module submodule hit counts. We can only measure the active module
  // because `messages` is scoped to the loaded session — that's enough to
  // light up submodules as the student talks through the current topic.
  // Mastered modules get all submodules marked done by buildLearningPath
  // regardless of hits, so prior modules still render correctly.
  const submoduleHits = useMemo(() => {
    const map = new Map<number, Map<string, number>>()
    if (sessionIndex <= 0) return map
    const moduleIdx = sessionIndex - 1
    const syllabusItem =
      initialEnrollment.curriculum.syllabus[moduleIdx]
    if (!syllabusItem) return map
    const subs = extractSubmodules(syllabusItem.summary)
    if (subs.length === 0) return map
    const counts = new Map<string, number>()
    for (const m of messages) {
      if (m.role !== "user") continue
      const lower = m.content.toLowerCase()
      for (const sub of subs) {
        if (sub.keywords.some((k) => lower.includes(k))) {
          counts.set(sub.label, (counts.get(sub.label) ?? 0) + 1)
        }
      }
    }
    if (counts.size > 0) map.set(moduleIdx, counts)
    return map
  }, [messages, sessionIndex, initialEnrollment.curriculum.syllabus])

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

    // Append sandbox code as context when the panel is open and code has
    // been edited. Skip if the student already pasted a fenced code block,
    // otherwise the same snippet ends up in the message twice.
    let fullMessage = trimmed
    const messageHasFence = /```[\s\S]*```/.test(trimmed)
    if (codeOpen && isCodeModified && !messageHasFence) {
      const ld = langById(codeLang)
      fullMessage += `\n\n[My current ${ld.label} code in the sandbox]\n\`\`\`${ld.fence}\n${codeText}\n\`\`\``
    }

    // Optimistic user bubble + empty tutor bubble. We do NOT mutate
    // `messages` per token. Instead, tokens accumulate into `liveContentRef`
    // and we flush to `liveTutorContent` state at most once per animation
    // frame; the streaming bubble reads from that state. Two reasons:
    //   1. `setMessages((prev) => prev.map(...))` per token allocates a new
    //      array each call, which re-fires every effect/memo keyed on
    //      `messages` and trips React's update-depth limiter under load.
    //   2. Framer-motion's AnimatePresence runs a layout pass per messages
    //      change, which is what makes the chat look fidgety while streaming.
    const tempUserId = `tmp-u-${Date.now()}`
    const tempTutorId = `tmp-t-${Date.now()}`
    const userBubble: ChatMessage = {
      id: tempUserId, role: "user",
      content: fullMessage, createdAt: new Date().toISOString(),
    }
    const tutorBubble: ChatMessage = {
      id: tempTutorId, role: "tutor",
      content: "", createdAt: new Date().toISOString(),
    }
    liveContentRef.current = ""
    liveFlushScheduledRef.current = false
    setLiveTutorContent("")
    setMessages((prev) => [...prev, userBubble, tutorBubble])
    setInput("")
    setPending(true)
    setLiveStreamingId(tempTutorId)

    // Schedule a single rAF flush per frame, no matter how many deltas
    // arrive. This caps re-renders at the browser's frame rate (~60/s) and
    // lets multiple tokens land in one paint.
    const scheduleFlush = () => {
      if (liveFlushScheduledRef.current) return
      liveFlushScheduledRef.current = true
      requestAnimationFrame(() => {
        liveFlushScheduledRef.current = false
        setLiveTutorContent(liveContentRef.current)
      })
    }

    try {
      const stream = apiStream("/tutor/stream", {
        json: {
          enrollmentId: initialEnrollment.id,
          message: fullMessage,
          lang: tutorLang,
          persona: tutorPersona,
          format: tutorFormat,
          sessionIndex,
        },
      })

      for await (const ev of stream) {
        if (ev.event === "meta") {
          // Swap the optimistic user bubble for the persisted one so its
          // id matches what /history would return on reload.
          const payload = JSON.parse(ev.data) as { user: ChatMessage }
          setMessages((prev) =>
            prev.map((m) => (m.id === tempUserId ? payload.user : m)),
          )
        } else if (ev.event === "delta") {
          const payload = JSON.parse(ev.data) as { text: string }
          liveContentRef.current += payload.text
          scheduleFlush()
        } else if (ev.event === "done") {
          const payload = JSON.parse(ev.data) as { tutor: ChatMessage }
          // Replace the placeholder with the persisted tutor row so any
          // citations / metadata are attached, and future actions key off
          // the real id.
          setMessages((prev) =>
            prev.map((m) => (m.id === tempTutorId ? payload.tutor : m)),
          )
          setLiveStreamingId(null)
          setLiveTutorContent("")
          liveContentRef.current = ""
        } else if (ev.event === "error") {
          const payload = JSON.parse(ev.data) as { message?: string }
          setError(payload.message || "Tutor stream failed")
        }
      }
    } catch (err) {
      // Network failure: drop the placeholder bubbles so the user can retry.
      setMessages((prev) => prev.filter((m) => m.id !== tempUserId && m.id !== tempTutorId))
      setError(err instanceof ApiClientError ? err.message : "Could not reach the tutor")
    } finally {
      setLiveStreamingId(null)
      setLiveTutorContent("")
      liveContentRef.current = ""
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
      // chat AND it's in the currently selected language. The latter clause
      // matters: a student who first taught a module in English then
      // switched to Hindi must get the lesson re-emitted in Hindi rather
      // than reading the stale English version. We detect language by the
      // script the lesson actually uses, not by metadata, so old lessons
      // without a stored language tag are still handled correctly.
      const existingLesson = history.find(
        (m) => m.meta?.kind === "lesson" && m.meta.moduleIndex === moduleIndex,
      )
      const alreadyTaught = !!existingLesson
      const matchesLang =
        !existingLesson || messageMatchesLanguage(existingLesson.content, tutorLang)
      if (alreadyTaught && matchesLang && !opts?.force) return

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
    if (speakReplies) {
      window.speechSynthesis?.cancel()
    } else {
      // Turning autoplay ON: mark whatever is already on screen as
      // "spoken" so we don't suddenly read the whole existing chat.
      const last = [...messages].reverse().find((m) => m.role === "tutor")
      lastSpokenIdRef.current = last ? last.id : null
    }
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
          submoduleHits={submoduleHits}
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
          persona={tutorPersona}
          onOpenSettings={() => setSettingsOpen(true)}
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
                    onSpeak={(text) => speak(text, m.id)}
                    canSpeak={voiceSupport.synthesis}
                    isSpeaking={speakingId === m.id}
                    stream={streamRef.current.has(m.id)}
                    live={liveStreamingId === m.id}
                    liveContent={liveStreamingId === m.id ? liveTutorContent : undefined}
                    canCheck={m.meta?.kind === "lesson" && pendingCheck === null && lessonInFlight === null}
                    onSendCode={sendCodeToEditor}
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
              type="button"
              onClick={() => send("I'm stuck. Give me one specific hint to move me forward, but don't give me the full answer.")}
              disabled={pending || lessonInFlight !== null}
              title="Ask for a hint instead of typing"
              className="inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-rule bg-surface text-ink-faint transition-colors hover:border-amber/40 hover:bg-amber/8 hover:text-amber disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-rule disabled:hover:bg-surface disabled:hover:text-ink-faint"
            >
              <LightBulbIcon className="h-4 w-4" />
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
          onAskAI={(_code) => {
            const ld = langById(codeLang)
            // The sandbox snapshot is auto-attached inside send() so we
            // don't include the code in the prompt itself — otherwise it
            // ends up duplicated in the user message.
            send(`Review my ${ld.label} code. Is the logic correct? Any improvements?`)
          }}
          pending={pending}
          recommended={recommendedLanguages}
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

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        lang={tutorLang}
        onLangChange={setTutorLang}
        persona={tutorPersona}
        onPersonaChange={setTutorPersona}
        format={tutorFormat}
        onFormatChange={setTutorFormat}
        speakReplies={speakReplies}
        onToggleSpeak={toggleSpeakReplies}
        synthesisSupported={voiceSupport.synthesis}
        voiceForLang={voiceForLang}
      />
    </div>
  )
}

function SettingsModal({
  open,
  onClose,
  lang,
  onLangChange,
  persona,
  onPersonaChange,
  format,
  onFormatChange,
  speakReplies,
  onToggleSpeak,
  synthesisSupported,
  voiceForLang,
}: {
  open: boolean
  onClose: () => void
  lang: TutorLanguage
  onLangChange: (l: TutorLanguage) => void
  persona: TutorPersona
  onPersonaChange: (p: TutorPersona) => void
  format: TutorFormat
  onFormatChange: (f: TutorFormat) => void
  speakReplies: boolean
  onToggleSpeak: () => void
  synthesisSupported: boolean
  voiceForLang: Partial<Record<TutorLanguage, boolean>>
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" />
          <motion.div
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-rule bg-surface shadow-[0_32px_80px_-20px_hsl(218_45%_10%_/_0.35)]"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.24, ease: ease.outQuart }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-rule px-6 py-4">
              <h2 className="font-display text-[1.0625rem] font-medium text-ink">Tutor settings</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close settings"
                className="grid h-7 w-7 place-items-center rounded-full border border-rule text-ink-faint transition-colors hover:border-ink/30 hover:text-ink"
              >
                ×
              </button>
            </div>

            <div className="space-y-6 p-6">
              <div>
                <div className="text-[0.8125rem] font-medium text-ink-soft">Tutor language</div>
                <p className="mt-0.5 text-[0.75rem] text-ink-muted">
                  The tutor replies and reads aloud in this language.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(Object.keys(LANG_LABELS) as TutorLanguage[]).map((l) => {
                    const hasVoice = voiceForLang[l] === true
                    return (
                      <button
                        key={l}
                        type="button"
                        onClick={() => onLangChange(l)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.8125rem] font-medium transition-colors",
                          lang === l
                            ? "border-ink bg-ink text-paper"
                            : "border-rule bg-surface text-ink-soft hover:border-ink/30",
                        )}
                        title={
                          hasVoice
                            ? `${LANG_LABELS[l]} voice available`
                            : `${LANG_LABELS[l]} replies will be in text only; your device has no ${LANG_LABELS[l]} voice for read-aloud`
                        }
                      >
                        <span>{LANG_LABELS[l]}</span>
                        {synthesisSupported && !hasVoice && (
                          <span
                            aria-hidden
                            className={cn(
                              "text-[0.625rem]",
                              lang === l ? "text-paper/60" : "text-ink-faint",
                            )}
                          >
                            (no voice)
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
                {synthesisSupported && lang !== "en" && voiceForLang[lang] === false && (
                  <p className="mt-2 text-[0.75rem] leading-relaxed text-amber">
                    Your device has no {LANG_NAMES_EN[lang]} text-to-speech voice. Replies still come back in {LANG_NAMES_EN[lang]}, but the read-aloud button falls back to the default English voice. On Windows you can add a voice via Settings → Time & Language → Speech.
                  </p>
                )}
              </div>

              <div className="border-t border-rule pt-5">
                <div className="text-[0.8125rem] font-medium text-ink-soft">Teaching style</div>
                <p className="mt-0.5 text-[0.75rem] text-ink-muted">
                  How the tutor talks to you. Same curriculum, different voice.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(Object.keys(PERSONA_LABELS) as TutorPersona[]).map((p) => {
                    const active = persona === p
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => onPersonaChange(p)}
                        title={PERSONA_BLURBS[p]}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.8125rem] font-medium transition-colors",
                          active
                            ? "border-ink bg-ink text-paper"
                            : "border-rule bg-surface text-ink-soft hover:border-ink/30",
                        )}
                      >
                        <span>{PERSONA_LABELS[p]}</span>
                        {p === "socratic" && (
                          <span className={cn(
                            "rounded-full px-1.5 py-0.5 text-[0.5625rem] font-mono uppercase tracking-[0.15em]",
                            active ? "bg-paper/15 text-paper/80" : "bg-teal-soft text-teal",
                          )}>
                            new
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
                <p className="mt-2 text-[0.75rem] leading-snug text-ink-muted">
                  {PERSONA_BLURBS[persona]}
                </p>
                {persona === "socratic" && (
                  <p className="mt-1.5 text-[0.75rem] leading-relaxed text-amber">
                    Heads up: the tutor will not give answers outright in this mode. Expect leading questions back.
                  </p>
                )}
              </div>

              <div className="border-t border-rule pt-5">
                <div className="text-[0.8125rem] font-medium text-ink-soft">Response style</div>
                <p className="mt-0.5 text-[0.75rem] text-ink-muted">
                  How replies are shaped on the page.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(Object.keys(FORMAT_LABELS) as TutorFormat[]).map((f) => {
                    const active = format === f
                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() => onFormatChange(f)}
                        title={FORMAT_BLURBS[f]}
                        className={cn(
                          "inline-flex items-center rounded-full border px-3 py-1.5 text-[0.8125rem] font-medium transition-colors",
                          active
                            ? "border-ink bg-ink text-paper"
                            : "border-rule bg-surface text-ink-soft hover:border-ink/30",
                        )}
                      >
                        {FORMAT_LABELS[f]}
                      </button>
                    )
                  })}
                </div>
                <p className="mt-2 text-[0.75rem] leading-snug text-ink-muted">
                  {FORMAT_BLURBS[format]}
                </p>
              </div>

              <div className="border-t border-rule pt-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[0.8125rem] font-medium text-ink-soft">Autoplay voice</div>
                    <p className="mt-0.5 text-[0.75rem] text-ink-muted">
                      {synthesisSupported
                        ? "Read new replies aloud as they arrive. Existing chat is never auto-read. Hover any reply for a Play button."
                        : "Voice output isn't supported in this browser."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onToggleSpeak}
                    disabled={!synthesisSupported}
                    role="switch"
                    aria-checked={speakReplies}
                    className={cn(
                      "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                      !synthesisSupported
                        ? "cursor-not-allowed bg-rule opacity-40"
                        : speakReplies
                          ? "bg-forest"
                          : "bg-rule",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow transition-all",
                        speakReplies ? "left-[22px]" : "left-0.5",
                      )}
                    />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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
  enrollment, progressPct, lang, persona, onOpenSettings,
  sessions, sessionIndex, sessionLoading, onSwitchSession, onNewSession,
  sidebarOpen, onToggleSidebar, codeOpen, onToggleCode,
  onClearChat, canClearChat,
}: {
  enrollment: EnrollmentDetail
  progressPct: number
  lang: TutorLanguage
  persona: TutorPersona
  onOpenSettings: () => void
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
        <button
          type="button"
          onClick={onOpenSettings}
          className="inline-flex h-6 items-center gap-1.5 rounded-full border border-rule bg-paper px-3 font-mono text-[0.55rem] font-semibold uppercase tracking-[0.14em] text-ink-faint transition-colors hover:border-ink/20 hover:text-ink-soft"
        >
          <GearIcon className="h-2.5 w-2.5" />
          Settings
        </button>
        {lang !== "en" && (
          <span className="inline-flex items-center rounded-full bg-teal-soft px-2 py-0.5 text-[0.55rem] font-medium text-teal">
            {LANG_LABELS[lang]}
          </span>
        )}
        {persona === "socratic" && (
          <button
            type="button"
            onClick={onOpenSettings}
            title="Socratic mode: the tutor only asks leading questions. Click to change."
            className="inline-flex h-6 items-center gap-1.5 rounded-full border border-amber/40 bg-amber/10 px-2.5 font-mono text-[0.55rem] font-semibold uppercase tracking-[0.14em] text-amber transition-colors hover:border-amber/60"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber animate-pulse" />
            Socratic mode
          </button>
        )}

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
  { label: "Explain it simpler", prompt: "Explain that again, but simpler, like I'm new to this." },
  { label: "Give an example", prompt: "Give me a concrete, worked example of this." },
  { label: "Why does it matter?", prompt: "Why does this matter? Where would I actually use it?" },
  { label: "Common mistakes", prompt: "What do people most often get wrong about this?" },
  { label: "Quiz me", prompt: "Ask me a question to test if I understood this." },
]

// Renders tutor text. Three modes:
// - `live` (currently streaming over SSE): show the text as it grows, with a
//   blinking caret. The SSE deltas ARE the typewriter, so we don't add a
//   second one on top.
// - `stream` (just arrived from a non-streaming endpoint like /lesson): play
//   the classic typewriter reveal over the full text once.
// - neither: instant render (history messages).
function StreamedText({
  text,
  stream,
  live,
  onSendCode,
}: {
  text: string
  stream: boolean
  live?: boolean
  onSendCode?: (lang: CodeLang, code: string) => void
}) {
  // Hooks must always run in the same order, so we declare them
  // unconditionally and branch in the return. In `live` mode the count
  // state and interval are unused (we render `text` directly), but having
  // them present keeps React's hook order stable when `live` flips.
  const [count, setCount] = useState(stream && !live ? 0 : text.length)

  useEffect(() => {
    if (live) return
    if (!stream) { setCount(text.length); return }
    const total = text.length
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
    // Decision is fixed at mount; text is stable for a given non-live
    // message. `live` is checked inside but does not need to re-trigger
    // the typewriter setup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (live) {
    return (
      <div className="relative">
        <FormattedContent text={text} onSendCode={undefined} />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-0.5 right-0 inline-block h-[1.05em] w-[2px] animate-pulse bg-ink/50"
        />
      </div>
    )
  }

  const done = count >= text.length
  return (
    <>
      <FormattedContent text={text.slice(0, count)} onSendCode={done ? onSendCode : undefined} />
      {!done && (
        <span className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[0.15em] animate-pulse bg-ink/50" />
      )}
    </>
  )
}

function MessageBubble({ message, onCheck, onPrompt, onSpeak, canSpeak, isSpeaking, stream, live, liveContent, canCheck, onSendCode }: {
  message: ChatMessage
  onCheck: (i: number) => void
  onPrompt: (text: string) => void
  onSpeak: (text: string) => void
  canSpeak: boolean
  isSpeaking: boolean
  stream: boolean
  live: boolean
  liveContent?: string
  canCheck: boolean
  onSendCode?: (lang: CodeLang, code: string) => void
}) {
  const isUser = message.role === "user"
  const isLesson = message.meta?.kind === "lesson"
  const isCheckResult = message.meta?.kind === "check"

  return (
    <motion.div
      // While the tutor is streaming, suppress framer-motion's layout pass
      // for THIS bubble — height grows on every token, and animating that
      // grow looks like a constant jitter. Other bubbles keep `layout` so
      // new messages still slide in cleanly. Same for the entry animation:
      // the placeholder appears with empty content, so fading it in from
      // opacity:0 looks like a pop when the first token lands.
      layout={!live}
      initial={live ? false : { opacity: 0, y: 8 }}
      animate={live ? undefined : { opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: ease.outQuart }}
      className={cn("group flex gap-3", isUser ? "justify-end" : "justify-start")}
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
            <UserMessageContent text={message.content} />
          ) : (
            <StreamedText
              text={live && liveContent !== undefined ? liveContent : message.content}
              stream={stream}
              live={live}
              onSendCode={onSendCode}
            />
          )}
        </div>
        {!isUser && canSpeak && (
          <button
            type="button"
            onClick={() => onSpeak(message.content)}
            title={isSpeaking ? "Stop playback" : "Play this reply"}
            className={cn(
              "inline-flex items-center gap-1.5 self-start overflow-hidden rounded-full border px-2.5 py-1 text-[0.6875rem] font-medium transition-all duration-300 ease-out-quart group-hover:opacity-100",
              isSpeaking
                ? "border-teal/40 bg-teal-soft text-teal opacity-100"
                : "border-rule bg-surface text-ink-faint opacity-0 hover:border-ink/30 hover:text-ink",
            )}
          >
            <span className="relative grid h-2.5 w-2.5 place-items-center">
              <AnimatePresence initial={false} mode="wait">
                {isSpeaking ? (
                  <motion.span
                    key="stop"
                    initial={{ opacity: 0, scale: 0.6, rotate: -90 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.6, rotate: 90 }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0 grid place-items-center"
                  >
                    <StopIcon className="h-2.5 w-2.5" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="play"
                    initial={{ opacity: 0, scale: 0.6, rotate: 90 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.6, rotate: -90 }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0 grid place-items-center"
                  >
                    <SpeakerWaveIcon className="h-2.5 w-2.5" />
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
            <AnimatePresence initial={false} mode="wait">
              <motion.span
                key={isSpeaking ? "label-stop" : "label-play"}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
              >
                {isSpeaking ? "Stop" : "Play"}
              </motion.span>
            </AnimatePresence>
          </button>
        )}
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
              I'm ready, check me →
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

const LANG_EXT: Record<CodeLang, string> = {
  python: "py", javascript: "js", typescript: "ts", java: "java",
  cpp: "cpp", c: "c", go: "go", rust: "rs", kotlin: "kt",
  swift: "swift", ruby: "rb", sql: "sql",
}

type ScratchFile = { id: string; name: string; content: string }

type TermLine = { kind: "cmd" | "out" | "err" | "info"; text: string }

function CodePanel({ codeLang, onLangChange, code, onCodeChange, onClose, onAskAI, pending, recommended }: {
  codeLang: CodeLang
  onLangChange: (l: CodeLang) => void
  code: string
  onCodeChange: (text: string) => void
  onClose: () => void
  onAskAI: (code: string) => void
  pending: boolean
  recommended: CodeLang[]
}) {
  const [copied, setCopied] = useState(false)
  const [files, setFiles] = useState<ScratchFile[]>([])
  const [activeId, setActiveId] = useState<string>("solution")
  const [term, setTerm] = useState<TermLine[]>([])
  const [termOpen, setTermOpen] = useState(false)
  const [stdin, setStdin] = useState("")
  const [stdinOpen, setStdinOpen] = useState(false)
  const [running, setRunning] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const gutterInnerRef = useRef<HTMLDivElement>(null)

  const ld = langById(codeLang)
  const ext = LANG_EXT[codeLang]
  const solutionName = `solution.${ext}`
  const isSolution = activeId === "solution"
  const activeFile = files.find((f) => f.id === activeId)
  const activeContent = isSolution ? code : activeFile?.content ?? ""

  // Keep the line-number gutter aligned with the textarea by translating the
  // inner numbers element directly via DOM (not state) on every scroll. Using
  // `scrollTop` on the gutter would require `overflow: auto`, which paints a
  // scrollbar; `transform: translateY()` on `overflow: hidden` is silent.
  const syncGutterScroll = () => {
    const t = textareaRef.current
    const g = gutterInnerRef.current
    if (t && g) g.style.transform = `translateY(${-t.scrollTop}px)`
  }
  const lineCount = Math.max(1, activeContent.split("\n").length)

  function handleLangChange(next: CodeLang) {
    onLangChange(next)
    setActiveId("solution")
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  function setActiveContent(text: string) {
    if (isSolution) onCodeChange(text)
    else setFiles((prev) => prev.map((f) => (f.id === activeId ? { ...f, content: text } : f)))
  }

  function addFile() {
    const n = files.length + 1
    const id = `f-${Date.now()}`
    setFiles((prev) => [...prev, { id, name: `scratch${n}.${ext}`, content: "" }])
    setActiveId(id)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  function closeFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id))
    if (activeId === id) setActiveId("solution")
  }

  function copyCode() {
    navigator.clipboard.writeText(activeContent).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  function resetActiveToStarter() {
    if (isSolution) onCodeChange(ld.starter)
    else setFiles((prev) => prev.map((f) => (f.id === activeId ? { ...f, content: "" } : f)))
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  async function runActive() {
    if (running) return
    const name = isSolution ? solutionName : activeFile?.name ?? "file"
    const cmd = ld.runHint.replace(/solution\.\w+|Solution\.\w+/, name)
    setTerm((prev) => [...prev, { kind: "cmd", text: `$ ${cmd}` }])
    setTermOpen(true)
    setRunning(true)
    try {
      const result = await runViaPiston(codeLang, activeContent, stdin)
      setTerm((prev) => [
        ...prev,
        ...result.lines.map<TermLine>((text) => ({
          kind: result.ok ? "out" : "err",
          text,
        })),
      ])
    } finally {
      setRunning(false)
    }
  }

  // Editor key handlers: Tab inserts the lang's indent unit, Shift+Tab
  // dedents the current line, Ctrl/Cmd+Enter runs, Ctrl/Cmd+/ toggles a
  // line comment, Enter carries the previous line's leading whitespace.
  function onEditorKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const ta = e.currentTarget
    const { selectionStart: s, selectionEnd: en, value } = ta
    const mod = e.ctrlKey || e.metaKey

    if (mod && e.key === "Enter") {
      e.preventDefault()
      void runActive()
      return
    }

    if (mod && e.key === "/") {
      e.preventDefault()
      const start = value.lastIndexOf("\n", s - 1) + 1
      const endLineEnd = (() => {
        const next = value.indexOf("\n", en)
        return next === -1 ? value.length : next
      })()
      const block = value.slice(start, endLineEnd)
      const lines = block.split("\n")
      const prefix = ld.comment
      const allCommented = lines.every((l) => l.trim() === "" || l.trimStart().startsWith(prefix.trim()))
      const next = lines
        .map((l) => {
          if (allCommented) {
            const idx = l.indexOf(prefix.trim())
            if (idx === -1) return l
            // Remove the prefix plus its trailing space if present.
            const head = l.slice(0, idx)
            const rest = l.slice(idx + prefix.trim().length).replace(/^ /, "")
            return head + rest
          }
          if (l.trim() === "") return l
          return prefix + l
        })
        .join("\n")
      const newValue = value.slice(0, start) + next + value.slice(endLineEnd)
      setActiveContent(newValue)
      const delta = next.length - block.length
      requestAnimationFrame(() => {
        ta.setSelectionRange(s + (allCommented ? 0 : prefix.length), en + delta)
      })
      return
    }

    if (e.key === "Tab") {
      e.preventDefault()
      const indent = ld.indent
      // Multi-line selection: indent / outdent every covered line.
      if (s !== en && value.slice(s, en).includes("\n")) {
        const blockStart = value.lastIndexOf("\n", s - 1) + 1
        const blockEnd = (() => {
          const next = value.indexOf("\n", en)
          return next === -1 ? value.length : next
        })()
        const block = value.slice(blockStart, blockEnd)
        const lines = block.split("\n")
        const transformed = e.shiftKey
          ? lines.map((l) => l.startsWith(indent) ? l.slice(indent.length) : l.replace(/^ {1,4}|^\t/, ""))
          : lines.map((l) => indent + l)
        const next = transformed.join("\n")
        const newValue = value.slice(0, blockStart) + next + value.slice(blockEnd)
        setActiveContent(newValue)
        const delta = next.length - block.length
        requestAnimationFrame(() => {
          ta.setSelectionRange(s + (e.shiftKey ? -indent.length : indent.length), en + delta)
        })
        return
      }
      // Shift+Tab on a single line: trim one level of leading indent.
      if (e.shiftKey) {
        const lineStart = value.lastIndexOf("\n", s - 1) + 1
        const head = value.slice(lineStart, s)
        if (head.startsWith(indent)) {
          const newValue = value.slice(0, lineStart) + head.slice(indent.length) + value.slice(s)
          setActiveContent(newValue)
          requestAnimationFrame(() => ta.setSelectionRange(s - indent.length, en - indent.length))
        }
        return
      }
      // Plain Tab: insert indent at cursor (or replace selection).
      const newValue = value.slice(0, s) + indent + value.slice(en)
      setActiveContent(newValue)
      requestAnimationFrame(() => ta.setSelectionRange(s + indent.length, s + indent.length))
      return
    }

    if (e.key === "Enter" && !e.shiftKey) {
      // Auto-carry leading whitespace from the current line so blocks
      // stay aligned without the student manually re-indenting.
      const lineStart = value.lastIndexOf("\n", s - 1) + 1
      const currentLine = value.slice(lineStart, s)
      const leading = currentLine.match(/^[ \t]*/)?.[0] ?? ""
      if (leading.length > 0) {
        e.preventDefault()
        const insert = "\n" + leading
        const newValue = value.slice(0, s) + insert + value.slice(en)
        setActiveContent(newValue)
        requestAnimationFrame(() => ta.setSelectionRange(s + insert.length, s + insert.length))
      }
    }
  }

  const hasCode = activeContent.trim() !== "" && activeContent.trim() !== ld.starter.trim()
  const tabs = [{ id: "solution", name: solutionName }, ...files]

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Toolbar — single row at any panel width above 280px. Labelled
          controls (lang / Run / Input) on the left; secondary actions on
          the right are bundled into one icon pill (Terminal · Reset · Copy
          · Close) so the row never wraps. */}
      <div className="flex shrink-0 items-center gap-1.5 border-b border-rule bg-surface-soft px-2.5 py-1.5">
        <LangDropdown value={codeLang} onChange={handleLangChange} recommended={recommended} />
        <button
          type="button"
          onClick={() => void runActive()}
          disabled={running}
          title="Run (Ctrl/Cmd + Enter)"
          className={cn(
            "inline-flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-2.5 font-mono text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-paper transition-colors",
            running ? "cursor-wait bg-forest/60" : "bg-forest hover:bg-forest/85",
          )}
        >
          <span aria-hidden>▶</span>
          {running ? "Running…" : "Run"}
        </button>
        <button
          type="button"
          onClick={() => setStdinOpen((v) => !v)}
          title="Input the program reads from stdin (e.g. Python input(), Java Scanner). Leave off if your code does not read input."
          className={cn(
            "inline-flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border px-2 font-mono text-[0.625rem] font-semibold uppercase tracking-[0.1em] transition-colors",
            stdinOpen ? "border-teal/40 bg-teal-soft text-teal" : "border-rule bg-paper text-ink-faint hover:text-ink-soft",
          )}
        >
          Input
          {stdin && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-teal" />}
        </button>

        {/* Grouped icon cluster on the right: four flush-edged buttons
            share a single border to read as one IDE-chrome component. */}
        <div className="ml-auto flex h-7 shrink-0 items-stretch overflow-hidden rounded-lg border border-rule bg-paper">
          <button
            type="button"
            onClick={() => setTermOpen((v) => !v)}
            title={termOpen ? "Hide terminal" : "Show terminal"}
            aria-label={termOpen ? "Hide terminal" : "Show terminal"}
            aria-pressed={termOpen}
            className={cn(
              "grid w-7 place-items-center transition-colors",
              termOpen ? "bg-ink text-paper" : "text-ink-faint hover:bg-surface-soft hover:text-ink-soft",
            )}
          >
            <TerminalIcon className="h-3.5 w-3.5" />
          </button>
          <span className="w-px self-stretch bg-rule" aria-hidden />
          <button
            type="button"
            onClick={resetActiveToStarter}
            title="Reset file to starter template"
            aria-label="Reset file"
            className="grid w-7 place-items-center text-ink-faint transition-colors hover:bg-surface-soft hover:text-ink-soft"
          >
            <ResetIcon className="h-3.5 w-3.5" />
          </button>
          <span className="w-px self-stretch bg-rule" aria-hidden />
          <button
            type="button"
            onClick={copyCode}
            disabled={!activeContent.trim()}
            title={copied ? "Copied!" : "Copy file contents"}
            aria-label="Copy file"
            className="grid w-7 place-items-center text-ink-faint transition-colors hover:bg-surface-soft hover:text-ink-soft disabled:opacity-40 disabled:hover:bg-transparent"
          >
            {copied ? <CheckIcon className="h-3.5 w-3.5 text-forest" /> : <CopyIcon className="h-3.5 w-3.5" />}
          </button>
          <span className="w-px self-stretch bg-rule" aria-hidden />
          <button
            type="button"
            onClick={onClose}
            title="Close editor"
            aria-label="Close editor"
            className="grid w-7 place-items-center text-ink-faint transition-colors hover:bg-surface-soft hover:text-ink-soft"
          >
            <CloseIcon className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* File tabs */}
      <div className="flex shrink-0 items-stretch overflow-x-auto border-b border-rule bg-surface">
        {tabs.map((t) => {
          const active = t.id === activeId
          return (
            <div
              key={t.id}
              className={cn(
                "group flex items-center gap-1.5 border-r border-rule px-3 py-1.5 font-mono text-[0.6875rem] transition-colors",
                active ? "bg-paper-deep text-ink" : "bg-surface text-ink-faint hover:text-ink-soft",
              )}
            >
              <button type="button" onClick={() => setActiveId(t.id)} className="whitespace-nowrap">
                {t.name}
              </button>
              {t.id !== "solution" && (
                <button
                  type="button"
                  onClick={() => closeFile(t.id)}
                  aria-label={`Close ${t.name}`}
                  className="text-ink-faint opacity-0 transition-opacity hover:text-terracotta group-hover:opacity-100"
                >
                  ×
                </button>
              )}
            </div>
          )
        })}
        <button
          type="button"
          onClick={addFile}
          title="New file"
          className="px-3 py-1.5 font-mono text-[0.8125rem] text-ink-faint transition-colors hover:text-ink"
        >
          +
        </button>
      </div>

      {/* Editor: gutter + textarea share font / size / line-height so line
          numbers align. The gutter wrapper is overflow:hidden and the inner
          numbers element is translated vertically on every textarea scroll
          via syncGutterScroll(). */}
      <div className="flex min-h-0 flex-1 bg-paper-deep">
        <div
          aria-hidden
          className="relative shrink-0 select-none overflow-hidden border-r border-rule/60 bg-paper-deep"
          style={{ minWidth: `${String(lineCount).length + 2}ch` }}
        >
          <div
            ref={gutterInnerRef}
            className="px-2 py-4 text-right font-mono text-[0.8125rem] leading-relaxed text-ink-faint/60 will-change-transform"
          >
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i} className="tabular">{i + 1}</div>
            ))}
          </div>
        </div>
        <textarea
          ref={textareaRef}
          value={activeContent}
          onChange={(e) => setActiveContent(e.target.value)}
          onKeyDown={onEditorKeyDown}
          onScroll={syncGutterScroll}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          className="min-h-0 flex-1 resize-none bg-paper-deep px-4 py-4 font-mono text-[0.8125rem] leading-relaxed text-ink-soft outline-none"
          placeholder={`${ld.comment}${isSolution ? solutionName : activeFile?.name}\n${ld.comment}Write your ${ld.label} code here…`}
        />
      </div>

      {/* Input pane: feeds Piston's `stdin` field. Hidden by default to keep
          the editor uncluttered for problems that don't read input. The
          tooltip-style hint below explains what this is in plain English,
          because "stdin" is jargon for someone learning their first language. */}
      {stdinOpen && (
        <div className="shrink-0 border-t border-rule bg-surface-soft px-3 py-2">
          <div className="mb-1 flex items-start justify-between gap-2">
            <p className="text-[0.6875rem] leading-snug text-ink-muted">
              Type lines here that your program will read as input.
              {" "}
              <span className="text-ink-faint">
                Only needed if your code calls things like{" "}
                <code className="rounded bg-paper px-1 font-mono text-[0.625rem] text-ink-soft">input()</code>
                {" "}or{" "}
                <code className="rounded bg-paper px-1 font-mono text-[0.625rem] text-ink-soft">Scanner</code>.
              </span>
            </p>
            {stdin && (
              <button
                type="button"
                onClick={() => setStdin("")}
                className="shrink-0 font-mono text-[0.5625rem] uppercase tracking-[0.14em] text-ink-faint transition-colors hover:text-ink-soft"
              >
                Clear
              </button>
            )}
          </div>
          <textarea
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            rows={2}
            spellCheck={false}
            placeholder={'One value per line, e.g.\n5\nworld'}
            className="h-16 w-full resize-none rounded border border-rule bg-paper px-2 py-1.5 font-mono text-[0.75rem] leading-relaxed text-ink-soft placeholder:text-ink-faint focus:border-ink/30 focus:outline-none"
          />
        </div>
      )}

      {/* Terminal */}
      {termOpen && (
        <div className="flex h-44 shrink-0 flex-col border-t border-rule bg-ink">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
            <span className="font-mono text-[0.5625rem] uppercase tracking-[0.16em] text-paper/60">
              Terminal · sandboxed by piston
            </span>
            <button
              type="button"
              onClick={() => setTerm([])}
              className="font-mono text-[0.5625rem] uppercase tracking-[0.14em] text-paper/50 transition-colors hover:text-paper"
            >
              Clear
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2 font-mono text-[0.75rem] leading-relaxed text-paper/85">
            {term.length === 0 ? (
              <span className="text-paper/40">
                Press Run (or Ctrl/Cmd + Enter) to execute the active file.
              </span>
            ) : (
              term.map((line, i) => (
                <div
                  key={i}
                  className={cn(
                    "whitespace-pre-wrap",
                    line.kind === "cmd" && "text-forest",
                    line.kind === "err" && "text-terracotta/90",
                    line.kind === "info" && "text-paper/60",
                  )}
                >
                  {line.text}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="shrink-0 border-t border-rule bg-surface-soft px-4 py-3">
        <button
          type="button"
          onClick={() => onAskAI(activeContent)}
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
  submoduleHits,
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
  submoduleHits: Map<number, Map<string, number>>
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
    submoduleHits,
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
              href={`/learn/${enrollment.bounty.slug}/quiz`}
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
// Render what the student typed. Critically, this does NOT use the
// `MarkdownBlocks` pipeline — that pipeline forces `text-ink-soft` on every
// <p>, which lands as near-black text on the user bubble's near-black
// `bg-ink` (the "fully black text box" bug). We inherit colour from the
// bubble instead, so the user's text reads as `text-paper` and stays
// legible. Code fences still get their own dark-on-dark-but-distinct
// surface, matching the editorial code style elsewhere.
function UserMessageContent({ text }: { text: string }) {
  // We render code blocks the student sent as a collapsed file attachment
  // so a long paste does not overflow the bubble. The "[My current X code
  // in the sandbox]" auto-prelude that send() adds is stripped from the
  // visible prose, since the file chip already conveys the same thing.
  const sandboxPrefixRe = /\n*\[My current ([^\]]+) code in the sandbox\]\n*```([a-zA-Z+#-]*)/
  const cleaned = text
    .replace(sandboxPrefixRe, "\n```$2")
    .trim()

  const fenced = cleaned.split(/(```[a-zA-Z+#-]*\n?[\s\S]*?```)/g)
  return (
    <>
      {fenced.map((chunk, i) => {
        if (chunk.startsWith("```")) {
          const fenceMatch = chunk.match(/^```([a-zA-Z+#-]*)\n?/)
          const lang = fenceMatch?.[1] ?? ""
          const inner = chunk
            .replace(/^```[a-zA-Z+#-]*\n?/, "")
            .replace(/```$/, "")
          return <CollapsibleCodeAttachment key={i} lang={lang} code={inner} />
        }
        if (!chunk.trim()) return null
        return (
          <p
            key={i}
            className="whitespace-pre-wrap text-[0.9375rem] leading-relaxed [&:not(:first-child)]:mt-2"
          >
            {chunk}
          </p>
        )
      })}
    </>
  )
}

function CollapsibleCodeAttachment({
  lang,
  code,
}: {
  lang: string
  code: string
}) {
  const [open, setOpen] = useState(false)
  const meta = fileMetaForLang(lang)
  const lineCount = code.split("\n").length

  return (
    <div className="my-3 overflow-hidden rounded-lg border border-paper/20 bg-paper/[0.06]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-paper/90 transition-colors hover:bg-paper/[0.04]"
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-paper/15 font-mono text-[0.625rem] font-semibold uppercase tracking-wide text-paper">
          {meta.badge}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-mono text-[0.8125rem] text-paper">
            {meta.filename}
          </span>
          <span className="block font-mono text-[0.625rem] uppercase tracking-[0.18em] text-paper/55">
            {meta.label} · {lineCount} {lineCount === 1 ? "line" : "lines"}
          </span>
        </span>
        <span
          aria-hidden
          className={cn(
            "shrink-0 text-paper/60 transition-transform",
            open && "rotate-90",
          )}
        >
          ›
        </span>
      </button>
      {open && (
        <pre className="max-h-[60vh] overflow-auto border-t border-paper/15 bg-ink-soft px-4 py-3 font-mono text-[0.8125rem] leading-[1.7] text-paper">
          <code>{code}</code>
        </pre>
      )}
    </div>
  )
}

function fileMetaForLang(lang: string): {
  label: string
  filename: string
  badge: string
} {
  const lower = lang.toLowerCase()
  if (lower === "python" || lower === "py")
    return { label: "Python", filename: "solution.py", badge: "py" }
  if (lower === "javascript" || lower === "js")
    return { label: "JavaScript", filename: "solution.js", badge: "js" }
  if (lower === "typescript" || lower === "ts")
    return { label: "TypeScript", filename: "solution.ts", badge: "ts" }
  if (lower === "java")
    return { label: "Java", filename: "Solution.java", badge: "java" }
  if (lower === "cpp" || lower === "c++")
    return { label: "C++", filename: "solution.cpp", badge: "cpp" }
  if (lower === "c") return { label: "C", filename: "solution.c", badge: "c" }
  if (lower === "rust" || lower === "rs")
    return { label: "Rust", filename: "solution.rs", badge: "rs" }
  if (lower === "go")
    return { label: "Go", filename: "solution.go", badge: "go" }
  if (lower === "ruby" || lower === "rb")
    return { label: "Ruby", filename: "solution.rb", badge: "rb" }
  if (lower === "sol" || lower === "solidity")
    return { label: "Solidity", filename: "Contract.sol", badge: "sol" }
  if (!lower) return { label: "Code", filename: "snippet.txt", badge: "txt" }
  return { label: lang, filename: `snippet.${lower}`, badge: lower.slice(0, 4) }
}

function FormattedContent({
  text,
  onSendCode,
}: {
  text: string
  onSendCode?: (lang: CodeLang, code: string) => void
}) {
  // 1) Split out code fences so we don't apply inline markdown inside them.
  // The trailing `(?:```|$)` makes the regex match unclosed fences too — so
  // mid-stream, an opening ``` immediately renders as a code block instead
  // of flickering through inline text and snapping into <pre> when the
  // closing ``` finally arrives. The "is this fence closed?" check below
  // hides the "Send to editor" action until the block is complete.
  const fenced = text.split(/(```[a-zA-Z+#-]*\n?[\s\S]*?(?:```|$))/g)
  return (
    <>
      {fenced.map((chunk, i) => {
        if (chunk.startsWith("```")) {
          const fenceMatch = chunk.match(/^```([a-zA-Z+#-]*)\n?/)
          const fenceLang = fenceMatch?.[1] ?? ""
          const isClosed = /```$/.test(chunk) && chunk.length > 3
          const inner = chunk.replace(/^```[a-zA-Z+#-]*\n?/, "").replace(/```$/, "")
          const targetLang = fenceToLang(fenceLang)
          return (
            <div key={i} className="my-5">
              <pre className="overflow-x-auto rounded-xl border border-rule bg-paper-deep px-5 py-4 font-mono text-[0.8125rem] leading-[1.7] text-ink-soft">
                <code>{inner}</code>
              </pre>
              {isClosed && (targetLang || inner.trim()) && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 px-1">
                  {targetLang && onSendCode && (
                    <button
                      type="button"
                      onClick={() => onSendCode(targetLang, inner)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-teal/40 bg-teal-soft px-2.5 py-0.5 font-mono text-[0.5625rem] uppercase tracking-[0.14em] text-teal transition-colors hover:bg-teal/15"
                    >
                      Send to editor · {langById(targetLang).label}
                    </button>
                  )}
                  <CopyFenceButton text={inner} />
                </div>
              )}
            </div>
          )
        }
        return <MarkdownBlocks key={i} text={chunk} />
      })}
    </>
  )
}

function CopyFenceButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1600)
        })
      }}
      className="inline-flex items-center rounded-full border border-rule bg-surface px-2.5 py-0.5 font-mono text-[0.5625rem] uppercase tracking-[0.14em] text-ink-faint transition-colors hover:text-ink-soft"
    >
      {copied ? "Copied" : "Copy"}
    </button>
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

function CopyIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></svg>
}

function ResetIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></svg>
}

function TerminalIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden><path d="m5 8 4 4-4 4" /><path d="M12 18h7" /></svg>
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

function LightBulbIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden><path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7c.7.6 1 1.5 1 2.3v1h6v-1c0-.8.3-1.7 1-2.3A7 7 0 0 0 12 2Z" /></svg>
}

function SpeakerWaveIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden><path d="M11 5 6 9H3v6h3l5 4z" /><path d="M16 8a5 5 0 0 1 0 8" /><path d="M19 5a9 9 0 0 1 0 14" /></svg>
}

function StopIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
}

function SparkleIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" /><circle cx="12" cy="12" r="3" /></svg>
}

function GearIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
}
