import bcrypt from "bcryptjs"
import type { AuthUser, DemoAccount, UserRole } from "@pol/shared"

import { prisma } from "@/db/prisma"
import { Conflict, Unauthorized } from "@/lib/errors"
import { signToken } from "@/middleware/auth"

const BCRYPT_COST = 10

// Seeded demo accounts use these email suffixes. We use the suffix as a
// safety filter on the demo-accounts endpoint so we never accidentally
// surface real signups (which would never end in .pol or .example) on the
// public login picker.
const DEMO_EMAIL_SUFFIXES = [".pol", ".example"]

const toAuthUser = (u: {
  id: string
  email: string
  name: string
  role: string
  createdAt: Date
}): AuthUser => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role as UserRole,
  createdAt: u.createdAt.toISOString(),
})

export async function signup(input: {
  email: string
  password: string
  name: string
  role: UserRole
}) {
  const email = input.email.toLowerCase().trim()
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) throw Conflict("An account with that email already exists")

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST)

  const user = await prisma.user.create({
    data: {
      email,
      name: input.name.trim(),
      role: input.role,
      passwordHash,
    },
  })

  if (user.role === "sponsor") {
    await prisma.sponsor.create({
      data: { userId: user.id, organizationName: user.name },
    })
  } else if (user.role === "student") {
    await prisma.studentProfile.create({ data: { userId: user.id } })
  }

  const token = signToken({
    sub: user.id,
    email: user.email,
    role: user.role as UserRole,
  })

  return { user: toAuthUser(user), token }
}

export async function login(input: { email: string; password: string }) {
  const email = input.email.toLowerCase().trim()
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) throw Unauthorized("Invalid email or password")

  const ok = await bcrypt.compare(input.password, user.passwordHash)
  if (!ok) throw Unauthorized("Invalid email or password")

  const token = signToken({
    sub: user.id,
    email: user.email,
    role: user.role as UserRole,
  })

  return { user: toAuthUser(user), token }
}

export async function getMe(userId: string): Promise<AuthUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw Unauthorized()
  return toAuthUser(user)
}

/**
 * Return every seeded demo account, with a short "detail" hint so the
 * picker on /login can render meaningful descriptions. Public endpoint
 * (no auth) so the login page can call it before the user has a token;
 * we limit to demo-suffix emails so real signups never leak into the list.
 */
export async function listDemoAccounts(): Promise<DemoAccount[]> {
  const users = await prisma.user.findMany({
    where: {
      OR: DEMO_EMAIL_SUFFIXES.map((suffix) => ({
        email: { endsWith: suffix },
      })),
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      sponsor: {
        select: {
          id: true,
          bounties: {
            select: {
              id: true,
              status: true,
              totalDepositMicros: true,
            },
          },
        },
      },
      studentProfile: {
        select: {
          totalEarnedInr: true,
        },
      },
    },
    orderBy: [{ role: "asc" }, { email: "asc" }],
  })

  // Count credentials per student in a second pass so the detail string
  // can advertise "3 credentials" for showcase personas. We count
  // completed enrollments because each completion is the proof event;
  // the on-chain OnchainProof row links via Enrollment, not directly to
  // a student, so going through Enrollment is the natural pivot.
  const studentIds = users
    .filter((u) => u.role === "student")
    .map((u) => u.id)
  const credentialCounts = new Map<string, number>()
  if (studentIds.length > 0) {
    const grouped = await prisma.enrollment.groupBy({
      by: ["studentId"],
      where: { studentId: { in: studentIds }, status: "completed" },
      _count: { id: true },
    })
    for (const g of grouped) credentialCounts.set(g.studentId, g._count.id)
  }

  const accounts: DemoAccount[] = users.map((u) => {
    let detail: string
    if (u.role === "sponsor") {
      const bounties = u.sponsor?.bounties ?? []
      const active = bounties.filter((b) => b.status === "active").length
      const totalUsdc = bounties.reduce(
        (sum, b) => sum + Number(b.totalDepositMicros) / 1_000_000,
        0,
      )
      const usdc = Math.round(totalUsdc)
      detail =
        bounties.length === 0
          ? "New sponsor · no bounties yet"
          : `${active} active bount${active === 1 ? "y" : "ies"} · $${usdc.toLocaleString("en-US")} escrowed`
    } else if (u.role === "student") {
      const earned = u.studentProfile?.totalEarnedInr ?? 0
      const creds = credentialCounts.get(u.id) ?? 0
      const earnedLine =
        earned > 0
          ? `₹${earned.toLocaleString("en-IN")} earned`
          : "No earnings yet"
      const credLine =
        creds > 0
          ? `${creds} credential${creds === 1 ? "" : "s"}`
          : "Ready to learn"
      detail = `${earnedLine} · ${credLine}`
    } else {
      detail = "Admin account"
    }
    return {
      email: u.email,
      name: u.name,
      role: u.role as UserRole,
      detail,
    }
  })

  // Stable sort: sponsors first, students second; within each role
  // alphabetical by name so the order is predictable across reloads.
  return accounts.sort((a, b) => {
    if (a.role !== b.role) return a.role === "sponsor" ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}
