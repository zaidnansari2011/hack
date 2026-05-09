import { Router } from "express"
import { ok } from "@pol/shared"

import { getWalletProfileByAddress } from "@/services/proofs/proof-service"

export const credentialsRouter: Router = Router()

// Public — recruiters read wallet profiles without an account.
credentialsRouter.get("/by-address/:address", async (req, res, next) => {
  try {
    const profile = await getWalletProfileByAddress(String(req.params.address))
    res.json(ok({ profile }))
  } catch (err) {
    next(err)
  }
})
