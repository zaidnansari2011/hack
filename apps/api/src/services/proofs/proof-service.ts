import { keccak256, toHex, type Address } from "viem"
import type { OnchainProof as PrismaProof } from "@prisma/client"
import type {
  OnchainProof,
  VerifiedCredential,
  WalletProfile,
} from "@pol/shared"

import { prisma } from "@/db/prisma"
import { logger } from "@/config/logger"
import { Forbidden, NotFound } from "@/lib/errors"
import {
  basescanAddressUrl,
  basescanTxUrl,
  commitmentHash,
  mintCredential,
  releasePayout,
  scoreHash as makeScoreHash,
} from "@/services/blockchain/chain-service"

const NAME_INITIALS_RE = /\S+/g
function initials(name: string): string {
  const parts = name.match(NAME_INITIALS_RE) ?? []
  return parts
    .slice(0, 2)
    .map((p) => (p[0] ?? "").toUpperCase())
    .join("")
}

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

/**
 * Public lookup by tx hash — drives /verify/[txHash]. Returns no PII beyond
 * student initials. Either the release tx OR the credential mint tx will
 * resolve, since both are recorded for the same proof in different fields.
 */
export async function getVerifiedCredentialByTx(
  txHash: string,
): Promise<VerifiedCredential> {
  const normalized = txHash.toLowerCase().startsWith("0x")
    ? txHash.toLowerCase()
    : `0x${txHash.toLowerCase()}`

  const proof = await prisma.onchainProof.findFirst({
    where: { txHash: normalized },
    include: {
      curriculum: true,
      enrollment: {
        include: {
          student: true,
          bounty: { include: { sponsor: true } },
        },
      },
    },
  })
  if (!proof) throw NotFound("No credential found for this transaction")

  const session = await prisma.quizSession.findFirst({
    where: { enrollmentId: proof.enrollmentId, status: "passed" },
    orderBy: { submittedAt: "desc" },
  })

  const passed = (session?.passed ?? false) === true
  const commitment = proof.studentAddress
    ? commitmentHash(
        proof.studentAddress as Address,
        proof.curriculum.slug,
        passed,
      )
    : ("0x" + "0".repeat(64))

  return {
    txHash: proof.txHash ?? normalized,
    scoreHash: proof.scoreHash,
    commitment,
    tokenId: proof.tokenId,
    status: proof.status,
    studentAddress: proof.studentAddress,
    studentInitials: initials(proof.enrollment.student.name),
    scorePct: session?.scorePct ?? 0,
    passedAt: session?.submittedAt?.toISOString() ?? proof.mintedAt?.toISOString() ?? null,
    curriculum: {
      slug: proof.curriculum.slug,
      title: proof.curriculum.title,
      summary: proof.curriculum.summary,
    },
    bounty: {
      id: proof.enrollment.bountyId,
      title: proof.enrollment.bounty.title,
      sponsorName: proof.enrollment.bounty.sponsor.organizationName,
      rewardInr: proof.enrollment.bounty.rewardInr,
    },
    chain: {
      network: "Base Sepolia",
      basescanTxUrl: basescanTxUrl(proof.txHash ?? normalized),
      basescanAddressUrl: proof.studentAddress
        ? basescanAddressUrl(proof.studentAddress)
        : null,
    },
  }
}

/**
 * Public lookup by wallet address — drives /credentials/[address]. Returns
 * every minted SBT this address holds across curricula plus aggregate
 * earnings, so a recruiter can read the full transcript at a glance.
 */
export async function getWalletProfileByAddress(
  rawAddress: string,
): Promise<WalletProfile> {
  const address = rawAddress.toLowerCase().startsWith("0x")
    ? rawAddress.toLowerCase()
    : `0x${rawAddress.toLowerCase()}`

  const proofs = await prisma.onchainProof.findMany({
    where: { studentAddress: address, status: "minted" },
    include: {
      curriculum: true,
      enrollment: {
        include: {
          student: true,
          bounty: { include: { sponsor: true } },
        },
      },
    },
    orderBy: { mintedAt: "desc" },
  })
  if (proofs.length === 0) {
    throw NotFound("No credentials found for this address")
  }

  const sessions = await Promise.all(
    proofs.map((p) =>
      prisma.quizSession.findFirst({
        where: { enrollmentId: p.enrollmentId, status: "passed" },
        orderBy: { submittedAt: "desc" },
        select: { scorePct: true, submittedAt: true },
      }),
    ),
  )

  const credentials = proofs.map((p, i) => {
    const s = sessions[i]
    return {
      txHash: p.txHash ?? "",
      scorePct: s?.scorePct ?? 0,
      passedAt:
        s?.submittedAt?.toISOString() ?? p.mintedAt?.toISOString() ?? null,
      curriculumTitle: p.curriculum.title,
      curriculumSlug: p.curriculum.slug,
      rewardInr: p.enrollment.bounty.rewardInr,
      bountyTitle: p.enrollment.bounty.title,
      sponsorName: p.enrollment.bounty.sponsor.organizationName,
      tokenId: p.tokenId,
    }
  })

  const totalEarnedInr = credentials.reduce((s, c) => s + c.rewardInr, 0)
  const firstPassedAt = credentials
    .map((c) => c.passedAt)
    .filter((d): d is string => d !== null)
    .sort()[0] ?? null

  // Distinct curricula represented in this profile.
  const seen = new Set<string>()
  const curricula: { slug: string; title: string }[] = []
  for (const c of credentials) {
    if (!seen.has(c.curriculumSlug)) {
      seen.add(c.curriculumSlug)
      curricula.push({ slug: c.curriculumSlug, title: c.curriculumTitle })
    }
  }

  // Take initials from any of the underlying enrollment students — they're
  // all the same person since the address is keyed to one userId.
  const studentInitials = initials(proofs[0]?.enrollment.student.name ?? "")

  return {
    address,
    studentInitials,
    totalCredentials: credentials.length,
    totalEarnedInr,
    firstPassedAt,
    curricula,
    credentials,
    basescanAddressUrl: basescanAddressUrl(address),
  }
}

