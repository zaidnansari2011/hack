import type { NextFunction, Request, RequestHandler, Response } from "express"
import jwt from "jsonwebtoken"
import type { UserRole } from "@pol/shared"

import { env } from "@/config/env"
import { Forbidden, Unauthorized } from "@/lib/errors"

export type JwtPayload = {
  sub: string
  email: string
  role: UserRole
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: JwtPayload
    }
  }
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.header("authorization")
  if (!header?.startsWith("Bearer ")) {
    throw Unauthorized("Missing bearer token")
  }
  const token = header.slice("Bearer ".length).trim()
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload
    req.auth = payload
    next()
  } catch {
    throw Unauthorized("Invalid or expired token")
  }
}

/**
 * Like requireAuth, but doesn't 401 when the token is missing — just leaves
 * req.auth unset. Useful for public endpoints that want to *personalize* the
 * response when a user is signed in.
 */
export const optionalAuth: RequestHandler = (req, _res, next) => {
  const header = req.header("authorization")
  if (!header?.startsWith("Bearer ")) {
    next()
    return
  }
  const token = header.slice("Bearer ".length).trim()
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload
    req.auth = payload
  } catch {
    // ignore — treat as anonymous
  }
  next()
}

export const requireRole =
  (...roles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) throw Unauthorized()
    if (!roles.includes(req.auth.role)) throw Forbidden()
    next()
  }

export const signToken = (payload: JwtPayload) =>
  jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRY as jwt.SignOptions["expiresIn"],
  })
