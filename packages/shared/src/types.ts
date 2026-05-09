import type {
  BountyStatus,
  EnrollmentStatus,
  PayoutStatus,
  ProofStatus,
  QuizStatus,
  UserRole,
} from "./constants"

// ─── Auth ────────────────────────────────────────────────────────
export type AuthUser = {
  id: string
  email: string
  name: string
  role: UserRole
  createdAt: string
}

export type AuthSignupRequest = {
  email: string
  password: string
  name: string
  role: UserRole
}

export type AuthLoginRequest = {
  email: string
  password: string
}

export type AuthResponse = {
  user: AuthUser
  token: string
}

// ─── Sponsor / Bounty ────────────────────────────────────────────
export type Bounty = {
  id: string
  sponsorId: string
  title: string
  description: string
  curriculumId: string
  rewardInr: number
  rewardUsdc: number
  maxStudents: number
  enrolled: number
  completed: number
  totalDepositUsdc: number
  remainingUsdc: number
  status: BountyStatus
  escrowTxHash: string | null
  createdAt: string
}

export type CreateBountyRequest = {
  title: string
  description: string
  curriculumId: string
  rewardInr: number
  maxStudents: number
}

export type BountyWithCurriculum = Bounty & { curriculum: Curriculum }

export type EnrollmentDetail = Enrollment & {
  bounty: Bounty
  curriculum: Curriculum
}

export type SponsorDashboard = {
  totalBounties: number
  activeBounties: number
  studentsCompleted: number
  totalCommittedInr: number
  totalRemainingInr: number
  recentBounties: Bounty[]
  analytics: SponsorAnalytics
}

export type ChainStatus = {
  mode: "live" | "simulated"
  chainId: number | null
  escrowAddress: string | null
  credentialAddress: string | null
  rpcConfigured: boolean
}

export type ActivityEvent =
  | {
      kind: "bounty_funded"
      at: string
      bountyId: string
      bountyTitle: string
      sponsorName: string
      rewardInr: number
      maxStudents: number
      escrowTxHash: string | null
    }
  | {
      kind: "completion"
      at: string
      bountyId: string
      bountyTitle: string
      studentInitials: string
      rewardInr: number
      curriculumTitle: string
      txHash: string | null
    }
  | {
      kind: "enrollment"
      at: string
      bountyId: string
      bountyTitle: string
      studentInitials: string
      curriculumTitle: string
    }

export type PlatformStats = {
  totalBounties: number
  totalCompletions: number
  totalPaidInr: number
  activeStudents: number
}

// ─── Curriculum ──────────────────────────────────────────────────
export type SyllabusModule = {
  module: string
  summary: string
  durationMinutes: number
}

export type Curriculum = {
  id: string
  slug: string
  title: string
  summary: string
  topics: string[]
  syllabus: SyllabusModule[]
  estimatedMinutes: number
  thumbnail: string | null
}

// ─── Enrollment ──────────────────────────────────────────────────
export type Enrollment = {
  id: string
  studentId: string
  bountyId: string
  status: EnrollmentStatus
  progressPct: number
  startedAt: string
  completedAt: string | null
}

// ─── Quiz ────────────────────────────────────────────────────────
export type QuizQuestion = {
  id: string
  prompt: string
  choices: string[]
  // The correct index is never sent to the client.
}

export type QuizSession = {
  id: string
  enrollmentId: string
  status: QuizStatus
  questions: QuizQuestion[]
  startedAt: string
  expiresAt: string
  durationSeconds: number
  scorePct: number | null
  passed: boolean | null
}

export type SubmitQuizRequest = {
  sessionId: string
  answers: { questionId: string; choiceIndex: number }[]
  fingerprint?: Record<string, unknown>
}

export type QuizResult = {
  sessionId: string
  scorePct: number
  passed: boolean
  rewardInr: number | null
  payoutId: string | null
  proofId: string | null
}

// ─── Payout ──────────────────────────────────────────────────────
export type Payout = {
  id: string
  studentId: string
  enrollmentId: string
  amountInr: number
  status: PayoutStatus
  upiId: string | null
  razorpayPayoutId: string | null
  failureReason: string | null
  createdAt: string
  confirmedAt: string | null
}

// ─── On-chain proof ──────────────────────────────────────────────
export type OnchainProof = {
  id: string
  enrollmentId: string
  studentAddress: string | null
  curriculumId: string
  scoreHash: string
  txHash: string | null
  tokenId: string | null
  status: ProofStatus
  createdAt: string
  mintedAt: string | null
}

// Public-facing verify payload — no PII, just credential facts a third
// party can audit alongside the on-chain tx.
export type VerifiedCredential = {
  txHash: string
  scoreHash: string
  commitment: string
  tokenId: string | null
  status: ProofStatus
  studentAddress: string | null
  studentInitials: string
  scorePct: number
  passedAt: string | null
  curriculum: {
    slug: string
    title: string
    summary: string
  }
  bounty: {
    id: string
    title: string
    sponsorName: string
    rewardInr: number
  }
  chain: {
    network: string
    basescanTxUrl: string
    basescanAddressUrl: string | null
  }
}

// ─── Recruiter portal ────────────────────────────────────────────
export type RecruitFilter = {
  curriculumSlug?: string
  minScorePct?: number
  withinDays?: number
}

export type RecruitCandidate = {
  txHash: string
  studentAddress: string | null
  studentInitials: string
  scorePct: number
  passedAt: string
  curriculumTitle: string
  curriculumSlug: string
  rewardInr: number
}

export type RecruitResults = {
  candidates: RecruitCandidate[]
  curricula: { slug: string; title: string; passedCount: number }[]
  total: number
}

// ─── Sponsor analytics ───────────────────────────────────────────
export type SponsorAnalytics = {
  costPerVerifiedLearnerInr: number
  completionRatePct: number
  bootcampMultiplier: number
  totalDeposited: number
  totalReleased: number
  averageScorePct: number
  medianMinutesToComplete: number | null
}

// ─── Tutor chat ──────────────────────────────────────────────────
export type ChatMessageMeta =
  | { kind: "lesson"; moduleIndex: number; module: string }
  | {
      kind: "check"
      moduleIndex: number
      questionId: string
      correctIndex: number
      answeredIndex: number | null
      correct: boolean | null
    }

export type ChatMessage = {
  id: string
  role: "user" | "tutor" | "system"
  content: string
  citations?: { chunkId: string; source: string; score: number }[]
  meta?: ChatMessageMeta
  createdAt: string
}

export type CheckQuestion = {
  questionId: string
  prompt: string
  choices: string[]
  moduleIndex: number
  module: string
}

export type EnrollmentProgressDetail = {
  coveredModuleIndexes: number[]
  progressPct: number
}

export type SendMessageRequest = {
  enrollmentId: string
  message: string
  lang?: TutorLanguage
}

export type SendMessageResponse = {
  message: ChatMessage
}

export type TutorLanguage = "en" | "hi" | "ta" | "te"

export type RemediationPlan = {
  sessionId: string
  weakModuleIndexes: number[]
  weakTopics: string[]
  microLesson: string
}
