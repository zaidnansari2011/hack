# Data Model

ORM: **Prisma** (PostgreSQL)
Schema location: `apps/api/prisma/schema.prisma`

---

## Entity Relationship Diagram

```
┌──────────────┐     1:N     ┌──────────────┐     1:N     ┌──────────────┐
│    User      │────────────>│   Bounty     │────────────>│  Enrollment  │
│  (sponsor)   │  creates    │              │  students   │              │
└──────────────┘             └──────────────┘  enroll in  └──────┬───────┘
                                                                 │
┌──────────────┐     1:1                                         │ 1:N
│    User      │◄────────────────────────────────────────────────┤
│  (student)   │                                                 │
└──────┬───────┘                                                 │
       │ 1:1                                                     ▼
       ▼                                               ┌──────────────┐
┌──────────────┐                                       │ QuizSession  │
│    Wallet    │                                       │              │
│  (Circle)    │                                       └──────┬───────┘
└──────────────┘                                              │ 1:N
                                                              ▼
                                                    ┌──────────────┐
                                                    │ QuizAttempt  │
                                                    │              │
                                                    └──────┬───────┘
                                                           │ 0:1 (on pass)
                                                           ▼
                                                    ┌──────────────┐
                                                    │    Payout    │
                                                    │              │
                                                    └──────────────┘
```

---

## Schema

### User

```prisma
model User {
  id            String      @id @default(cuid())
  email         String      @unique
  passwordHash  String
  name          String
  role          UserRole    @default(STUDENT)
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  // Relations
  wallet        Wallet?
  bounties      Bounty[]        // Bounties created (sponsor)
  enrollments   Enrollment[]    // Bounties enrolled in (student)
  payouts       Payout[]

  @@index([email])
  @@index([role])
}

enum UserRole {
  STUDENT
  SPONSOR
  ADMIN
}
```

### Wallet

One wallet per student, created via Circle Programmable Wallets on registration.

```prisma
model Wallet {
  id              String    @id @default(cuid())
  userId          String    @unique
  circleWalletId  String    @unique   // Circle's internal wallet ID
  address         String?             // Blockchain address (populated async)
  chain           String    @default("BASE_SEPOLIA")
  createdAt       DateTime  @default(now())

  // Relations
  user            User      @relation(fields: [userId], references: [id])

  @@index([circleWalletId])
  @@index([address])
}
```

### Bounty

A sponsor-funded learning program with USDC escrow.

```prisma
model Bounty {
  id                  String        @id @default(cuid())
  sponsorId           String
  title               String
  description         String
  curriculumId        String        // References RAGFlow knowledge base
  curriculumHash      String        // keccak256 for on-chain reference
  rewardPerStudent    Decimal       @db.Decimal(10, 2)  // USDC amount
  maxStudents         Int
  totalDepositUsdc    Decimal       @db.Decimal(12, 2)
  totalPaidOutUsdc    Decimal       @default(0) @db.Decimal(12, 2)
  completions         Int           @default(0)
  deadline            DateTime
  status              BountyStatus  @default(PENDING_DEPOSIT)
  escrowTxHash        String?       // On-chain deposit tx
  onChainBountyId     String?       // bytes32 bounty ID on contract
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt

  // Curriculum requirements
  minQuizScore        Int           @default(70)    // Minimum passing score (%)
  requiredLessons     Int           @default(5)     // Lessons to complete before quiz

  // Relations
  sponsor             User          @relation(fields: [sponsorId], references: [id])
  enrollments         Enrollment[]

  @@index([sponsorId])
  @@index([status])
  @@index([deadline])
}

enum BountyStatus {
  PENDING_DEPOSIT     // Created, awaiting USDC deposit
  ACTIVE              // Deposit confirmed, accepting enrollments
  DEPLETED            // All slots filled or funds exhausted
  EXPIRED             // Past deadline
  CANCELLED           // Sponsor cancelled, funds refunded
}
```

### Enrollment

Tracks a student's participation in a bounty program.

```prisma
model Enrollment {
  id                  String            @id @default(cuid())
  userId              String
  bountyId            String
  status              EnrollmentStatus  @default(ACTIVE)
  lessonsCompleted    Int               @default(0)
  currentLesson       Int               @default(0)
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt
  completedAt         DateTime?

  // Relations
  user                User              @relation(fields: [userId], references: [id])
  bounty              Bounty            @relation(fields: [bountyId], references: [id])
  quizSessions        QuizSession[]

  @@unique([userId, bountyId])  // One enrollment per student per bounty
  @@index([userId])
  @@index([bountyId])
  @@index([status])
}

enum EnrollmentStatus {
  ACTIVE              // Currently learning
  QUIZ_READY          // Completed all lessons, can take quiz
  PASSED              // Passed quiz, reward pending/paid
  FAILED              // Failed quiz (can retry)
  WITHDRAWN           // Student withdrew
}
```

### QuizSession

A single quiz attempt. Time-limited, with anti-cheat metadata.

