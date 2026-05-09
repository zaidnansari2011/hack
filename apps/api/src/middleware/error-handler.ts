import type { ErrorRequestHandler, RequestHandler } from "express"
import { ERROR_CODES, fail } from "@pol/shared"
import { ZodError } from "zod"

import { logger } from "@/config/logger"
import { HttpError } from "@/lib/errors"

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json(
    fail(ERROR_CODES.NOT_FOUND, `Route not found: ${req.method} ${req.path}`),
  )
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) {
    res
      .status(err.statusCode)
      .json(fail(err.code, err.message, err.details))
    return
  }

  if (err instanceof ZodError) {
    res
      .status(400)
      .json(
        fail(
          ERROR_CODES.VALIDATION_ERROR,
          "Request validation failed",
          err.flatten(),
        ),
      )
    return
  }

  logger.error({ err, path: req.path, method: req.method }, "unhandled error")

  res
    .status(500)
    .json(fail(ERROR_CODES.INTERNAL_ERROR, "Internal server error"))
}
