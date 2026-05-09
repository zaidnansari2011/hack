import type { Payout as PrismaPayout } from "@prisma/client"
import type { Payout } from "@pol/shared"

import { prisma } from "@/db/prisma"
import { logger } from "@/config/logger"
import { Forbidden, NotFound } from "@/lib/errors"
import { createPayout, payoutMode } from "./razorpay-client"

// Time the simulated payout takes to walk through its state machine. Tuned so
// the celebration animation has time to land before "confirmed" arrives.
const SIM_PROCESSING_MS = 900
const SIM_CONFIRM_MS = 1800

function toDto(p: PrismaPayout): Payout {
  return {
    id: p.id,
    studentId: p.studentId,
    enrollmentId: p.enrollmentId,
    amountInr: p.amountInr,
    status: p.status,
    upiId: p.upiId,
    razorpayPayoutId: p.razorpayPayoutId,
    failureReason: p.failureReason,
    createdAt: p.createdAt.toISOString(),
    confirmedAt: p.confirmedAt?.toISOString() ?? null,
  }
}

/**
 * Create a payout row for an enrollment + queue it for processing. Idempotent
 * on `(enrollmentId, idempotencyKey)` — re-issuing the same key returns the
 * existing payout, so quiz retries and webhook replays can't double-pay.
 */
export async function enqueuePayout(args: {
  studentId: string
  enrollmentId: string
  amountInr: number
  idempotencyKey: string
}): Promise<Payout> {
  const existing = await prisma.payout.findUnique({
    where: { idempotencyKey: args.idempotencyKey },
  })
  if (existing) {
    if (existing.studentId !== args.studentId) {
      throw Forbidden("Idempotency key collision across students")
    }
    return toDto(existing)
  }

  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: args.studentId },
  })

  const created = await prisma.payout.create({
    data: {
      studentId: args.studentId,
      enrollmentId: args.enrollmentId,
      amountInr: args.amountInr,
      upiId: studentProfile?.upiId ?? null,
      idempotencyKey: args.idempotencyKey,
      status: "queued",
    },
  })

  // Kick off processing without blocking the request — the result page polls
  // for status. setImmediate ensures we yield the HTTP response first.
  setImmediate(() => {
    processPayout(created.id).catch((err) => {
      logger.error({ err, payoutId: created.id }, "payout processing failed")
    })
  })

  return toDto(created)
}

async function processPayout(payoutId: string): Promise<void> {
  const payout = await prisma.payout.findUnique({ where: { id: payoutId } })
  if (!payout) return
  if (payout.status !== "queued") return

  await prisma.payout.update({
    where: { id: payoutId },
    data: { status: "processing", attempts: { increment: 1 } },
  })

  try {
    const created = await createPayout({
      amountInr: payout.amountInr,
      upiId: payout.upiId ?? "demo@upi",
      idempotencyKey: payout.idempotencyKey,
      reference: `pol-${payout.enrollmentId.slice(0, 8)}`,
    })

    if (payoutMode === "simulated") {
      await wait(SIM_PROCESSING_MS)
    }

    await prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: created.status === "failed" ? "failed" : "sent",
        razorpayPayoutId: created.razorpayPayoutId,
        sentAt: new Date(),
        failureReason: created.status === "failed" ? "Razorpay rejected" : null,
      },
    })

    if (created.status === "failed") return

    if (payoutMode === "simulated") {
      // Real life: wait for the Razorpay webhook to flip to confirmed. Demo
      // mode advances itself after a short delay so the UI animation lands.
      await wait(SIM_CONFIRM_MS)
      await prisma.$transaction([
        prisma.payout.update({
          where: { id: payoutId },
          data: { status: "confirmed", confirmedAt: new Date() },
        }),
        prisma.studentProfile.updateMany({
          where: { userId: payout.studentId },
          data: { totalEarnedInr: { increment: payout.amountInr } },
        }),
      ])
    }
  } catch (err) {
    logger.error({ err, payoutId }, "payout failed")
    await prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: "failed",
        failureReason: err instanceof Error ? err.message : "unknown",
      },
    })
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─── Reads ───────────────────────────────────────────────────────────────────
export async function getPayout(args: {
  userId: string
  payoutId: string
}): Promise<Payout> {
  const payout = await prisma.payout.findUnique({
    where: { id: args.payoutId },
  })
  if (!payout) throw NotFound("Payout not found")
  if (payout.studentId !== args.userId) throw Forbidden()
  return toDto(payout)
}

export async function listMyPayouts(userId: string): Promise<Payout[]> {
  const rows = await prisma.payout.findMany({
    where: { studentId: userId },
    orderBy: { createdAt: "desc" },
  })
  return rows.map(toDto)
}

export function makeIdempotencyKey(scope: { enrollmentId: string }): string {
  // One payout per enrollment, ever. Re-issuing the same key short-circuits
  // back to the existing payout — quiz retries can't double-pay.
  return `enrollment:${scope.enrollmentId}`
}
