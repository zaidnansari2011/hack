import { Router } from "express"
import { ok, USER_ROLES } from "@pol/shared"
import { z } from "zod"

import { requireAuth } from "@/middleware/auth"
import { validateBody } from "@/middleware/validate"
import {
  getMe,
  listDemoAccounts,
  login,
  signup,
} from "@/services/auth/auth-service"

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2).max(120),
  role: z.enum(USER_ROLES),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const authRouter: Router = Router()

authRouter.post(
  "/signup",
  validateBody(signupSchema),
  async (req, res, next) => {
    try {
      const result = await signup(req.body)
      res.status(201).json(ok(result))
    } catch (err) {
      next(err)
    }
  },
)

authRouter.post("/login", validateBody(loginSchema), async (req, res, next) => {
  try {
    const result = await login(req.body)
    res.json(ok(result))
  } catch (err) {
    next(err)
  }
})

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await getMe(req.auth!.sub)
    res.json(ok({ user }))
  } catch (err) {
    next(err)
  }
})

// Public list of seeded demo accounts used to populate the picker on
// /login. Returns only accounts with the seed email suffixes so real
// signups never leak into the list. Password for all of these is
// "demo1234" (the frontend hardcodes it; the API still validates).
authRouter.get("/demo-accounts", async (_req, res, next) => {
  try {
    const accounts = await listDemoAccounts()
    res.json(ok({ accounts }))
  } catch (err) {
    next(err)
  }
})
