import { Router } from "express"
import { ok } from "@pol/shared"

import { searchCandidates } from "@/services/recruit/recruit-service"

export const recruitRouter: Router = Router()

// Public — recruiters don't need an account to query verified credentials.
recruitRouter.get("/", async (req, res, next) => {
  try {
    const curriculumSlug =
      typeof req.query.curriculum === "string" ? req.query.curriculum : undefined
    const minScorePctRaw = req.query.minScore
    const minScorePct =
      typeof minScorePctRaw === "string" && minScorePctRaw
        ? Math.max(0, Math.min(100, Number(minScorePctRaw)))
        : undefined
    const withinDaysRaw = req.query.withinDays
    const withinDays =
      typeof withinDaysRaw === "string" && withinDaysRaw
        ? Math.max(1, Math.min(365, Number(withinDaysRaw)))
        : undefined

    const results = await searchCandidates({
      curriculumSlug,
      minScorePct,
      withinDays,
    })
    res.json(ok(results))
  } catch (err) {
    next(err)
  }
})
