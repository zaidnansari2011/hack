// Client-side learning-path layer.
//
// The backend syllabus is a flat SyllabusModule[] with one-line summaries
// and no explicit submodules. This file derives a structured learning
// path on top of that flat list:
//
//   - The module summary is split into 2-4 submodules (each a short topic
//     phrase) so the sidebar can show "what's inside this module".
//   - A submodule turns green once the student has touched it enough in
//     conversation (see submoduleHits arg), or once the parent module is
//     fully mastered.
//   - Modules unlock in order: module i is locked until module i-1 is
//     mastered. Module 0 is always open.
//   - The "current" module is the first unlocked, not-yet-mastered module.
//
// Notes + last position are persisted to localStorage, keyed by enrollment.

import type { SyllabusModule } from "@pol/shared"

export type SubStepKind = "submodule" | "mastery"

export type SubStepStatus = "done" | "active" | "todo"

export type SubStep = {
  kind: SubStepKind
  label: string
  status: SubStepStatus
  // Match keywords used to detect when the student is asking about this
  // submodule. Lowercased single words/phrases. Empty for the mastery row.
  keywords: string[]
}

export type ModuleStatus = "completed" | "seen" | "open" | "locked"

export type ModuleNode = {
  index: number
  title: string
  durationMinutes: number
  status: ModuleStatus
  locked: boolean
  isCurrent: boolean
  subSteps: SubStep[]
}

// Threshold for promoting a submodule from "active" to "done" based on the
// number of qualifying student turns about it. Two on-topic questions feels
// like enough engagement to call a topic covered without being so strict
// that students never see the dot turn green.
const SUBMODULE_DONE_THRESHOLD = 2

const STOPWORDS = new Set([
  "the","a","an","and","or","of","to","in","on","for","with","is","are",
  "be","by","at","its","it","this","that","these","those","into","from",
  "as","vs","why","how","what","when","where","not","no","one","each",
  "many","few","both","etc","ie","eg","plus","over","under","across",
])

/**
 * Derive submodules from a module summary. We split on punctuation/`and`
 * boundaries, drop leading articles, and cap at 4 submodules so the
 * sidebar stays scannable.
 */
export function extractSubmodules(
  summary: string,
): { label: string; keywords: string[] }[] {
  if (!summary?.trim()) return []
  const parts = summary
    .replace(/\s+/g, " ")
    .trim()
    // Strip trailing punctuation so the last segment isn't ".".
    .replace(/[.]+\s*$/, "")
    .split(/\s*(?:[.;,]|\s+and\s+|\s+vs\.?\s+|\s+then\s+)\s*/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 1)
  const labels = parts.slice(0, 4).map(prettifyLabel)
  // Fallback: if splitting produced nothing useful, treat the whole summary
  // as a single submodule.
  if (labels.length === 0) labels.push(prettifyLabel(summary))
  return labels.map((label) => ({
    label,
    keywords: keywordsFor(label),
  }))
}

function prettifyLabel(s: string): string {
  const trimmed = s
    .replace(/^[-–—•\s]+/, "")
    .replace(/\s+$/, "")
    .replace(/^[a-z]/, (c) => c.toUpperCase())
  // Cap length so a long clause doesn't blow up the sidebar.
  return trimmed.length > 48 ? `${trimmed.slice(0, 45)}…` : trimmed
}

function keywordsFor(label: string): string[] {
  return Array.from(
    new Set(
      label
        .toLowerCase()
        .replace(/[^a-z0-9\s+#./-]/g, " ")
        .split(/\s+/)
        .map((w) => w.replace(/^['"]+|['"]+$/g, ""))
        .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
    ),
  )
}

export function buildLearningPath(
  syllabus: SyllabusModule[],
  mastered: Set<number>,
  viewed: Set<number>,
  activeModuleIndex: number | null,
  submoduleHits: Map<number, Map<string, number>> = new Map(),
): { nodes: ModuleNode[]; currentIndex: number | null; allMastered: boolean } {
  // First unlocked module that isn't mastered yet — the smart "current" target.
  let currentIndex: number | null = null
  for (let i = 0; i < syllabus.length; i++) {
    const unlocked = i === 0 || mastered.has(i - 1)
    if (unlocked && !mastered.has(i)) {
      currentIndex = i
      break
    }
  }

  const nodes: ModuleNode[] = syllabus.map((m, i) => {
    const isMastered = mastered.has(i)
    const isViewed = viewed.has(i)
    const locked = i !== 0 && !mastered.has(i - 1) && !isViewed && !isMastered

    let status: ModuleStatus
    if (isMastered) status = "completed"
    else if (locked) status = "locked"
    else if (isViewed || activeModuleIndex === i) status = "seen"
    else status = "open"

    const subs = extractSubmodules(m.summary)
    const hitsForModule = submoduleHits.get(i)
    const subSteps: SubStep[] = subs.map((s) => {
      const hits = hitsForModule?.get(s.label) ?? 0
      let subStatus: SubStepStatus
      if (isMastered || hits >= SUBMODULE_DONE_THRESHOLD) subStatus = "done"
      else if (hits > 0) subStatus = "active"
      else subStatus = "todo"
      return { kind: "submodule", label: s.label, status: subStatus, keywords: s.keywords }
    })

    const masteryStatus: SubStepStatus = isMastered
      ? "done"
      : isViewed
        ? "active"
        : "todo"
    subSteps.push({ kind: "mastery", label: "Mastery check", status: masteryStatus, keywords: [] })

    return {
      index: i,
      title: m.module,
      durationMinutes: m.durationMinutes,
      status,
      locked,
      isCurrent: currentIndex === i,
      subSteps,
    }
  })

  const allMastered =
    syllabus.length > 0 && syllabus.every((_, i) => mastered.has(i))

  return { nodes, currentIndex, allMastered }
}

export function masteryProgress(
  syllabus: SyllabusModule[],
  mastered: Set<number>,
): { done: number; total: number; pct: number } {
  const total = syllabus.length
  const done = syllabus.reduce((n, _, i) => n + (mastered.has(i) ? 1 : 0), 0)
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) }
}

// ─── Notes (localStorage, per enrollment) ────────────────────────────────────

export type Note = {
  id: string
  text: string
  moduleIndex: number | null
  createdAt: string
}

const notesKey = (enrollmentId: string) => `pol:notes:${enrollmentId}`
const resumeKey = (enrollmentId: string) => `pol:resume:${enrollmentId}`

export function loadNotes(enrollmentId: string): Note[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(notesKey(enrollmentId))
    return raw ? (JSON.parse(raw) as Note[]) : []
  } catch {
    return []
  }
}

export function saveNotes(enrollmentId: string, notes: Note[]): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(notesKey(enrollmentId), JSON.stringify(notes))
  } catch {
    // storage full / unavailable — non-fatal
  }
}

export function rememberPosition(enrollmentId: string, moduleIndex: number): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(resumeKey(enrollmentId), String(moduleIndex))
  } catch {
    // non-fatal
  }
}

export function recallPosition(enrollmentId: string): number | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(resumeKey(enrollmentId))
    if (raw === null) return null
    const n = Number(raw)
    return Number.isInteger(n) && n >= 0 ? n : null
  } catch {
    return null
  }
}
