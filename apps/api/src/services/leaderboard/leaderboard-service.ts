import type { Leaderboard, LeaderboardSponsor, LeaderboardStudent } from "@pol/shared"

import { prisma } from "@/db/prisma"

const STUDENT_LIMIT = 10
const SPONSOR_LIMIT = 10

function initialsForName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return (parts[0] ?? "?").slice(0, 2).toUpperCase()
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase()
}

/**
 * Build the global leaderboard for the public /leaderboard page.
 *
 * Students are ranked by number of verified completions, broken by average
 * quiz score then by total INR earned. Sponsors are ranked by students
 * funded (verified completions on their bounties), broken by INR released.
 *
 * Only minted on-chain proofs count — every row here is something a
 * recruiter or auditor can independently verify.
 */
export async function getLeaderboard(): Promise<Leaderboard> {
  const proofs = await prisma.onchainProof.findMany({
    where: { status: "minted" },
    include: {
      curriculum: { select: { title: true } },
      enrollment: {
        include: {
          student: { select: { id: true, name: true } },
          bounty: {
            select: {
              rewardInr: true,
              sponsor: { select: { id: true, organizationName: true } },
            },
          },
        },
      },
    },
    orderBy: { mintedAt: "desc" },
  })

  // ─── Students ───────────────────────────────────────────────────
  type StudentAcc = {
    studentId: string
    initials: string
    address: string | null
    completions: number
    totalEarnedInr: number
    scoreSum: number
    scoreCount: number
    bestScorePct: number
    curriculumCounts: Map<string, number>
  }
  const studentMap = new Map<string, StudentAcc>()

  for (const proof of proofs) {
    const studentId = proof.enrollment.student.id
    const existing =
      studentMap.get(studentId) ??
      ({
        studentId,
        initials: initialsForName(proof.enrollment.student.name),
        address: proof.studentAddress,
        completions: 0,
        totalEarnedInr: 0,
        scoreSum: 0,
        scoreCount: 0,
        bestScorePct: 0,
        curriculumCounts: new Map(),
      } satisfies StudentAcc)
    existing.completions += 1
    existing.totalEarnedInr += proof.enrollment.bounty.rewardInr
    if (proof.studentAddress && !existing.address) {
      existing.address = proof.studentAddress
    }
    const title = proof.curriculum.title
    existing.curriculumCounts.set(
      title,
      (existing.curriculumCounts.get(title) ?? 0) + 1,
    )
    studentMap.set(studentId, existing)
  }

  // Pull score data once per student.
  const studentIds = Array.from(studentMap.keys())
  if (studentIds.length > 0) {
    const sessions = await prisma.quizSession.findMany({
      where: {
        status: "passed",
        enrollment: { studentId: { in: studentIds } },
      },
      select: {
        scorePct: true,
        enrollment: { select: { studentId: true } },
      },
    })
    for (const s of sessions) {
      if (s.scorePct === null) continue
      const acc = studentMap.get(s.enrollment.studentId)
      if (!acc) continue
      acc.scoreSum += s.scorePct
      acc.scoreCount += 1
      if (s.scorePct > acc.bestScorePct) acc.bestScorePct = s.scorePct
    }
  }

  const studentEntries: LeaderboardStudent[] = Array.from(studentMap.values())
    .sort((a, b) => {
      if (b.completions !== a.completions) return b.completions - a.completions
      const aAvg = a.scoreCount > 0 ? a.scoreSum / a.scoreCount : 0
      const bAvg = b.scoreCount > 0 ? b.scoreSum / b.scoreCount : 0
      if (bAvg !== aAvg) return bAvg - aAvg
      return b.totalEarnedInr - a.totalEarnedInr
    })
    .slice(0, STUDENT_LIMIT)
    .map((acc, i) => ({
      rank: i + 1,
      initials: acc.initials,
      address: acc.address,
      completions: acc.completions,
      totalEarnedInr: acc.totalEarnedInr,
      avgScorePct:
        acc.scoreCount > 0 ? Math.round(acc.scoreSum / acc.scoreCount) : 0,
      bestScorePct: acc.bestScorePct,
      topCurriculum: pickTop(acc.curriculumCounts),
    }))

  // ─── Sponsors ───────────────────────────────────────────────────
  type SponsorAcc = {
    sponsorId: string
    name: string
    studentsFunded: number
    totalReleasedInr: number
    bountyIds: Set<string>
    curriculumCounts: Map<string, number>
  }
  const sponsorMap = new Map<string, SponsorAcc>()

  for (const proof of proofs) {
    const sponsor = proof.enrollment.bounty.sponsor
    const existing =
      sponsorMap.get(sponsor.id) ??
      ({
        sponsorId: sponsor.id,
        name: sponsor.organizationName,
        studentsFunded: 0,
        totalReleasedInr: 0,
        bountyIds: new Set<string>(),
        curriculumCounts: new Map(),
      } satisfies SponsorAcc)
    existing.studentsFunded += 1
    existing.totalReleasedInr += proof.enrollment.bounty.rewardInr
    existing.bountyIds.add(proof.enrollment.bountyId)
    const title = proof.curriculum.title
    existing.curriculumCounts.set(
      title,
      (existing.curriculumCounts.get(title) ?? 0) + 1,
    )
    sponsorMap.set(sponsor.id, existing)
  }

  const sponsorEntries: LeaderboardSponsor[] = Array.from(sponsorMap.values())
    .sort((a, b) => {
      if (b.studentsFunded !== a.studentsFunded) {
        return b.studentsFunded - a.studentsFunded
      }
      return b.totalReleasedInr - a.totalReleasedInr
    })
    .slice(0, SPONSOR_LIMIT)
    .map((acc, i) => ({
      rank: i + 1,
      name: acc.name,
      bounties: acc.bountyIds.size,
      studentsFunded: acc.studentsFunded,
      totalReleasedInr: acc.totalReleasedInr,
      topCurriculum: pickTop(acc.curriculumCounts),
    }))

  return {
    students: studentEntries,
    sponsors: sponsorEntries,
    totals: {
      verifiedCompletions: proofs.length,
      paidOutInr: proofs.reduce(
        (sum, p) => sum + p.enrollment.bounty.rewardInr,
        0,
      ),
      activeSponsors: sponsorMap.size,
    },
  }
}

function pickTop(counts: Map<string, number>): string {
  let best = ""
  let bestN = 0
  for (const [title, n] of counts) {
    if (n > bestN) {
      bestN = n
      best = title
    }
  }
  return best
}
