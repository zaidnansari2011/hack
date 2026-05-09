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
    orderBy: { createdAt: "desc" },
  })
  return rows.map(toBountyDto)
}

// ─── Sponsor: dashboard summary ───────────────────────────────────────────────
export type SponsorDashboardSummary = {
  totalBounties: number
  activeBounties: number
  studentsCompleted: number
  totalCommittedInr: number
  totalRemainingInr: number
  recentBounties: Bounty[]
}

export async function getSponsorDashboard(
  userId: string,
): Promise<SponsorDashboardSummary> {
  const sponsor = await prisma.sponsor.findUnique({ where: { userId } })
  if (!sponsor) throw Forbidden("Only sponsor accounts have a dashboard")

  const rows = await prisma.bounty.findMany({
    where: { sponsorId: sponsor.id },
    orderBy: { createdAt: "desc" },
  })

  let totalCommitted = 0
  let totalRemaining = 0
  let studentsCompleted = 0
  let active = 0

  for (const b of rows) {
    totalCommitted += b.rewardInr * b.maxStudents
    totalRemaining += b.rewardInr * (b.maxStudents - b.completed)
    studentsCompleted += b.completed
    if (b.status === "active" || b.status === "funding") active += 1
  }

  return {
    totalBounties: rows.length,
    activeBounties: active,
    studentsCompleted,
    totalCommittedInr: totalCommitted,
    totalRemainingInr: totalRemaining,
    recentBounties: rows.slice(0, 5).map(toBountyDto),
  }
}

// ─── Curricula list (used by create-bounty form) ──────────────────────────────
export async function listCurricula(): Promise<Curriculum[]> {
  const rows = await prisma.curriculum.findMany({ orderBy: { title: "asc" } })
  return rows.map(toCurriculumDto)
}
