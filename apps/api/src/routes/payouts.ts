import { Router } from "express"
import { ok } from "@pol/shared"

import { requireAuth, requireRole } from "@/middleware/auth"
import { getPayout, listMyPayouts } from "@/services/payouts/payout-service"

export const payoutsRouter: Router = Router()

payoutsRouter.use(requireAuth, requireRole("student"))

payoutsRouter.get("/mine", async (req, res, next) => {
  try {
    const payouts = await listMyPayouts(req.auth!.sub)
    res.json(ok({ payouts }))
  } catch (err) {
    next(err)
  }
})

payoutsRouter.get("/:id", async (req, res, next) => {
  try {
    const payout = await getPayout({
      userId: req.auth!.sub,
      payoutId: String(req.params.id),
    })
    res.json(ok({ payout }))
  } catch (err) {
    next(err)
  }
})
