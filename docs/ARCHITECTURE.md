# Architecture

## System Overview

Proof-of-Learn is a three-sided platform connecting **Sponsors**, **Students**, and an **AI Protocol Layer**. The architecture is designed around one core invariant: **every payout must be backed by a verifiable on-chain learning event**.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SPONSOR PORTAL                               │
│  (Next.js)                                                          │
│  - Create bounty programs                                           │
│  - Deposit funds into escrow (USDC direct or INR via backend)       │
│  - Monitor completion rates + ROI dashboard                         │
└──────────────┬──────────────────────────────────────────────────────┘
               │ REST API
               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        BACKEND API                                  │
│  (Express + TypeScript)                                             │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌──────────────────┐   │
│  │ Auth     │  │ Bounty   │  │ Quiz      │  │ Payout           │   │
│  │ Service  │  │ Service  │  │ Service   │  │ Service          │   │
│  └──────────┘  └──────────┘  └───────────┘  └──────────────────┘   │
│       │              │             │                │                │
│       │              │             │                │                │
│  ┌────▼──────────────▼─────────────▼────────────────▼────────────┐  │
│  │                    WEBHOOK HANDLERS                            │  │
│  │  - POST /webhooks/dify      (quiz scored)                     │  │
│  │  - POST /webhooks/razorpay  (payout initiated, transfer done) │  │
│  │  - POST /webhooks/chain     (contract events via indexer)     │  │
│  └───────────────────────────────────────────────────────────────┘  │
└──────────────┬──────────────┬───────────────┬───────────────────────┘
               │              │               │
        ┌──────▼──────┐ ┌────▼────┐   ┌──────▼──────┐
        │  PostgreSQL │ │  Redis  │   │  BullMQ     │
        │  (Prisma)   │ │  Cache  │   │  Payout Q   │
        └─────────────┘ └─────────┘   └─────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     EXTERNAL SERVICES                               │
│                                                                     │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────────────────┐  │
│  │   Dify     │  │  Groq API  │  │  Razorpay                    │  │
│  │  Workflow  │  │  Llama 3.1 │  │  - UPI payouts to students   │  │
│  │  Engine    │  │  70B (LLM) │  │  - INR disbursement          │  │
│  │            │  │            │  │  - Webhook on transfer done  │  │
│  └────────────┘  └────────────┘  └──────────────────────────────┘  │
│  (pgvector runs inside PostgreSQL — no separate service)            │
└─────────────────────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      BLOCKCHAIN LAYER                               │
│  (Base Sepolia → Base Mainnet)                                      │
│                                                                     │
│  ┌───────────────────────┐  ┌────────────────────────────────────┐  │
│  │ ProofOfLearnEscrow.sol│  │ LearnCredential.sol (SBT)         │  │
│  │ - depositBounty()     │  │ - mint() on quiz pass             │  │
│  │ - releasePayout()     │  │ - Non-transferable                │  │
│  │ - refundSponsor()     │  │ - Stores curriculum + score hash  │  │
│  └───────────────────────┘  └────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     STUDENT DASHBOARD                               │
│  (Next.js)                                                          │
│  - Browse available bounties/curricula                              │
│  - Interactive AI tutor chat                                        │
│  - Take quizzes                                                     │
│  - View INR earnings + UPI payout history                           │
│  - Learning credential portfolio (SBTs on Base)                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow: The Core Learning Loop

This is the critical path — every component is involved.

### Step 1: Sponsor Creates a Bounty

```
Sponsor Portal                    Backend API                    Blockchain
     │                                │                              │
     │  POST /api/bounties            │                              │
     │  {                             │                              │
     │    curriculum: "rust-101",     │                              │
     │    reward_per_student: 2.00,   │                              │
     │    max_students: 10000,        │                              │
     │    total_deposit: 20000        │                              │
     │  }                             │                              │
     │ ──────────────────────────────>│                              │
     │                                │  depositBounty(20000 USDC)   │
     │                                │ ────────────────────────────>│
     │                                │                              │
     │                                │  BountyCreated event         │
     │                                │ <────────────────────────────│
     │                                │                              │
     │  { bounty_id, escrow_tx_hash } │                              │
     │ <──────────────────────────────│                              │
```

### Step 2: Student Enrolls and Learns

```
Student Dashboard       Backend API           Dify         pgvector/Groq
     │                      │                   │                  │
     │  POST /api/enroll    │                   │                  │
     │  { bounty_id }       │                   │                  │
     │ ────────────────────>│                   │                  │
     │                      │                   │                  │
     │  { enrollment_id,    │                   │                  │
     │    first_lesson }    │                   │                  │
     │ <────────────────────│                   │                  │
     │                      │                   │                  │
     │  POST /api/chat      │                   │                  │
     │  { message }         │                   │                  │
     │ ────────────────────>│  Run workflow     │                  │
     │                      │ ─────────────────>│  Retrieve docs   │
     │                      │                   │ ────────────────>│
     │                      │                   │  Relevant chunks │
     │                      │                   │ <────────────────│
     │                      │  AI response      │                  │
     │                      │ <─────────────────│                  │
     │  { tutor_response }  │                   │                  │
     │ <────────────────────│                   │                  │
```

### Step 3: Quiz, Verification, and Payout

