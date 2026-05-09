import { Router } from "express"
import { ok } from "@pol/shared"

import { summary } from "@/services/blockchain/chain-service"

export const chainRouter: Router = Router()

// Lets the web app render an honest "live on Base Sepolia" / "demo mode" badge.
chainRouter.get("/", (_req, res) => {
  res.json(ok(summary()))
})
