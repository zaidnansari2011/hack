import { ERROR_CODES, type ErrorCode } from "@pol/shared"

export class HttpError extends Error {
  public readonly statusCode: number
  public readonly code: ErrorCode
  public readonly details?: unknown

  constructor(
    statusCode: number,
    code: ErrorCode,
    message: string,
    details?: unknown,
  ) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

export const Unauthorized = (message = "Authentication required") =>
  new HttpError(401, ERROR_CODES.UNAUTHORIZED, message)

export const Forbidden = (message = "Forbidden") =>
  new HttpError(403, ERROR_CODES.FORBIDDEN, message)

export const NotFound = (message = "Not found") =>
  new HttpError(404, ERROR_CODES.NOT_FOUND, message)

export const ValidationError = (message: string, details?: unknown) =>
  new HttpError(400, ERROR_CODES.VALIDATION_ERROR, message, details)

export const Conflict = (message: string) =>
  new HttpError(409, ERROR_CODES.CONFLICT, message)

export const ExternalServiceError = (message: string, details?: unknown) =>
  new HttpError(502, ERROR_CODES.EXTERNAL_SERVICE_ERROR, message, details)
