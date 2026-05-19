import { Router } from "express"
import { ok } from "@pol/shared"
import rateLimit from "express-rate-limit"
import { z } from "zod"

import { requireAuth, requireRole } from "@/middleware/auth"
import { validateBody } from "@/middleware/validate"
import {
  listInboxForStudent,
  markRead,
  replyToOutreach,
  sendOutreach,
} from "@/services/recruiter-messages/recruiter-message-service"

export const recruiterMessagesRouter: Router = Router()

// Outreach is public — anonymous recruiters POST without an account. We
// rate-limit aggressively to keep spam from filling student inboxes. Real
// production would put a captcha + email verification in front; this is
// fine for a hackathon demo.
const outreachLimit = rateLimit({
  windowMs: 60_000,
  max: 6,
  standardHeaders: true,
  legacyHeaders: false,
})

const addressRegex = /^0x[0-9a-fA-F]{40}$/

const sendSchema = z.object({
  recipientAddress: z.string().regex(addressRegex, "Invalid wallet address"),
  senderName: z.string().min(1).max(120),
  senderEmail: z.string().email(),
  senderCompany: z.string().max(120).optional(),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(4000),
})

const replySchema = z.object({
  body: z.string().min(1).max(4000),
})

// Public — anonymous recruiter sends an outreach message.
recruiterMessagesRouter.post(
  "/",
  outreachLimit,
  validateBody(sendSchema),
  async (req, res, next) => {
    try {
      const result = await sendOutreach(req.body)
      res.status(201).json(ok(result))
    } catch (err) {
      next(err)
    }
  },
)

// Below this line: student-authenticated routes only.
recruiterMessagesRouter.use(requireAuth)
recruiterMessagesRouter.use(requireRole("student"))

// Student inbox — every recruiter outreach addressed to this user.
recruiterMessagesRouter.get("/", async (req, res, next) => {
  try {
    const messages = await listInboxForStudent(req.auth!.sub)
    res.json(ok({ messages }))
  } catch (err) {
    next(err)
  }
})

// Mark one message as read.
recruiterMessagesRouter.post("/:id/read", async (req, res, next) => {
  try {
    const message = await markRead(req.auth!.sub, String(req.params.id))
    res.json(ok({ message }))
  } catch (err) {
    next(err)
  }
})

// Student replies once, inline. Re-posting after a reply already exists is
// rejected by the service — keeps the demo loop unambiguous.
recruiterMessagesRouter.post(
  "/:id/reply",
  validateBody(replySchema),
  async (req, res, next) => {
    try {
      const message = await replyToOutreach(
        req.auth!.sub,
        String(req.params.id),
        req.body.body,
      )
      res.json(ok({ message }))
    } catch (err) {
      next(err)
    }
  },
)