```
Student        Backend API        Dify          Blockchain      Razorpay
  │                │                │                │              │
  │ POST /quiz     │                │                │              │
  │ { answers }    │                │                │              │
  │ ──────────────>│                │                │              │
  │                │  Score quiz    │                │              │
  │                │ ──────────────>│                │              │
  │                │  { score, pass}│                │              │
  │                │ <──────────────│                │              │
  │                │                │                │              │
  │                │  [if pass]                      │              │
  │                │                │                │              │
  │                │  emit ProofOfLearn(student,     │              │
  │                │    curriculum, score_hash)      │              │
  │                │  + mint SBT credential          │              │
  │                │ ──────────────────────────────>│              │
  │                │                │                │              │
  │                │  Queue UPI payout job           │              │
  │                │ ───────────────────────────────────────────── >│
  │                │                │                │              │
  │                │                │                │  UPI transfer│
  │                │                │                │  INR to      │
  │                │                │                │  bank account│
  │                │  Razorpay webhook: transfer_complete           │
  │                │ <─────────────────────────────────────────────│
  │                │                │                │              │
  │  { pass: true, │                │                │              │
  │    reward_inr, │                │                │              │
  │    tx_hash,    │                │                │              │
  │    sbt_hash }  │                │                │              │
  │ <──────────────│                │                │              │
```

## Component Responsibilities

### Frontend (`apps/web/`)

| Component | Responsibility |
|-----------|---------------|
| Student Dashboard | Browse bounties, chat with tutor, take quizzes, view INR earnings + payout history, view SBT credentials |
| Sponsor Portal | Create bounties, deposit funds, view analytics and CSR impact report |
| Auth Flow | Email/password |

### Backend (`apps/api/`)

| Service | Responsibility |
|---------|---------------|
| Auth Service | JWT issuance, session management, role-based access |
| Bounty Service | CRUD for bounty programs, enrollment management |
| Quiz Service | Question generation via Dify, answer grading, anti-cheat enforcement |
| Payout Service | BullMQ job processing, Razorpay API calls, idempotency, retry logic |
| Webhook Handlers | Ingest events from Dify, Razorpay, and blockchain indexer |

### Smart Contracts (`apps/contracts/`)

| Contract | Responsibility |
|----------|---------------|
| `ProofOfLearnEscrow.sol` | Hold sponsor USDC, release per verified completion, refund unused funds |
| `LearnCredential.sol` | Mint non-transferable SBT on quiz pass (portable learning proof) |

### External Services

| Service | Role | Integration |
|---------|------|-------------|
| Dify | Workflow engine for AI tutor | REST API for workflow execution, webhook callbacks |
| Groq API | LLM inference (Llama 3.1 70B) | Called by Dify workflow for tutor responses and quiz generation |
| pgvector | Curriculum vector store | PostgreSQL extension — no separate service, queried by Dify via backend |
| Razorpay | UPI payouts to students in INR | REST API for payout initiation, webhook for transfer completion |

## Key Design Decisions

### 1. Why Dify + pgvector + Groq instead of a custom LLM pipeline?

Dify provides a visual workflow builder with built-in RAG support and webhook callbacks — the orchestration layer is done. pgvector runs inside the PostgreSQL instance we already operate, so there is no additional service to run, monitor, or pay for. Groq gives us the fastest publicly available LLM inference (Llama 3.1 70B) with a free tier that covers early-stage usage. Building this from scratch would consume the entire hackathon; this stack costs near zero and deploys in hours.

### 2. Why UPI (Razorpay) for student payouts instead of crypto wallets?

Indian students receive INR in their existing bank account — no exchange account, no off-ramping, no KYC friction beyond what Razorpay handles. UPI transfer completes in seconds. The blockchain still does the trust-critical work: the smart contract holds sponsor funds in escrow and can only release to verified learners, and the SBT certificate is minted on-chain permanently. This is not a compromise — it is the right tool for each job.

### 3. Why BullMQ for payouts instead of synchronous transfers?

UPI transfers can fail (bank downtime, Razorpay rate limits, incorrect account details). A queue with retry logic, dead-letter handling, and idempotency keys ensures every earned payout eventually lands. No student should lose money because of a transient failure.

### 4. Why SBTs (Soulbound Tokens) for credentials?

Non-transferable tokens prove that *this specific student* completed *this specific curriculum* with *this specific score*. They can't be bought or sold. This creates a portable, verifiable learning history that follows the student across platforms.

### 5. Why Base chain?

Base is Coinbase's L2 — low gas fees (~$0.001 per tx), fast finality, and a large developer ecosystem. Perfect for SBT minting at micro-transaction cost. Polygon is the fallback if Base has issues.

## Failure Modes and Recovery

| Failure | Impact | Recovery |
|---------|--------|----------|
| Dify API down | Students can't chat or take quizzes | Circuit breaker + "service temporarily unavailable" UI. No payouts affected. |
| Razorpay API down | Payouts queued but not sent | BullMQ retries with exponential backoff. Payouts land when Razorpay recovers. |
| Smart contract reverts | On-chain proof not recorded | Backend detects revert, re-submits with adjusted gas. UPI payout still goes through (off-chain first, on-chain proof follows). |
| Quiz scoring disagreement | Student disputes score | Scores are deterministic (graded against answer key). Appeal route: re-take with new questions from same topic. |
| Sponsor escrow depleted | Bounty runs out mid-program | Enrollment closes automatically when remaining funds < reward_per_student. Students already enrolled and studying are guaranteed their payout from a reserve buffer (2% of deposit). |

## Scalability Considerations (Post-Hackathon)

- **Horizontal API scaling**: Stateless Express servers behind a load balancer
- **Database read replicas**: For analytics-heavy sponsor queries
- **pgvector scaling**: Add read replicas for vector search as curriculum library grows
- **Multi-currency payouts**: Razorpay supports international transfers — easy to expand beyond INR
- **CDN for static assets**: Next.js on Vercel/Cloudflare Pages
- **Event sourcing**: Replace webhook polling with event-driven architecture using Kafka/NATS
