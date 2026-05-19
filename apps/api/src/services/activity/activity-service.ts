import { prisma } from "@/db/prisma"

export type ActivityEvent =
  | {
      kind: "bounty_funded"
      at: string
      bountyId: string
      bountyTitle: string
      sponsorName: string
      rewardInr: number
      maxStudents: number
      escrowTxHash: string | null
    }
  | {
      kind: "completion"
      at: string
      bountyId: string
      bountyTitle: string
      studentInitials: string
      rewardInr: number
      curriculumTitle: string
      txHash: string | null
    }
  | {
      kind: "enrollment"
      at: string
      bountyId: string
      bountyTitle: string
      studentInitials: string
      curriculumTitle: string
    }

const NAME_INITIALS_RE = /\S+/g

function initials(name: string): string {
  const parts = name.match(NAME_INITIALS_RE) ?? []
  return parts
    .slice(0, 2)
    .map((p) => (p[0] ?? "").toUpperCase())
    .join("")
}

/**
 * Returns the most recent platform-wide events, newest first. Powers the
 * "live activity" feed on the marketing page and the sponsor dashboard's
 * recent-events strip. Public — no PII beyond student initials.
 */
export async function recentActivity(limit = 12): Promise<ActivityEvent[]> {
  const [bounties, proofs, enrollments] = await Promise.all([
    prisma.bounty.findMany({
      where: { status: { in: ["active", "depleted", "funding"] } },
      include: { sponsor: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.onchainProof.findMany({
      where: { status: "minted" },
      include: {
        enrollment: { include: { student: true, bounty: true } },
        curriculum: true,
      },
      orderBy: { mintedAt: "desc" },
      take: limit,
    }),
    prisma.enrollment.findMany({
      include: {
        student: true,
        bounty: { include: { curriculum: true } },
      },
      orderBy: { startedAt: "desc" },
      take: limit,
    }),
  ])

  const events: ActivityEvent[] = []

  for (const b of bounties) {
    events.push({
      kind: "bounty_funded",
      at: b.createdAt.toISOString(),
      bountyId: b.id,
      bountyTitle: b.title,
      sponsorName: b.sponsor.organizationName,
      rewardInr: b.rewardInr,
      maxStudents: b.maxStudents,
      escrowTxHash: b.escrowTxHash,
    })
  }

  for (const p of proofs) {
    if (!p.mintedAt) continue
    events.push({
      kind: "completion",
      at: p.mintedAt.toISOString(),
      bountyId: p.enrollment.bountyId,
      bountyTitle: p.enrollment.bounty.title,
      studentInitials: initials(p.enrollment.student.name),
      rewardInr: p.enrollment.bounty.rewardInr,
      curriculumTitle: p.curriculum.title,
      txHash: p.txHash,
    })
  }

  for (const e of enrollments) {
    events.push({
      kind: "enrollment",
      at: e.startedAt.toISOString(),
      bountyId: e.bountyId,
      bountyTitle: e.bounty.title,
      studentInitials: initials(e.student.name),
      curriculumTitle: e.bounty.curriculum.title,
    })
  }

  return events
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, limit)
}

export async function platformStats(): Promise<{
  totalBounties: number
  totalCompletions: number
  totalPaidInr: number
  activeStudents: number
}> {
  // Public stats are derived from the bounty rollup (`bounty.completed` and
  // `bounty.rewardInr`) — the same source the sponsor dashboard uses. This
  // is the authoritative completion count: it's bumped atomically when a
  // quiz passes and is unaffected by payout retries or proof-mint lag.
  const [bounties, students] = await Promise.all([
    prisma.bounty.findMany({
      where: { status: { not: "draft" } },
      select: { completed: true, rewardInr: true },
    }),
    prisma.enrollment.findMany({
      distinct: ["studentId"],
      select: { studentId: true },
    }),
  ])
  const totalCompletions = bounties.reduce((n, b) => n + b.completed, 0)
  const totalPaidInr = bounties.reduce(
    (n, b) => n + b.completed * b.rewardInr,
    0,
  )
  return {
    totalBounties: bounties.length,
    totalCompletions,
    totalPaidInr,
    activeStudents: students.length,
  }
}
