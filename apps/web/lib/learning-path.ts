// Client-side learning-path layer.
//
// The backend syllabus is a flat SyllabusModule[] with no submodules,
// prerequisites, or per-step progress. This module derives a structured
// learning path on top of that flat list:
//
//   - Each module breaks into two honest sub-steps we already track:
//       1. "Lesson"  — done once the module has been taught/viewed
//       2. "Mastery" — done once the module is mastered (3-in-a-row check)
//   - Modules unlock in order: module i is locked until module i-1 is
//     mastered. Module 0 is always open.
//   - The "current" module is the first unlocked, not-yet-mastered module.
//
// Notes + last position are persisted to localStorage, keyed by enrollment.

import type { SyllabusModule } from "@pol/shared"

export type SubStepKind = "lesson" | "mastery"

export type SubStepStatus = "done" | "active" | "todo"

export type SubStep = {
  kind: SubStepKind
  label: string
  status: SubStepStatus
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

export function buildLearningPath(
  syllabus: SyllabusModule[],
  mastered: Set<number>,
  viewed: Set<number>,
  activeModuleIndex: number | null,
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

    const lessonStatus: SubStepStatus = isViewed || isMastered ? "done" : "todo"
    const masteryStatus: SubStepStatus = isMastered
      ? "done"
      : isViewed
        ? "active"
        : "todo"

    return {
      index: i,
      title: m.module,
      durationMinutes: m.durationMinutes,
      status,
      locked,
      isCurrent: currentIndex === i,
      subSteps: [
        { kind: "lesson", label: "Lesson", status: lessonStatus },
        { kind: "mastery", label: "Mastery check", status: masteryStatus },
      ],
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
