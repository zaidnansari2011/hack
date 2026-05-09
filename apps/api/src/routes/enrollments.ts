import { Router } from "express"
import { ok } from "@pol/shared"
import { z } from "zod"

import { requireAuth, requireRole } from "@/middleware/auth"
import { validateBody } from "@/middleware/validate"
import {
  bumpProgress,
  getEnrollment,
  getEnrollmentByBounty,
  listMyEnrollments,
  startEnrollment,
} from "@/services/enrollments/enrollment-service"

const startSchema = z.object({
  bountyId: z.string().uuid(),
})

const progressSchema = z.object({
  progressPct: z.number().int().min(0).max(100),
})

export const enrollmentsRouter: Router = Router()

enrollmentsRouter.use(requireAuth)

enrollmentsRouter.get("/mine", requireRole("student"), async (req, res, next) => {
  try {
    const data = await listMyEnrollments({ userId: req.auth!.sub })
    res.json(ok({ enrollments: data }))
  } catch (err) {
    next(err)
  }
})

enrollmentsRouter.get(
  "/by-bounty/:bountyId",
  requireRole("student"),
  async (req, res, next) => {
    try {
      const data = await getEnrollmentByBounty({
        userId: req.auth!.sub,
        bountyId: String(req.params.bountyId),
      })
      res.json(ok({ enrollment: data }))
    } catch (err) {
      next(err)
    }
  },
)

enrollmentsRouter.get("/:id", async (req, res, next) => {
  try {
    const data = await getEnrollment({
      userId: req.auth!.sub,
      enrollmentId: String(req.params.id),
    })
    res.json(ok({ enrollment: data }))
  } catch (err) {
    next(err)
  }
})

enrollmentsRouter.post(
  "/",
  requireRole("student"),
  validateBody(startSchema),
  async (req, res, next) => {
    try {
      const data = await startEnrollment({
        userId: req.auth!.sub,
        bountyId: req.body.bountyId,
      })
      res.status(201).json(ok({ enrollment: data }))
    } catch (err) {
      next(err)
    }
  },
)

enrollmentsRouter.patch(
  "/:id/progress",
  requireRole("student"),
  validateBody(progressSchema),
  async (req, res, next) => {
    try {
      const data = await bumpProgress({
        userId: req.auth!.sub,
        enrollmentId: String(req.params.id),
        progressPct: req.body.progressPct,
      })
      res.json(ok({ enrollment: data }))
    } catch (err) {
      next(err)
    }
  },
)
