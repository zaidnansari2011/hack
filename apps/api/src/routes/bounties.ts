import { Router } from "express"
import { ok } from "@pol/shared"
import { z } from "zod"

import { optionalAuth, requireAuth, requireRole } from "@/middleware/auth"
import { validateBody } from "@/middleware/validate"
import {
  createBounty,
  getBounty,
  getSponsorDashboard,
  listBounties,
  listMyBounties,
} from "@/services/bounties/bounty-service"

const createSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(2000),
  curriculumId: z.string().uuid(),
  rewardInr: z.number().int().min(1).max(1_000_000),
  maxStudents: z.number().int().min(1).max(100_000),
})

export const bountiesRouter: Router = Router()

// Public list — when called with a student token, hides bounties they've
// already completed so the marketplace stays focused on what's still earnable.
bountiesRouter.get("/", optionalAuth, async (req, res, next) => {
  try {
    const excludeFor =
      req.auth?.role === "student" ? req.auth.sub : undefined
    const data = await listBounties({ excludeCompletedForUserId: excludeFor })
    res.json(ok({ bounties: data }))
  } catch (err) {
    next(err)
  }
})

// Sponsor: my bounties — must be defined BEFORE :id route to avoid shadowing.
bountiesRouter.get(
  "/mine",
  requireAuth,
  requireRole("sponsor"),
  async (req, res, next) => {
    try {
      const data = await listMyBounties(req.auth!.sub)
      res.json(ok({ bounties: data }))
    } catch (err) {
      next(err)
    }
  },
)

// Sponsor: dashboard summary
bountiesRouter.get(
  "/dashboard",
  requireAuth,
  requireRole("sponsor"),
  async (req, res, next) => {
    try {
      const data = await getSponsorDashboard(req.auth!.sub)
      res.json(ok(data))
    } catch (err) {
      next(err)
    }
  },
)

bountiesRouter.get("/:id", async (req, res, next) => {
  try {
    const data = await getBounty(req.params.id)
    res.json(ok({ bounty: data }))
  } catch (err) {
    next(err)
  }
})

bountiesRouter.post(
  "/",
  requireAuth,
  requireRole("sponsor"),
  validateBody(createSchema),
  async (req, res, next) => {
    try {
      const bounty = await createBounty({
        userId: req.auth!.sub,
        ...req.body,
      })
      res.status(201).json(ok({ bounty }))
    } catch (err) {
      next(err)
    }
  },
)
