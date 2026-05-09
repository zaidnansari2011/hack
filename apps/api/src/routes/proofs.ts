import { Router } from "express"
import { ok } from "@pol/shared"

import { requireAuth, requireRole } from "@/middleware/auth"
import { getProof } from "@/services/proofs/proof-service"

export const proofsRouter: Router = Router()

proofsRouter.use(requireAuth, requireRole("student"))

proofsRouter.get("/:id", async (req, res, next) => {
  try {
    const proof = await getProof({
      userId: req.auth!.sub,
      proofId: String(req.params.id),
    })
    res.json(ok({ proof }))
  } catch (err) {
    next(err)
  }
})
