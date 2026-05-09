import type { RecruitCandidate, RecruitFilter, RecruitResults } from "@pol/shared"

import { prisma } from "@/db/prisma"

const NAME_INITIALS_RE = /\S+/g
function initials(name: string): string {
  const parts = name.match(NAME_INITIALS_RE) ?? []
  return parts
    .slice(0, 2)
    .map((p) => (p[0] ?? "").toUpperCase())
    .join("")
}

const MAX_RESULTS = 50

/**
 * Find verified-on-chain learners matching a recruiter's filter. Privacy
 * model: only initials + on-chain address are exposed publicly. The wallet
 * address itself is the entry point — anyone with it can verify the SBT
 * directly on BaseScan.
 */
export async function searchCandidates(
  filter: RecruitFilter,
): Promise<RecruitResults> {
  const since =
    filter.withinDays && filter.withinDays > 0
      ? new Date(Date.now() - filter.withinDays * 24 * 60 * 60 * 1000)
      : null

  const proofs = await prisma.onchainProof.findMany({
    where: {
      status: "minted",
      ...(filter.curriculumSlug
        ? { curriculum: { slug: filter.curriculumSlug } }
        : {}),
      ...(since ? { mintedAt: { gte: since } } : {}),
    },
    include: {
      curriculum: true,
      enrollment: {
        include: { student: true, bounty: true },
      },
    },
    orderBy: { mintedAt: "desc" },
    take: MAX_RESULTS * 2, // over-fetch since some may be filtered by score
  })

  const minScore = filter.minScorePct ?? 0
  const enrichedRaw = await Promise.all(
    proofs.map(async (p) => {
      const session = await prisma.quizSession.findFirst({
        where: { enrollmentId: p.enrollmentId, status: "passed" },
        orderBy: { submittedAt: "desc" },
        select: { scorePct: true, submittedAt: true },
      })
      return { proof: p, session }
    }),
  )
  const enriched = enrichedRaw
    .filter(
      (
        e,
      ): e is {
        proof: (typeof enrichedRaw)[number]["proof"]
        session: { scorePct: number | null; submittedAt: Date | null }
      } => e.session !== null && (e.session.scorePct ?? 0) >= minScore,
    )
    .slice(0, MAX_RESULTS)

  const candidates: RecruitCandidate[] = enriched.map(({ proof: p, session }) => ({
    txHash: p.txHash ?? "",
    studentAddress: p.studentAddress,
    studentInitials: initials(p.enrollment.student.name),
    scorePct: session.scorePct ?? 0,
    passedAt:
      session.submittedAt?.toISOString() ??
      p.mintedAt?.toISOString() ??
      p.createdAt.toISOString(),
    curriculumTitle: p.curriculum.title,
    curriculumSlug: p.curriculum.slug,
    rewardInr: p.enrollment.bounty.rewardInr,
  }))

  // Per-curriculum counts for the filter UI.
  const curricula = await prisma.curriculum.findMany({
    select: {
      slug: true,
      title: true,
      proofs: {
        where: { status: "minted" },
        select: { id: true },
      },
    },
  })
  const curriculaCounts = curricula.map((c) => ({
    slug: c.slug,
    title: c.title,
    passedCount: c.proofs.length,
  }))

  return {
    candidates,
    curricula: curriculaCounts,
    total: candidates.length,
  }
}
