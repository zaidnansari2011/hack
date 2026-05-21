import { Router } from "express"
import { ok } from "@pol/shared"

import { getLeaderboard } from "@/services/leaderboard/leaderboard-service"

export const leaderboardRouter: Router = Router()

// Public — anyone can see who has done the most learning and who has funded it.
leaderboardRouter.get("/", async (_req, res, next) => {
  try {
    const data = await getLeaderboard()
    res.json(ok(data))
  } catch (err) {
    next(err)
  }
})
