export const USER_ROLES = ["student", "sponsor", "admin"] as const
export type UserRole = (typeof USER_ROLES)[number]

export const BOUNTY_STATUS = [
  "draft",
  "funding",
  "active",
  "paused",
  "depleted",
  "closed",
] as const
export type BountyStatus = (typeof BOUNTY_STATUS)[number]

export const ENROLLMENT_STATUS = [
  "active",
  "completed",
  "abandoned",
] as const
export type EnrollmentStatus = (typeof ENROLLMENT_STATUS)[number]

export const QUIZ_STATUS = [
  "in_progress",
  "submitted",
  "passed",
  "failed",
  "expired",
] as const
export type QuizStatus = (typeof QUIZ_STATUS)[number]

export const PAYOUT_STATUS = [
  "queued",
  "processing",
  "sent",
  "confirmed",
  "failed",
] as const
export type PayoutStatus = (typeof PAYOUT_STATUS)[number]

export const PROOF_STATUS = ["pending", "minted", "failed"] as const
export type ProofStatus = (typeof PROOF_STATUS)[number]

export const ERROR_CODES = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]
