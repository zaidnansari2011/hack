import type { Bounty as PrismaBounty, Curriculum as PrismaCurriculum } from "@prisma/client"
import type { Bounty, Curriculum, SyllabusModule } from "@pol/shared"

import { prisma } from "@/db/prisma"
import { logger } from "@/config/logger"
import { Forbidden, NotFound, ValidationError } from "@/lib/errors"
import { depositBounty as chainDeposit, inrToWei } from "@/services/blockchain/chain-service"

// We treat 1 USDC = ₹83 for the demo. Real on-chain math uses wei (testnet ETH);
// the dashboard displays whichever feels right per surface.
const INR_PER_USDC = 83
const USDC_DECIMALS = 6

function inrToUsdcMicros(amountInr: number): bigint {
  // microUSDC = (amountInr / INR_PER_USDC) * 1e6
  const usdcDollars = amountInr / INR_PER_USDC
  return BigInt(Math.round(usdcDollars * 10 ** USDC_DECIMALS))
}

function microsToUsdc(micros: bigint): number {
  return Number(micros) / 10 ** USDC_DECIMALS
}

function toCurriculumDto(c: PrismaCurriculum): Curriculum {
  // syllabus is stored as Prisma.JsonValue but we know the shape from seed.
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

function toBountyDto(b: PrismaBounty): Bounty {
  return {
    id: b.id,
    sponsorId: b.sponsorId,
    title: b.title,
    description: b.description,
    curriculumId: b.curriculumId,
    rewardInr: b.rewardInr,
    rewardUsdc: microsToUsdc(b.rewardUsdcMicros),
    maxStudents: b.maxStudents,
    enrolled: b.enrolled,
    completed: b.completed,
    totalDepositUsdc: microsToUsdc(b.totalDepositMicros),
    remainingUsdc: microsToUsdc(b.remainingMicros),
    status: b.status,
    escrowTxHash: b.escrowTxHash,
    createdAt: b.createdAt.toISOString(),
  }
}

// ─── Sponsor: create a bounty ─────────────────────────────────────────────────
export async function createBounty(input: {
  userId: string
  title: string
  description: string
  curriculumId: string
  rewardInr: number
  maxStudents: number
}): Promise<Bounty> {
  const sponsor = await prisma.sponsor.findUnique({
    where: { userId: input.userId },
  })
  if (!sponsor) throw Forbidden("Only sponsor accounts can create bounties")

  const curriculum = await prisma.curriculum.findUnique({
    where: { id: input.curriculumId },
  })
  if (!curriculum) throw ValidationError("Curriculum not found")

  if (input.rewardInr < 1) throw ValidationError("rewardInr must be >= 1")
  if (input.maxStudents < 1) throw ValidationError("maxStudents must be >= 1")

  const rewardMicros = inrToUsdcMicros(input.rewardInr)
  const totalMicros = rewardMicros * BigInt(input.maxStudents)

  // Persist as draft first so we have an id to hash for the on-chain bountyId.
  const bounty = await prisma.bounty.create({
    data: {
      sponsorId: sponsor.id,
      curriculumId: curriculum.id,
      title: input.title.trim(),
      description: input.description.trim(),
      rewardInr: input.rewardInr,
      rewardUsdcMicros: rewardMicros,
      maxStudents: input.maxStudents,
      totalDepositMicros: totalMicros,
      remainingMicros: totalMicros,
      status: "funding",
    },
  })

  // Fund escrow on-chain (or simulate). Failure here flips bounty to draft so
  // the sponsor sees a clear retry state instead of a half-funded record.
  try {
    const result = await chainDeposit({
      bountyUuid: bounty.id,
      curriculumSlug: curriculum.slug,
      rewardWeiPerStudent: inrToWei(input.rewardInr),
      maxStudents: input.maxStudents,
    })
    const updated = await prisma.bounty.update({
      where: { id: bounty.id },
      data: {
        escrowTxHash: result.txHash,
        onchainBountyId: result.bountyId,
        status: "active",
      },
    })
    logger.info(
      { bountyId: updated.id, txHash: result.txHash, simulated: result.simulated },
      "bounty funded",
    )
    return toBountyDto(updated)
  } catch (err) {
    logger.error({ err, bountyId: bounty.id }, "escrow deposit failed")
    await prisma.bounty.update({
      where: { id: bounty.id },
      data: { status: "draft" },
    })
    throw err
  }
}

// ─── Public: list active bounties ─────────────────────────────────────────────
export async function listBounties(args?: {
  excludeCompletedForUserId?: string
}): Promise<(Bounty & { curriculum: Curriculum })[]> {
  let excludedBountyIds: string[] = []
  if (args?.excludeCompletedForUserId) {
    const completed = await prisma.enrollment.findMany({
      where: {
        studentId: args.excludeCompletedForUserId,
        status: "completed",
      },
      select: { bountyId: true },
    })
    excludedBountyIds = completed.map((e) => e.bountyId)
  }

  const rows = await prisma.bounty.findMany({
    where: {
      status: { in: ["active", "funding", "depleted"] },
      ...(excludedBountyIds.length > 0
        ? { id: { notIn: excludedBountyIds } }
        : {}),
    },
    include: { curriculum: true },
    orderBy: { createdAt: "desc" },
  })
  return rows.map((b) => ({
    ...toBountyDto(b),
    curriculum: toCurriculumDto(b.curriculum),
  }))
}

// ─── Public: bounty detail ────────────────────────────────────────────────────
export async function getBounty(id: string): Promise<
  Bounty & { curriculum: Curriculum }
> {
  const b = await prisma.bounty.findUnique({
    where: { id },
    include: { curriculum: true },
  })
  if (!b) throw NotFound("Bounty not found")
  return {
    ...toBountyDto(b),
    curriculum: toCurriculumDto(b.curriculum),
  }
}

// ─── Sponsor: my bounties ─────────────────────────────────────────────────────
export async function listMyBounties(userId: string): Promise<Bounty[]> {
  const sponsor = await prisma.sponsor.findUnique({ where: { userId } })
  if (!sponsor) throw Forbidden("Only sponsor accounts can view bounties")

  const rows = await prisma.bounty.findMany({
    where: { sponsorId: sponsor.id },
    include: { curriculum: true },
    orderBy: { createdAt: "desc" },
  })
  return rows.map((b) => ({
    ...toBountyDto(b),
    curriculum: toCurriculumDto(b.curriculum),
  }))
}

// ─── Sponsor: dashboard summary ───────────────────────────────────────────────
import type { SponsorAnalytics, SponsorTopScorer } from "@pol/shared"

const NAME_INITIALS_RE = /\S+/g
function initialsForName(name: string): string {
  const parts = name.match(NAME_INITIALS_RE) ?? []
  return parts
    .slice(0, 2)
    .map((p) => (p[0] ?? "").toUpperCase())
    .join("")
}

export type SponsorDashboardSummary = {
  totalBounties: number
  activeBounties: number
  studentsCompleted: number
  totalCommittedInr: number
  totalRemainingInr: number
  recentBounties: Bounty[]
  analytics: SponsorAnalytics
  topScorers: SponsorTopScorer[]
}

// Industry-baseline cost-per-completion in INR for a bootcamp seat. Used to
// frame our cost-per-verified-learner number on the dashboard. Not a quote —
// a calibration anchor.
const BOOTCAMP_BASELINE_INR = 35_000

export async function getSponsorDashboard(
  userId: string,
): Promise<SponsorDashboardSummary> {
  const sponsor = await prisma.sponsor.findUnique({ where: { userId } })
  if (!sponsor) throw Forbidden("Only sponsor accounts have a dashboard")

  const rows = await prisma.bounty.findMany({
    where: { sponsorId: sponsor.id },
    include: { curriculum: true },
    orderBy: { createdAt: "desc" },
  })

  let totalCommitted = 0
  let totalRemaining = 0
  let totalReleased = 0
  let totalEnrolled = 0
  let studentsCompleted = 0
  let active = 0

  for (const b of rows) {
    totalCommitted += b.rewardInr * b.maxStudents
    totalRemaining += b.rewardInr * (b.maxStudents - b.completed)
    totalReleased += b.rewardInr * b.completed
    totalEnrolled += b.enrolled
    studentsCompleted += b.completed
    if (b.status === "active" || b.status === "funding") active += 1
  }

  // ─ Analytics: cost-per-learner, completion rate, ROI multiple ─
  const completionRatePct =
    totalEnrolled > 0
      ? Math.round((studentsCompleted / totalEnrolled) * 100)
      : 0
  const costPerVerifiedLearnerInr =
    studentsCompleted > 0 ? Math.round(totalReleased / studentsCompleted) : 0
  const bootcampMultiplier =
    costPerVerifiedLearnerInr > 0
      ? Math.round(BOOTCAMP_BASELINE_INR / costPerVerifiedLearnerInr)
      : 0

  // Score average + median time-to-complete come from quiz sessions tied to
  // this sponsor's enrollments. Light query — fine to do on every dashboard
  // hit; if it becomes hot we'll cache.
  const sessions = await prisma.quizSession.findMany({
    where: {
      status: "passed",
      enrollment: { bounty: { sponsorId: sponsor.id } },
    },
    select: {
      scorePct: true,
      submittedAt: true,
      enrollment: { select: { startedAt: true } },
    },
  })
  const averageScorePct =
    sessions.length > 0
      ? Math.round(
          sessions.reduce((sum, s) => sum + (s.scorePct ?? 0), 0) /
            sessions.length,
        )
      : 0
  const minutes = sessions
    .map((s) =>
      s.submittedAt && s.enrollment.startedAt
        ? (s.submittedAt.getTime() - s.enrollment.startedAt.getTime()) / 60_000
        : null,
    )
    .filter((m): m is number => m !== null && m >= 0 && m < 60 * 24 * 30)
    .sort((a, b) => a - b)
  const medianMinutesToComplete =
    minutes.length > 0
      ? Math.round(minutes[Math.floor(minutes.length / 2)] ?? 0)
      : null

  // ─ Top 5 scorers across this sponsor's bounties (leaderboard) ─
  const topProofs = await prisma.onchainProof.findMany({
    where: {
      status: "minted",
      enrollment: { bounty: { sponsorId: sponsor.id } },
    },
    include: {
      curriculum: { select: { title: true } },
      enrollment: {
        include: {
          student: { select: { name: true } },
          bounty: { select: { title: true, rewardInr: true } },
        },
      },
    },
    orderBy: { mintedAt: "desc" },
    take: 50,
  })

  const topScorerEntries = await Promise.all(
    topProofs.map(async (p) => {
      const session = await prisma.quizSession.findFirst({
        where: { enrollmentId: p.enrollmentId, status: "passed" },
        orderBy: { submittedAt: "desc" },
        select: { scorePct: true, submittedAt: true },
      })
      if (!session || session.scorePct === null) return null
      const passedAt =
        session.submittedAt?.toISOString() ?? p.mintedAt?.toISOString() ?? null
      if (!passedAt || !p.txHash) return null
      const entry: SponsorTopScorer = {
        studentInitials: initialsForName(p.enrollment.student.name),
        studentAddress: p.studentAddress,
        scorePct: session.scorePct,
        rewardInr: p.enrollment.bounty.rewardInr,
        curriculumTitle: p.curriculum.title,
        bountyTitle: p.enrollment.bounty.title,
        passedAt,
        txHash: p.txHash,
      }
      return entry
    }),
  )
  const topScorers = topScorerEntries
    .filter((e): e is SponsorTopScorer => e !== null)
    .sort((a, b) => b.scorePct - a.scorePct)
    .slice(0, 5)

  // Optimization: sponsor rows are already fetched below. But we need curriculum info.
  // Actually, rows above don't include curriculum. Let's modify the map.
  return {
    totalBounties: rows.length,
    activeBounties: active,
    studentsCompleted,
    totalCommittedInr: totalCommitted,
    totalRemainingInr: totalRemaining,
    recentBounties: rows.slice(0, 5).map((b) => ({
      ...toBountyDto(b),
      curriculum: toCurriculumDto(b.curriculum),
    })),
    analytics: {
      costPerVerifiedLearnerInr,
      completionRatePct,
      bootcampMultiplier,
      totalDeposited: totalCommitted,
      totalReleased,
      averageScorePct,
      medianMinutesToComplete,
    },
    topScorers,
  }
}

// ─── Curricula list (used by create-bounty form) ──────────────────────────────
export async function listCurricula(): Promise<Curriculum[]> {
  const rows = await prisma.curriculum.findMany({ orderBy: { title: "asc" } })
  return rows.map(toCurriculumDto)
}
