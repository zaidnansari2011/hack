import { Router } from "express"
import { ok } from "@pol/shared"

import { listCurricula } from "@/services/bounties/bounty-service"

export const curriculaRouter: Router = Router()

curriculaRouter.get("/", async (_req, res, next) => {
  try {
    const data = await listCurricula()
    res.json(ok({ curricula: data }))
  } catch (err) {
    next(err)
  }
})
