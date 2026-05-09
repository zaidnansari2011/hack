import type { Bounty, Curriculum, Enrollment, SyllabusModule } from "@pol/shared"
import { Prisma } from "@prisma/client"

import { prisma } from "@/db/prisma"
import { Conflict, Forbidden, NotFound, ValidationError } from "@/lib/errors"

function toEnrollmentDto(e: {
  id: string
  studentId: string
  bountyId: string
  status: string
  progressPct: number
  startedAt: Date
  completedAt: Date | null
}): Enrollment {
  return {
    id: e.id,
    studentId: e.studentId,
    bountyId: e.bountyId,
    status: e.status as Enrollment["status"],
    progressPct: e.progressPct,
    startedAt: e.startedAt.toISOString(),
    completedAt: e.completedAt?.toISOString() ?? null,
  }
}

export async function startEnrollment(args: {
  userId: string
  bountyId: string
}): Promise<Enrollment> {
  const user = await prisma.user.findUnique({ where: { id: args.userId } })
  if (!user) throw Forbidden()
  if (user.role !== "student") {
    throw Forbidden("Only students can enroll in bounties")
  }

  const bounty = await prisma.bounty.findUnique({
    where: { id: args.bountyId },
  })
  if (!bounty) throw NotFound("Bounty not found")
  if (bounty.status === "depleted" || bounty.status === "closed") {
    throw Conflict("This bounty is no longer accepting enrollments")
  }
  if (bounty.enrolled >= bounty.maxStudents) {
    throw Conflict("This bounty has reached its student cap")
  }

  // Idempotent: returning users get their existing enrollment back.
  const existing = await prisma.enrollment.findUnique({
    where: {
      studentId_bountyId: {
        studentId: args.userId,
        bountyId: args.bountyId,
      },
    },
  })
  if (existing) return toEnrollmentDto(existing)

  // Concurrent calls (React StrictMode in dev fires effects twice) can race
  // past the findUnique above. If the unique constraint fires, the row was
  // just created by the sibling request — return it instead of 500ing.
  try {
    const created = await prisma.$transaction(async (tx) => {
      const enrollment = await tx.enrollment.create({
        data: {
          studentId: args.userId,
          bountyId: args.bountyId,
          status: "active",
        },
      })
      await tx.bounty.update({
        where: { id: args.bountyId },
        data: { enrolled: { increment: 1 } },
      })
      return enrollment
    })
    return toEnrollmentDto(created)
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const winner = await prisma.enrollment.findUnique({
        where: {
          studentId_bountyId: {
            studentId: args.userId,
            bountyId: args.bountyId,
          },
        },
      })
      if (winner) return toEnrollmentDto(winner)
    }
    throw err
  }
}

export type EnrollmentDetail = Enrollment & {
  bounty: Bounty
  curriculum: Curriculum
}

function bountyDto(b: {
  id: string
  sponsorId: string
  title: string
  description: string
  curriculumId: string
  rewardInr: number
  rewardUsdcMicros: bigint
  maxStudents: number
  enrolled: number
  completed: number
  totalDepositMicros: bigint
  remainingMicros: bigint
  status: string
  escrowTxHash: string | null
  createdAt: Date
}): Bounty {
  return {
    id: b.id,
    sponsorId: b.sponsorId,
    title: b.title,
    description: b.description,
    curriculumId: b.curriculumId,
    rewardInr: b.rewardInr,
    rewardUsdc: Number(b.rewardUsdcMicros) / 1_000_000,
    maxStudents: b.maxStudents,
    enrolled: b.enrolled,
    completed: b.completed,
    totalDepositUsdc: Number(b.totalDepositMicros) / 1_000_000,
    remainingUsdc: Number(b.remainingMicros) / 1_000_000,
    status: b.status as Bounty["status"],
    escrowTxHash: b.escrowTxHash,
    createdAt: b.createdAt.toISOString(),
  }
}

function curriculumDto(c: {
  id: string
  slug: string
  title: string
  summary: string
  topics: string[]
  syllabus: Prisma.JsonValue
  estimatedMinutes: number
  thumbnailUrl: string | null
}): Curriculum {
  const syllabus = Array.isArray(c.syllabus)
    ? (c.syllabus as unknown as SyllabusModule[])
    : []
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    summary: c.summary,
    topics: c.topics,
    syllabus,
    estimatedMinutes: c.estimatedMinutes,
    thumbnail: c.thumbnailUrl,
  }
}

export async function getEnrollment(args: {
  userId: string
  enrollmentId: string
}): Promise<EnrollmentDetail> {
  const e = await prisma.enrollment.findUnique({
    where: { id: args.enrollmentId },
    include: { bounty: { include: { curriculum: true } } },
  })
  if (!e) throw NotFound("Enrollment not found")
  if (e.studentId !== args.userId) throw Forbidden()

  return {
    ...toEnrollmentDto(e),
    bounty: bountyDto(e.bounty),
    curriculum: curriculumDto(e.bounty.curriculum),
  }
}

export async function getEnrollmentByBounty(args: {
  userId: string
  bountyId: string
}): Promise<EnrollmentDetail | null> {
  const e = await prisma.enrollment.findUnique({
    where: {
      studentId_bountyId: {
        studentId: args.userId,
        bountyId: args.bountyId,
      },
    },
    include: { bounty: { include: { curriculum: true } } },
  })
  if (!e) return null
  return {
    ...toEnrollmentDto(e),
    bounty: bountyDto(e.bounty),
    curriculum: curriculumDto(e.bounty.curriculum),
  }
}

export async function listMyEnrollments(args: {
  userId: string
}): Promise<EnrollmentDetail[]> {
  const rows = await prisma.enrollment.findMany({
    where: { studentId: args.userId },
    include: { bounty: { include: { curriculum: true } } },
    orderBy: { startedAt: "desc" },
  })
  return rows.map((e) => ({
    ...toEnrollmentDto(e),
    bounty: bountyDto(e.bounty),
    curriculum: curriculumDto(e.bounty.curriculum),
  }))
}

export async function bumpProgress(args: {
  userId: string
  enrollmentId: string
  progressPct: number
}): Promise<Enrollment> {
  if (args.progressPct < 0 || args.progressPct > 100) {
    throw ValidationError("progressPct must be between 0 and 100")
  }
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: args.enrollmentId },
  })
  if (!enrollment) throw NotFound("Enrollment not found")
  if (enrollment.studentId !== args.userId) throw Forbidden()
  if (args.progressPct <= enrollment.progressPct) {
    return toEnrollmentDto(enrollment)
  }
  const updated = await prisma.enrollment.update({
    where: { id: args.enrollmentId },
    data: { progressPct: args.progressPct },
  })
  return toEnrollmentDto(updated)
}
