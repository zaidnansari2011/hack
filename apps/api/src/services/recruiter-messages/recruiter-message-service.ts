import type { RecruiterMessage as PrismaRecruiterMessage } from "@prisma/client"
import type {
  RecruiterMessage,
  SendOutreachInput,
} from "@pol/shared"

import { prisma } from "@/db/prisma"
import { Forbidden, NotFound } from "@/lib/errors"

function toDto(m: PrismaRecruiterMessage): RecruiterMessage {
  return {
    id: m.id,
    senderName: m.senderName,
    senderEmail: m.senderEmail,
    senderCompany: m.senderCompany,
    subject: m.subject,
    body: m.body,
    readAt: m.readAt?.toISOString() ?? null,
    replyBody: m.replyBody,
    repliedAt: m.repliedAt?.toISOString() ?? null,
    createdAt: m.createdAt.toISOString(),
  }
}

/**
 * Resolve a wallet address back to the userId that owns it. We don't store
 * a reverse index — instead the OnchainProof table already pairs every
 * minted address with the enrollment that produced it, so a single read
 * gives us the student. If no minted proof matches, the address has no
 * verified record on this platform and outreach is rejected.
 */
async function resolveRecipientUserId(rawAddress: string): Promise<string> {
  const address = rawAddress.toLowerCase().startsWith("0x")
    ? rawAddress.toLowerCase()
    : `0x${rawAddress.toLowerCase()}`

  const proof = await prisma.onchainProof.findFirst({
    where: { studentAddress: address, status: "minted" },
    include: { enrollment: { select: { studentId: true } } },
  })
  if (!proof) {
    throw NotFound("No verified candidate at this address")
  }
  return proof.enrollment.studentId
}

/**
 * Public-side write: an anonymous recruiter sends an outreach message to a
 * verified candidate identified by their wallet address. We resolve the
 * address to a real userId so the student's inbox can read these via a
 * normal foreign-key join.
 */
export async function sendOutreach(
  input: SendOutreachInput,
): Promise<{ id: string }> {
  const recipientUserId = await resolveRecipientUserId(input.recipientAddress)

  const created = await prisma.recruiterMessage.create({
    data: {
      recipientUserId,
      recipientAddress: input.recipientAddress.toLowerCase(),
      senderName: input.senderName.trim(),
      senderEmail: input.senderEmail.trim(),
      senderCompany: input.senderCompany?.trim() || null,
      subject: input.subject.trim(),
      body: input.body.trim(),
    },
    select: { id: true },
  })
  return { id: created.id }
}

/**
 * Student-side read: their full inbox of recruiter outreach, newest first.
 */
export async function listInboxForStudent(
  userId: string,
): Promise<RecruiterMessage[]> {
  const rows = await prisma.recruiterMessage.findMany({
    where: { recipientUserId: userId },
    orderBy: { createdAt: "desc" },
  })
  return rows.map(toDto)
}

/**
 * Mark a single message as read. Idempotent — re-marking a message that's
 * already read returns the existing readAt timestamp untouched.
 */
export async function markRead(
  userId: string,
  messageId: string,
): Promise<RecruiterMessage> {
  const existing = await prisma.recruiterMessage.findUnique({
    where: { id: messageId },
  })
  if (!existing) throw NotFound("Message not found")
  if (existing.recipientUserId !== userId) throw Forbidden()
  if (existing.readAt) return toDto(existing)

  const updated = await prisma.recruiterMessage.update({
    where: { id: messageId },
    data: { readAt: new Date() },
  })
  return toDto(updated)
}

/**
 * Student-side write: post a single inline reply to an outreach message.
 * Replying once locks the reply (no edits) — keeps the demo flow obvious
 * and avoids the need for a thread table in the hackathon scope.
 */
export async function replyToOutreach(
  userId: string,
  messageId: string,
  body: string,
): Promise<RecruiterMessage> {
  const trimmed = body.trim()
  if (!trimmed) throw new Error("Reply cannot be empty")

  const existing = await prisma.recruiterMessage.findUnique({
    where: { id: messageId },
  })
  if (!existing) throw NotFound("Message not found")
  if (existing.recipientUserId !== userId) throw Forbidden()
  if (existing.replyBody) throw new Error("This message has already been replied to")

  const now = new Date()
  const updated = await prisma.recruiterMessage.update({
    where: { id: messageId },
    data: {
      replyBody: trimmed,
      repliedAt: now,
      // A reply also implies "read", in case the student replies without
      // first explicitly opening the message.
      readAt: existing.readAt ?? now,
    },
  })
  return toDto(updated)
}
