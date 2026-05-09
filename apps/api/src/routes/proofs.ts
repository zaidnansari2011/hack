import { Router } from "express"
import { ok } from "@pol/shared"

import { requireAuth, requireRole } from "@/middleware/auth"
import {
  getProof,
  getVerifiedCredentialByTx,
} from "@/services/proofs/proof-service"

export const proofsRouter: Router = Router()

// Public lookup by tx hash — no auth, no PII beyond student initials.
proofsRouter.get("/by-tx/:txHash", async (req, res, next) => {
  try {
    const credential = await getVerifiedCredentialByTx(String(req.params.txHash))
    res.json(ok({ credential }))
  } catch (err) {
    next(err)
  }
})

proofsRouter.get(
  "/:id",
  requireAuth,
  requireRole("student"),
  async (req, res, next) => {
    try {
      const proof = await getProof({
        userId: req.auth!.sub,
        proofId: String(req.params.id),
      })
      res.json(ok({ proof }))
    } catch (err) {
      next(err)
    }
  },
)
