import type { Prisma, QuizSession as PrismaQuizSession } from "@prisma/client"
import type { QuizQuestion, QuizResult, QuizSession } from "@pol/shared"

import { prisma } from "@/db/prisma"
import { logger } from "@/config/logger"
import { Conflict, Forbidden, NotFound, ValidationError } from "@/lib/errors"
import { applyPermutation, permutation, unshuffleIndex } from "./shuffle"

export const QUIZ_QUESTION_COUNT = 5
export const QUIZ_DURATION_SECONDS = 8 * 60
export const QUIZ_PASS_THRESHOLD = 60 // percent

type Fingerprint = Record<string, unknown>

function shuffleSeed(sessionId: string, questionId: string): string {
  return `${sessionId}:${questionId}`
}

/**
 * Pick N random questions from the curriculum's pool. We sample without
 * replacement, weighted toward an even spread of topics where possible.
 */
async function pickQuestionIds(
  curriculumId: string,
  n: number,
): Promise<string[]> {
  const all = await prisma.question.findMany({
    where: { curriculumId },
    select: { id: true, topic: true },
  })
  if (all.length === 0) {
    throw new Error("No questions seeded for this curriculum")
  }

  // Group by topic, then take 1 per topic round-robin until we hit N.
  const buckets = new Map<string, string[]>()
  for (const q of all) {
    const key = q.topic ?? "general"
    const arr = buckets.get(key) ?? []
    arr.push(q.id)
    buckets.set(key, arr)
  }
  for (const arr of buckets.values()) {
    arr.sort(() => Math.random() - 0.5)
  }

  const picked: string[] = []
  const queues = Array.from(buckets.values())
  while (picked.length < n) {
    let advanced = false
    for (const q of queues) {
      const next = q.shift()
      if (next !== undefined) {
        picked.push(next)
        advanced = true
        if (picked.length === n) break
      }
    }
    if (!advanced) break
  }
  return picked.slice(0, Math.min(n, all.length))
}

function toClientSession(args: {
  session: PrismaQuizSession
  questions: { id: string; prompt: string; choices: string[] }[]
}): QuizSession {
  const clientQuestions: QuizQuestion[] = args.questions.map((q) => {
    const perm = permutation(
      shuffleSeed(args.session.id, q.id),
      q.choices.length,
    )
    return {
      id: q.id,
      prompt: q.prompt,
      choices: applyPermutation(q.choices, perm),
    }
  })

  return {
    id: args.session.id,
    enrollmentId: args.session.enrollmentId,
    status: args.session.status,
    questions: clientQuestions,
    startedAt: args.session.startedAt.toISOString(),
    expiresAt: args.session.expiresAt.toISOString(),
    durationSeconds: QUIZ_DURATION_SECONDS,
    scorePct: args.session.scorePct,
    passed: args.session.passed,
  }
}

async function loadEnrollment(args: { enrollmentId: string; userId: string }) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: args.enrollmentId },
    include: { bounty: true },
  })
  if (!enrollment) throw NotFound("Enrollment not found")
  if (enrollment.studentId !== args.userId) throw Forbidden()
  return enrollment
}

// ─── Start a quiz session ────────────────────────────────────────────────────
export async function startQuiz(args: {
  userId: string
  enrollmentId: string
}): Promise<QuizSession> {
  const enrollment = await loadEnrollment(args)
  if (enrollment.status === "completed") {
    throw Conflict("This enrollment is already complete")
  }

  // If an active in-progress session exists, return it (idempotent restart-safe).
  const existing = await prisma.quizSession.findFirst({
    where: {
      enrollmentId: enrollment.id,
      status: "in_progress",
      expiresAt: { gt: new Date() },
    },
  })
  if (existing) {
    const questions = await prisma.question.findMany({
      where: { id: { in: existing.questionIds } },
      select: { id: true, prompt: true, choices: true },
    })
    // Re-order to match the stored questionIds order.
    const ordered = existing.questionIds
      .map((id) => questions.find((q) => q.id === id))
      .filter((q): q is { id: string; prompt: string; choices: string[] } =>
        Boolean(q),
      )
    return toClientSession({ session: existing, questions: ordered })
  }

  const ids = await pickQuestionIds(enrollment.bounty.curriculumId, QUIZ_QUESTION_COUNT)
  if (ids.length === 0) throw new Error("No questions available")

  const expiresAt = new Date(Date.now() + QUIZ_DURATION_SECONDS * 1000)
  const session = await prisma.quizSession.create({
    data: {
      enrollmentId: enrollment.id,
      studentId: args.userId,
      status: "in_progress",
      questionIds: ids,
      expiresAt,
    },
  })

  const questions = await prisma.question.findMany({
    where: { id: { in: ids } },
    select: { id: true, prompt: true, choices: true },
  })
  const ordered = ids
    .map((id) => questions.find((q) => q.id === id))
    .filter((q): q is { id: string; prompt: string; choices: string[] } => Boolean(q))

  logger.info(
    { sessionId: session.id, enrollmentId: enrollment.id, questionCount: ids.length },
    "quiz started",
  )

  return toClientSession({ session, questions: ordered })
}

