import { Router } from "express"
import { ok } from "@pol/shared"

import { prisma } from "@/db/prisma"

export const healthRouter: Router = Router()

healthRouter.get("/", (_req, res) => {
  res.json(ok({ status: "up", uptimeSec: Math.round(process.uptime()) }))
})

healthRouter.get("/ready", async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json(ok({ db: "up" }))
  } catch (err) {
    next(err)
  }
})
