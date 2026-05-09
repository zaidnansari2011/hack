import type { QuizResult } from "@pol/shared"

import { prisma } from "@/db/prisma"
import { logger } from "@/config/logger"
import { enqueuePayout, makeIdempotencyKey } from "@/services/payouts/payout-service"
import { recordCompletionProof } from "@/services/proofs/proof-service"

/**
 * Glue between a passed quiz and its consequences:
 *   1. Bump enrollment progress + status to completed
 *   2. Bump bounty.completed / decrement remaining escrow
 *   3. Enqueue the INR payout
 *   4. Record the on-chain proof (release + SBT mint)
 *
 * All four steps tolerate retries: enrollment/bounty bumps are gated on
 * status, payout is keyed by enrollmentId, proof is gated on existing row.
 */
export async function finalizeCompletion(args: {
  userId: string
  enrollmentId: string
  sessionId: string
  scorePct: number
}): Promise<QuizResult> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: args.enrollmentId },
    include: { bounty: { include: { curriculum: true } } },
  })
  if (!enrollment) throw new Error("Enrollment vanished mid-completion")

  const bounty = enrollment.bounty
  const curriculum = bounty.curriculum

  // 1 & 2 — enrollment + bounty bumps. Wrapped so they stay consistent.
  if (enrollment.status !== "completed") {
    await prisma.$transaction([
      prisma.enrollment.update({
        where: { id: enrollment.id },
        data: {
          status: "completed",
          progressPct: 100,
          completedAt: new Date(),
        },
      }),
      prisma.bounty.update({
        where: { id: bounty.id },
        data: {
          completed: { increment: 1 },
          remainingMicros: { decrement: bounty.rewardUsdcMicros },
          status:
            bounty.completed + 1 >= bounty.maxStudents ? "depleted" : bounty.status,
        },
      }),
    ])
  }

  // 3 — payout
  const payout = await enqueuePayout({
    studentId: args.userId,
    enrollmentId: args.enrollmentId,
    amountInr: bounty.rewardInr,
    idempotencyKey: makeIdempotencyKey({ enrollmentId: args.enrollmentId }),
  })

  // 4 — on-chain proof. We don't await failure here; the proof row reflects
  // its own status. The result page polls for the txHash to appear.
  let proofId: string | null = null
  try {
    const proof = await recordCompletionProof({
      userId: args.userId,
      enrollmentId: args.enrollmentId,
      curriculumId: curriculum.id,
      curriculumSlug: curriculum.slug,
      bountyId: bounty.id,
      scorePct: args.scorePct,
      sessionId: args.sessionId,
    })
    proofId = proof.id
  } catch (err) {
    logger.error({ err, enrollmentId: args.enrollmentId }, "proof step errored")
  }

  return {
    sessionId: args.sessionId,
    scorePct: args.scorePct,
    passed: true,
    rewardInr: bounty.rewardInr,
    payoutId: payout.id,
    proofId,
  }
}
