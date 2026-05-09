import bcrypt from "bcryptjs"
import type { AuthUser, UserRole } from "@pol/shared"

import { prisma } from "@/db/prisma"
import { Conflict, Unauthorized } from "@/lib/errors"
import { signToken } from "@/middleware/auth"

const BCRYPT_COST = 10

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
