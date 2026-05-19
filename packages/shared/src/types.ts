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

// One row in the demo-account picker on /login. Returned by
// GET /auth/demo-accounts so the frontend stays in sync with the seed.
export type DemoAccount = {
  email: string
  name: string
  role: UserRole
  // Short human-readable hint shown next to the account button, e.g.
  // "3 active bounties · ₹50,000 in escrow" for sponsors,
  // "₹600 earned · 3 credentials" for students.
  detail: string
}

// ─── Sponsor / Bounty ────────────────────────────────────────────
export type Bounty = {
  id: string
  slug: string
  sponsorId: string
  sponsorName: string | null
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

export type SponsorTopScorer = {
  studentInitials: string
  studentAddress: string | null
  scorePct: number
  rewardInr: number
  curriculumTitle: string
  bountyTitle: string
  passedAt: string
  txHash: string
}

export type SponsorDashboard = {
  totalBounties: number
  activeBounties: number
  studentsCompleted: number
  totalCommittedInr: number
  totalRemainingInr: number
  recentBounties: Bounty[]
  analytics: SponsorAnalytics
  topScorers: SponsorTopScorer[]
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

export type CurriculumCategory =
  | "engineering"
  | "data-ai"
  | "business"
  | "design"
  | "languages"
  | "health"
  | "science"
  | "soft-skills"
  | "agriculture"

export type CurriculumDifficulty = "beginner" | "intermediate" | "advanced"

export type Curriculum = {
  id: string
  slug: string
  title: string
  summary: string
  topics: string[]
  category: CurriculumCategory
  difficulty: CurriculumDifficulty
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

// ─── Wallet profile (recruiter's deep dive on one address) ──────
export type WalletCredential = {
  txHash: string
  scorePct: number
  passedAt: string | null
  curriculumTitle: string
  curriculumSlug: string
  rewardInr: number
  bountyTitle: string
  sponsorName: string
  tokenId: string | null
}

export type WalletProfile = {
  address: string
  studentName: string
  studentInitials: string
  totalCredentials: number
  totalEarnedInr: number
  firstPassedAt: string | null
  curricula: { slug: string; title: string }[]
  credentials: WalletCredential[]
  basescanAddressUrl: string
}

// Public-facing verify payload. The certificate's full data is also stored
// on-chain in the SBT's tokenURI (see `chain.tokenMetadata`), so anyone can
// independently audit the credential by reading the contract directly.
export type VerifiedCredential = {
  txHash: string
  scoreHash: string
  commitment: string
  tokenId: string | null
  status: ProofStatus
  studentAddress: string | null
  studentName: string
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
    // The exact JSON blob written to the SBT's tokenURI on Base Sepolia.
    // This is what makes the credential "fully on-chain": the certificate's
    // human-readable data is part of the token's immutable metadata, not
    // just our database.
    tokenMetadata: CertificateMetadata | null
  }
}

// The on-chain metadata blob — what the contract returns from tokenURI().
// We render it as a `data:application/json,...` URI so no IPFS is needed.
export type CertificateMetadata = {
  name: string
  description: string
  recipient: {
    name: string
    address: string
  }
  curriculum: {
    slug: string
    title: string
  }
  score: number
  sponsor: string
  issuedAt: string
  verifyUrl: string
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

// ─── Recruiter outreach ──────────────────────────────────────────
// An anonymous recruiter on /recruit clicks "Reach out" on a verified
// candidate and posts this payload. The backend resolves the address to
// a real userId so the student's inbox can render the message.
export type SendOutreachInput = {
  recipientAddress: string
  senderName: string
  senderEmail: string
  senderCompany?: string
  subject: string
  body: string
}

// Student-side DTO. Stored read state + inline reply live on the same row,
// so the inbox can render the whole exchange without a separate join.
export type RecruiterMessage = {
  id: string
  senderName: string
  senderEmail: string
  senderCompany: string | null
  subject: string
  body: string
  readAt: string | null
  replyBody: string | null
  repliedAt: string | null
  createdAt: string
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
  persona?: TutorPersona
  format?: TutorFormat
}

export type SendMessageResponse = {
  message: ChatMessage
}

export type TutorLanguage = "en" | "hi" | "ta" | "te"

// Personas the tutor can adopt, same RAG and same content but different
// teaching voice. Persisted in localStorage so the choice survives reloads.
// `socratic` is special: it refuses to state answers outright and only asks
// leading questions, so the learner reasons their way there.
export type TutorPersona = "mentor" | "examiner" | "coach" | "socratic"

// Response shape preference, independent of persona. Different learners
// retain differently: bullets scan well, prose reads warmly, examples-first
// grounds abstractions, brief is for "just answer me." Persisted to
// localStorage so the choice survives reloads.
export type TutorFormat = "prose" | "bullets" | "examples" | "brief"

export type RemediationPlan = {
  sessionId: string
  weakModuleIndexes: number[]
  weakTopics: string[]
  microLesson: string
}
