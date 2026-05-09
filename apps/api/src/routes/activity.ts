import { Router } from "express"
import { ok } from "@pol/shared"

import { platformStats, recentActivity } from "@/services/activity/activity-service"

export const activityRouter: Router = Router()

// Public — no auth. Drives the landing page's social-proof strip.
activityRouter.get("/", async (_req, res, next) => {
  try {
    const [events, stats] = await Promise.all([
      recentActivity(12),
      platformStats(),
    ])
    res.json(ok({ events, stats }))
  } catch (err) {
    next(err)
  }
})
