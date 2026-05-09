import { Router } from "express"
import { ok } from "@pol/shared"

import { platformStats, recentActivity } from "@/services/activity/activity-service"
import { logger } from "@/config/logger"

export const activityRouter: Router = Router()

// Public — no auth. Drives the landing page's social-proof strip.
activityRouter.get("/", async (_req, res, next) => {
  try {
    const [events, stats] = await Promise.all([
      recentActivity(12),
      platformStats(),
    ])
    res.json(ok({ events, stats }))
  } catch (err) {
    next(err)
  }
})

/**
 * Server-Sent Events feed. Pushes the same {events, stats} payload as
 * GET /activity, but at a steady cadence and over a single long-lived
 * connection — so the landing ticker reflects new completions without
 * a polling round-trip. Falls back to polling on the client when the
 * connection drops or EventSource is unavailable.
 */
activityRouter.get("/stream", async (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  })
  res.flushHeaders?.()

  let lastSerialized = ""
  let cancelled = false

  const push = async () => {
    if (cancelled) return
    try {
      const [events, stats] = await Promise.all([
        recentActivity(12),
        platformStats(),
      ])
      const serialized = JSON.stringify({ events, stats })
      // Only emit if the payload actually changed — keeps the wire quiet
      // and lets clients animate genuinely new state.
      if (serialized !== lastSerialized) {
        lastSerialized = serialized
        res.write(`event: activity\n`)
        res.write(`data: ${serialized}\n\n`)
      } else {
        // Heartbeat comment so proxies don't reap an idle connection.
        res.write(`: ping\n\n`)
      }
    } catch (err) {
      logger.warn(
        { err: err instanceof Error ? err.message : String(err) },
        "activity stream tick failed",
      )
    }
  }

  await push() // immediate first frame
  const timer = setInterval(push, 4000)

  req.on("close", () => {
    cancelled = true
    clearInterval(timer)
    res.end()
  })
})
