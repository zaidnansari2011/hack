import { keccak256, toHex, type Address } from "viem"
import type { OnchainProof as PrismaProof } from "@prisma/client"
import type { OnchainProof } from "@pol/shared"

import { prisma } from "@/db/prisma"
import { logger } from "@/config/logger"
import { Forbidden, NotFound } from "@/lib/errors"
import {
  mintCredential,
  releasePayout,
  scoreHash as makeScoreHash,
} from "@/services/blockchain/chain-service"

function toDto(p: PrismaProof): OnchainProof {
  return {
    id: p.id,
    enrollmentId: p.enrollmentId,
    curriculumId: p.curriculumId,
    studentAddress: p.studentAddress,
    scoreHash: p.scoreHash,
    txHash: p.txHash,
    tokenId: p.tokenId,
    status: p.status,
    createdAt: p.createdAt.toISOString(),
    mintedAt: p.mintedAt?.toISOString() ?? null,
  }
}

/**
 * Demo students don't run wallets — we derive a deterministic address from
 * their userId so the SBT lands somewhere stable and inspectable on BaseScan.
 * In a real deployment this would come from MetaMask or Privy.
 */
export function deriveStudentAddress(userId: string): Address {
  const hash = keccak256(toHex(`pol:student:${userId}`))
  return `0x${hash.slice(-40)}` as Address
}

/**
 * Trigger the on-chain side of a verified completion: release escrow to the
 * student's address and mint the soulbound credential. Persists an
 * `OnchainProof` row reflecting the txs.
 *
 * Idempotent on enrollmentId: re-running for the same enrollment returns the
 * existing proof instead of double-emitting events.
 */
export async function recordCompletionProof(args: {
  userId: string
  enrollmentId: string
  curriculumId: string
  curriculumSlug: string
  bountyId: string
  scorePct: number
  sessionId: string
}): Promise<OnchainProof> {
  const existing = await prisma.onchainProof.findFirst({
    where: { enrollmentId: args.enrollmentId },
  })
  if (existing && existing.status !== "failed") {
    return toDto(existing)
  }

  const studentAddress = deriveStudentAddress(args.userId)
  const sHash = makeScoreHash(args.userId, args.scorePct, args.sessionId)

  const proof = existing
    ? await prisma.onchainProof.update({
        where: { id: existing.id },
        data: {
          studentAddress,
          scoreHash: sHash,
          status: "pending",
          failureReason: null,
        },
      })
    : await prisma.onchainProof.create({
        data: {
          enrollmentId: args.enrollmentId,
          curriculumId: args.curriculumId,
          studentAddress,
          scoreHash: sHash,
          status: "pending",
        },
      })

  try {
    const release = await releasePayout({
      bountyUuid: args.bountyId,
      studentAddress,
      scoreHash: sHash,
    })
    const mint = await mintCredential({
      studentAddress,
      curriculumSlug: args.curriculumSlug,
      scorePct: args.scorePct,
      metadataUri: `data:application/json,${encodeURIComponent(
        JSON.stringify({
          name: "Proof-of-Learn Credential",
          curriculum: args.curriculumSlug,
          score: args.scorePct,
        }),
      )}`,
    })

    const updated = await prisma.onchainProof.update({
      where: { id: proof.id },
      data: {
        status: "minted",
        txHash: release.txHash,
        tokenId: mint.tokenId,
        mintedAt: new Date(),
      },
    })

    logger.info(
      {
        enrollmentId: args.enrollmentId,
        releaseTx: release.txHash,
        mintTx: mint.txHash,
        tokenId: mint.tokenId,
        simulated: release.simulated,
      },
      "completion proof recorded",
    )

    return toDto(updated)
  } catch (err) {
    const updated = await prisma.onchainProof.update({
      where: { id: proof.id },
      data: {
        status: "failed",
        failureReason: err instanceof Error ? err.message : "unknown",
      },
    })
    logger.error({ err, enrollmentId: args.enrollmentId }, "proof failed")
    return toDto(updated)
  }
}

export async function getProof(args: {
  userId: string
  proofId: string
}): Promise<OnchainProof> {
  const proof = await prisma.onchainProof.findUnique({
    where: { id: args.proofId },
    include: { enrollment: true },
  })
  if (!proof) throw NotFound("Proof not found")
  if (proof.enrollment.studentId !== args.userId) throw Forbidden()
  return toDto(proof)
}