// ─── Submit ──────────────────────────────────────────────────────────────────
export type SubmitArgs = {
  userId: string
  sessionId: string
  answers: { questionId: string; choiceIndex: number }[]
  fingerprint?: Fingerprint
}

export type SubmitOutcome = {
  result: QuizResult
  newlyPassed: boolean
  enrollmentId: string
}

/**
 * Score a quiz submission and persist the outcome. Returns whether this
 * submission *just now* flipped the session from in-progress to passed —
 * callers can use that to gate downstream side effects (payouts, on-chain
 * proof) so retries don't double-fire.
 */
export async function submitQuiz(args: SubmitArgs): Promise<SubmitOutcome> {
  const session = await prisma.quizSession.findUnique({
    where: { id: args.sessionId },
  })
  if (!session) throw NotFound("Quiz session not found")
  if (session.studentId !== args.userId) throw Forbidden()
  if (session.status !== "in_progress") {
    throw Conflict("This quiz has already been submitted")
  }
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.quizSession.update({
      where: { id: session.id },
      data: { status: "expired" },
    })
    throw Conflict("This quiz session has expired — start a new one")
  }

  // Load original (un-shuffled) questions.
  const questions = await prisma.question.findMany({
    where: { id: { in: session.questionIds } },
    select: { id: true, choices: true, correctIndex: true },
  })
  const byId = new Map(questions.map((q) => [q.id, q]))

  // Build a quick lookup of submitted answers, ignoring duplicates.
  const submitted = new Map<string, number>()
  for (const a of args.answers) {
    if (typeof a.choiceIndex !== "number") continue
    if (!byId.has(a.questionId)) continue
    submitted.set(a.questionId, a.choiceIndex)
  }
  if (submitted.size !== session.questionIds.length) {
    throw ValidationError(
      `Expected ${session.questionIds.length} answers, got ${submitted.size}`,
    )
  }

  // Score by un-shuffling the student's choice for each question.
  let correct = 0
  for (const qid of session.questionIds) {
    const q = byId.get(qid)
    const shuffledChoice = submitted.get(qid)
    if (!q || shuffledChoice === undefined) continue
    const perm = permutation(shuffleSeed(session.id, qid), q.choices.length)
    const originalChoice = unshuffleIndex(shuffledChoice, perm)
    if (originalChoice === q.correctIndex) correct += 1
  }
  const scorePct = Math.round((correct / session.questionIds.length) * 100)
  const passed = scorePct >= QUIZ_PASS_THRESHOLD

  const updated = await prisma.quizSession.update({
    where: { id: session.id },
    data: {
      status: passed ? "passed" : "failed",
      scorePct,
      passed,
      submittedAt: new Date(),
      answers: args.answers as unknown as Prisma.InputJsonValue,
      fingerprint: (args.fingerprint ?? {}) as unknown as Prisma.InputJsonValue,
    },
  })

  return {
    enrollmentId: session.enrollmentId,
    newlyPassed: passed,
    result: {
      sessionId: updated.id,
      scorePct,
      passed,
      rewardInr: null,
      payoutId: null,
      proofId: null,
    },
  }
}

// ─── Get current session (for resume + result page) ──────────────────────────
export async function getSession(args: {
  userId: string
  sessionId: string
}): Promise<QuizSession> {
  const session = await prisma.quizSession.findUnique({
    where: { id: args.sessionId },
  })
  if (!session) throw NotFound("Quiz session not found")
  if (session.studentId !== args.userId) throw Forbidden()

  const questions = await prisma.question.findMany({
    where: { id: { in: session.questionIds } },
    select: { id: true, prompt: true, choices: true },
  })
  const ordered = session.questionIds
    .map((id) => questions.find((q) => q.id === id))
    .filter((q): q is { id: string; prompt: string; choices: string[] } => Boolean(q))

  return toClientSession({ session, questions: ordered })
}
