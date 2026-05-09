import { Router } from "express"
import { ok } from "@pol/shared"
import { z } from "zod"

import { requireAuth, requireRole } from "@/middleware/auth"
import { validateBody } from "@/middleware/validate"
import { finalizeCompletion } from "@/services/quiz/completion"
import {
  getSession,
  startQuiz,
  submitQuiz,
} from "@/services/quiz/quiz-service"

const startSchema = z.object({
  enrollmentId: z.string().uuid(),
})

const submitSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().uuid(),
        choiceIndex: z.number().int().min(0).max(20),
      }),
    )
    .min(1)
    .max(20),
  fingerprint: z.record(z.string(), z.unknown()).optional(),
})

export const quizRouter: Router = Router()

quizRouter.use(requireAuth, requireRole("student"))

quizRouter.post("/start", validateBody(startSchema), async (req, res, next) => {
  try {
    const session = await startQuiz({
      userId: req.auth!.sub,
      enrollmentId: req.body.enrollmentId,
    })
    res.status(201).json(ok({ session }))
  } catch (err) {
    next(err)
  }
})

quizRouter.get("/:sessionId", async (req, res, next) => {
  try {
    const session = await getSession({
      userId: req.auth!.sub,
      sessionId: String(req.params.sessionId),
    })
    res.json(ok({ session }))
  } catch (err) {
    next(err)
  }
})

quizRouter.post(
  "/:sessionId/submit",
  validateBody(submitSchema),
  async (req, res, next) => {
    try {
      const outcome = await submitQuiz({
        userId: req.auth!.sub,
        sessionId: String(req.params.sessionId),
        answers: req.body.answers,
        fingerprint: req.body.fingerprint,
      })

      let result = outcome.result
      if (outcome.newlyPassed) {
        // Synchronously kick off completion: payout + proof. Both run their
        // own follow-up async work; the response carries the IDs the client
        // can poll.
        result = await finalizeCompletion({
          userId: req.auth!.sub,
          enrollmentId: outcome.enrollmentId,
          sessionId: outcome.result.sessionId,
          scorePct: outcome.result.scorePct,
        })
      }

      res.json(ok({ result }))
    } catch (err) {
      next(err)
    }
  },
)
