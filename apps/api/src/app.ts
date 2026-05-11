import cors from "cors"
import express, { type Express } from "express"
import rateLimit from "express-rate-limit"
import helmet from "helmet"
import morgan from "morgan"

import { env } from "@/config/env"
import { logger } from "@/config/logger"
import { errorHandler, notFoundHandler } from "@/middleware/error-handler"
import { apiRouter } from "@/routes"

export function createApp(): Express {
  const app = express()

  app.disable("x-powered-by")
  app.use(helmet())
  app.use(
    cors({
      origin: [env.WEB_APP_URL, /\.ngrok-free\.app$/, /\.ngrok\.io$/],
      credentials: true,
    }),
  )
  app.use(express.json({ limit: "1mb" }))
  app.use(
    morgan(env.NODE_ENV === "production" ? "combined" : "dev", {
      stream: { write: (msg) => logger.info(msg.trim()) },
    }),
  )

  // Global rate limit — webhook routes will mount their own stricter limits.
  app.use(
    rateLimit({
      windowMs: 60_000,
      max: 240,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  )

  app.get("/", (_req, res) => {
    res.json({ success: true, data: { name: "Proof-of-Learn API", version: "v1", docs: "/api/v1" } })
  })

  app.use("/api/v1", apiRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
