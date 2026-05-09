import { Router } from "express"
import { ok } from "@pol/shared"
import rateLimit from "express-rate-limit"
import { z } from "zod"

import { requireAuth, requireRole } from "@/middleware/auth"
import { validateBody } from "@/middleware/validate"
import {
  generateRemediation,
  getCheckQuestion,
  getEnrollmentProgressDetail,
  getHistory,
  sendMessage,
  submitCheckAnswer,
  teachModule,
} from "@/services/tutor/tutor-service"
import { groqAvailable } from "@/services/tutor/groq-client"

const sendSchema = z.object({
  enrollmentId: z.string().uuid(),
  message: z.string().min(1).max(2000),
  lang: z.enum(["en", "hi", "ta", "te"]).optional(),
})

const remediateSchema = z.object({
  sessionId: z.string().uuid(),
  lang: z.enum(["en", "hi", "ta", "te"]).optional(),
})

const lessonSchema = z.object({
  enrollmentId: z.string().uuid(),
  moduleIndex: z.number().int().min(0).max(31),
  lang: z.enum(["en", "hi", "ta", "te"]).optional(),
})

const checkGetSchema = z.object({
  enrollmentId: z.string().uuid(),
  moduleIndex: z.number().int().min(0).max(31),
})

const checkSubmitSchema = z.object({
  enrollmentId: z.string().uuid(),
  moduleIndex: z.number().int().min(0).max(31),
  questionId: z.string().uuid(),
  answeredIndex: z.number().int().min(0).max(7),
})

// Tighter rate limit on tutor calls — Groq usage is metered.
const tutorLimit = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
})

export const tutorRouter: Router = Router()

tutorRouter.use(requireAuth)

tutorRouter.get("/status", (_req, res) => {
  res.json(ok({ groq: groqAvailable() ? "live" : "offline" }))
})

tutorRouter.get(
  "/history/:enrollmentId",
  requireRole("student"),
  async (req, res, next) => {
    try {
      const messages = await getHistory({
        enrollmentId: String(req.params.enrollmentId),
        userId: req.auth!.sub,
      })
      res.json(ok({ messages }))
    } catch (err) {
      next(err)
    }
  },
)

tutorRouter.post(
  "/messages",
  requireRole("student"),
  tutorLimit,
  validateBody(sendSchema),
  async (req, res, next) => {
    try {
      const result = await sendMessage({
        enrollmentId: req.body.enrollmentId,
        userId: req.auth!.sub,
        message: req.body.message,
        lang: req.body.lang,
      })
      res.status(201).json(ok(result))
    } catch (err) {
      next(err)
    }
  },
)

tutorRouter.post(
  "/remediate",
  requireRole("student"),
  tutorLimit,
  validateBody(remediateSchema),
  async (req, res, next) => {
    try {
      const result = await generateRemediation({
        userId: req.auth!.sub,
        sessionId: req.body.sessionId,
        lang: req.body.lang,
      })
      res.status(201).json(ok(result))
    } catch (err) {
      next(err)
    }
  },
)

tutorRouter.post(
  "/lesson",
  requireRole("student"),
  tutorLimit,
  validateBody(lessonSchema),
  async (req, res, next) => {
    try {
      const tutor = await teachModule({
        enrollmentId: req.body.enrollmentId,
        userId: req.auth!.sub,
        moduleIndex: req.body.moduleIndex,
        lang: req.body.lang,
      })
      res.status(201).json(ok({ tutor }))
    } catch (err) {
      next(err)
    }
  },
)

tutorRouter.post(
  "/check",
  requireRole("student"),
  validateBody(checkGetSchema),
  async (req, res, next) => {
    try {
      const question = await getCheckQuestion({
        enrollmentId: req.body.enrollmentId,
        userId: req.auth!.sub,
        moduleIndex: req.body.moduleIndex,
      })
      res.json(ok({ question }))
    } catch (err) {
      next(err)
    }
  },
)

tutorRouter.post(
  "/check/submit",
  requireRole("student"),
  validateBody(checkSubmitSchema),
  async (req, res, next) => {
    try {
      const result = await submitCheckAnswer({
        enrollmentId: req.body.enrollmentId,
        userId: req.auth!.sub,
        moduleIndex: req.body.moduleIndex,
        questionId: req.body.questionId,
        answeredIndex: req.body.answeredIndex,
      })
      res.status(201).json(ok(result))
    } catch (err) {
      next(err)
    }
  },
)

tutorRouter.get(
  "/progress/:enrollmentId",
  requireRole("student"),
  async (req, res, next) => {
    try {
      const data = await getEnrollmentProgressDetail({
        enrollmentId: String(req.params.enrollmentId),
        userId: req.auth!.sub,
      })
      res.json(ok(data))
    } catch (err) {
      next(err)
    }
  },
)