```prisma
model QuizSession {
  id              String            @id @default(cuid())
  enrollmentId    String
  status          QuizSessionStatus @default(IN_PROGRESS)
  questions       Json              // Array of question objects (stored for audit)
  answers         Json?             // Student's submitted answers
  score           Int?              // Percentage score (0-100)
  passed          Boolean?
  startedAt       DateTime          @default(now())
  expiresAt       DateTime          // startedAt + time limit
  submittedAt     DateTime?
  difyWorkflowRunId String?         // Dify's workflow run ID for this session

  // Anti-cheat metadata
  ipAddress       String?
  userAgent       String?
  fingerprint     String?           // Browser fingerprint hash

  // Relations
  enrollment      Enrollment        @relation(fields: [enrollmentId], references: [id])
  payout          Payout?

  @@index([enrollmentId])
  @@index([status])
  @@index([expiresAt])
}

enum QuizSessionStatus {
  IN_PROGRESS         // Student is answering questions
  SUBMITTED           // Answers submitted, being graded
  GRADED              // Graded, result available
  EXPIRED             // Time ran out before submission
}
```

### Payout

Tracks USDC reward distribution. Created when a student passes a quiz.

```prisma
model Payout {
  id                  String        @id @default(cuid())
  userId              String
  quizSessionId       String        @unique
  bountyId            String
  amountUsdc          Decimal       @db.Decimal(10, 2)
  status              PayoutStatus  @default(QUEUED)
  idempotencyKey      String        @unique   // Prevents double payouts
  circleTransferId    String?       // Circle's transfer ID
  txHash              String?       // On-chain transaction hash
  proofOfLearnTxHash  String?       // ProofOfLearn event tx hash
  credentialTokenId   String?       // SBT token ID
  errorMessage        String?       // If failed, why
  retryCount          Int           @default(0)
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt
  completedAt         DateTime?

  // Relations
  user                User          @relation(fields: [userId], references: [id])
  quizSession         QuizSession   @relation(fields: [quizSessionId], references: [id])

  @@index([userId])
  @@index([status])
  @@index([idempotencyKey])
  @@index([circleTransferId])
}

enum PayoutStatus {
  QUEUED              // In BullMQ queue, waiting to process
  PROCESSING          // Circle transfer initiated
  ON_CHAIN_PENDING    // Transfer sent, waiting for on-chain confirmation
  COMPLETED           // USDC received by student, on-chain proof recorded
  FAILED              // Transfer failed after max retries
  REFUNDED            // Edge case: payout reversed
}
```

### ChatMessage

Stores conversation history for the AI tutor (audit trail + context continuity).

```prisma
model ChatMessage {
  id              String    @id @default(cuid())
  enrollmentId    String
  role            String    // "user" | "assistant" | "system"
  content         String    @db.Text
  sources         Json?     // RAGFlow source documents used
  lessonIndex     Int
  createdAt       DateTime  @default(now())

  @@index([enrollmentId, lessonIndex])
  @@index([createdAt])
}
```

---

## Key Constraints and Invariants

1. **One enrollment per student per bounty** — enforced by `@@unique([userId, bountyId])`
2. **One payout per quiz session** — enforced by `@unique` on `quizSessionId`
3. **Idempotent payouts** — `idempotencyKey` prevents duplicate Circle transfers even if BullMQ retries
4. **Financial precision** — All USDC amounts use `Decimal(10, 2)` or `Decimal(12, 2)` — never floats
5. **Audit trail** — Quiz questions, answers, and chat messages are stored as JSON for post-hoc review
6. **Soft state in Redis** — Quiz session timers, rate limit counters, and Dify workflow states live in Redis (not Postgres) for performance

---

## Indexes Rationale

| Index | Why |
|-------|-----|
| `User.email` | Login lookups |
| `User.role` | Admin queries filtering by role |
| `Wallet.circleWalletId` | Circle webhook lookups |
| `Wallet.address` | On-chain event correlation |
| `Bounty.status` | Student-facing active bounty listing |
| `Bounty.deadline` | Cron job for expiring bounties |
| `Enrollment.userId` | Student dashboard: my enrollments |
| `Enrollment.bountyId` | Bounty detail: enrolled students |
| `QuizSession.expiresAt` | Cron job for expiring quiz sessions |
| `Payout.status` | Queue worker: find failed payouts for retry |
| `Payout.idempotencyKey` | Deduplication on retry |
| `ChatMessage.enrollmentId + lessonIndex` | Load conversation for a specific lesson |

---

## Migration Strategy

```bash
# Create a new migration after schema changes
pnpm prisma migrate dev --name describe_your_change

# Apply migrations in production
pnpm prisma migrate deploy

# Reset database (dev only — destructive)
pnpm prisma migrate reset
```

---

## Seed Data

`apps/api/prisma/seed.ts` should create:

1. **Admin user** — for dashboard access
2. **Sample sponsor** — with a pre-funded bounty
3. **Sample students** (3-5) — at various enrollment stages
4. **Sample bounty** — "Learn Rust Programming" with 100 slots, $2 per student
5. **Sample enrollments** — one active, one completed with payout
