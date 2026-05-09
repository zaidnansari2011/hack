import { createApp } from "@/app"
import { env } from "@/config/env"
import { logger } from "@/config/logger"

const app = createApp()

const server = app.listen(env.API_PORT, () => {
  logger.info(`🚀 API listening on http://localhost:${env.API_PORT}`)
  logger.info(`   env: ${env.NODE_ENV}`)
  logger.info(`   payout simulation: ${env.PAYOUT_SIMULATION ? "ON" : "OFF"}`)
})

const shutdown = (signal: string) => {
  logger.info(`${signal} received, shutting down...`)
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(1), 10_000).unref()
}

process.on("SIGINT", () => shutdown("SIGINT"))
process.on("SIGTERM", () => shutdown("SIGTERM"))
