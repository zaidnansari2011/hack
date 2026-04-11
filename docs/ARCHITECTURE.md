# Architecture

## System Overview

Proof-of-Learn is a three-sided platform connecting **Sponsors**, **Students**, and an **AI Protocol Layer**. The architecture is designed around one core invariant: **every USDC payout must be backed by a verifiable learning event**.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SPONSOR PORTAL                               │
│  (Next.js)                                                          │
│  - Create bounty programs                                           │
│  - Deposit USDC into escrow                                         │
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
│  │  - POST /webhooks/circle    (wallet created, transfer done)   │  │
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
│  │   Dify     │  │  RAGFlow   │  │  Circle Programmable Wallets │  │
│  │  Workflow  │◄─┤  Knowledge │  │  - Wallet creation           │  │
│  │  Engine    │  │  Base      │  │  - USDC transfers            │  │
│  │            │  │            │  │  - Escrow management         │  │
│  └────────────┘  └────────────┘  └──────────────────────────────┘  │
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
│  - View wallet balance + tx history                                 │
│  - Learning credential portfolio (SBTs)                             │
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
Student Dashboard       Backend API           Dify              RAGFlow
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
Student        Backend API        Dify          Blockchain       Circle
  │                │                │                │              │
  │ POST /quiz     │                │                │              │
  │ { answers }    │                │                │              │
  │ ──────────────>│                │                │              │
  │                │  Score quiz    │                │              │
  │                │ ──────────────>│                │              │
  │                │  { score, pass}│                │              │
  │                │ <──────────────│                │              │
  │                │                │                │              │
  │                │  [if pass]     │                │              │
  │                │                │                │              │
  │                │  emit ProofOfLearn(student,     │              │
  │                │    curriculum, score_hash)      │              │
  │                │ ──────────────────────────────>│              │
  │                │                │                │              │
  │                │  Queue payout job               │              │
  │                │ ───────────────────────────────────────────── >│
  │                │                │                │              │
  │                │                │                │   Transfer   │
  │                │                │                │   2.00 USDC  │
  │                │                │                │   to student │
  │                │                │                │   wallet     │
  │                │  Circle webhook: transfer_complete             │
  │                │ <─────────────────────────────────────────────│
  │                │                │                │              │
  │  { pass: true, │                │                │              │
  │    reward: 2.0,│                │                │              │
  │    tx_hash }   │                │              │              │
  │ <──────────────│                │                │              │
```

## Component Responsibilities

### Frontend (`apps/web/`)

| Component | Responsibility |
|-----------|---------------|
| Student Dashboard | Browse bounties, chat with tutor, take quizzes, view wallet |
| Sponsor Portal | Create bounties, deposit USDC, view analytics |
| Auth Flow | Email/password + optional wallet connect |
| Wallet View | Balance, transaction history, withdraw to external wallet |

### Backend (`apps/api/`)

| Service | Responsibility |
|---------|---------------|
| Auth Service | JWT issuance, session management, role-based access |
| Bounty Service | CRUD for bounty programs, enrollment management |
| Quiz Service | Question generation via Dify, answer grading, anti-cheat enforcement |
| Payout Service | BullMQ job processing, Circle API calls, idempotency, retry logic |
| Webhook Handlers | Ingest events from Dify, Circle, and blockchain indexer |

### Smart Contracts (`apps/contracts/`)

| Contract | Responsibility |
|----------|---------------|
| `ProofOfLearnEscrow.sol` | Hold sponsor USDC, release per verified completion, refund unused funds |
| `LearnCredential.sol` | Mint non-transferable SBT on quiz pass (portable learning proof) |

### External Services

| Service | Role | Integration |
|---------|------|-------------|
| Dify | Workflow engine for AI tutor | REST API for workflow execution, webhook callbacks |
| RAGFlow | Document parsing + retrieval | Integrated as Dify's knowledge base provider |
| Circle | Wallet infra + USDC transfers | REST API for wallet ops, webhook for tx status |

## Key Design Decisions

### 1. Why Dify + RAGFlow instead of a custom LLM pipeline?

Dify provides a visual workflow builder with built-in RAG support, 50+ tool integrations, and a free Education tier. RAGFlow is best-in-class at parsing complex documents (PDFs with tables, scans) — critical for Indian textbook content. Building this from scratch would consume the entire hackathon.

### 2. Why Circle instead of direct smart contract transfers?

Circle Programmable Wallets abstract away gas fees, key management, and chain complexity for end users. Students don't need MetaMask — they get a wallet automatically. First 1,000 wallets are free. The developer-controlled wallet model lets us manage both sponsor escrow and student payouts from one API.

### 3. Why BullMQ for payouts instead of synchronous transfers?

USDC transfers can fail (network congestion, insufficient gas, rate limits). A queue with retry logic, dead-letter handling, and idempotency keys ensures every earned payout eventually lands. No student should lose money because of a transient failure.

### 4. Why SBTs (Soulbound Tokens) for credentials?

Non-transferable tokens prove that *this specific student* completed *this specific curriculum* with *this specific score*. They can't be bought or sold. This creates a portable, verifiable learning history that follows the student across platforms.

### 5. Why Base chain?

Base is Coinbase's L2 — low gas fees (~$0.001 per tx), fast finality, large developer ecosystem, and strong Circle integration. Perfect for micro-transactions. Polygon is the fallback if Base has issues.

## Failure Modes and Recovery

| Failure | Impact | Recovery |
|---------|--------|----------|
| Dify API down | Students can't chat or take quizzes | Circuit breaker + "service temporarily unavailable" UI. No payouts affected. |
| Circle API down | Payouts queued but not sent | BullMQ retries with exponential backoff. Payouts land when Circle recovers. |
| Smart contract reverts | On-chain proof not recorded | Backend detects revert, re-submits with adjusted gas. Payout still goes through Circle (off-chain first, on-chain proof follows). |
| Quiz scoring disagreement | Student disputes score | Scores are deterministic (graded against answer key). Appeal route: re-take with new questions from same topic. |
| Sponsor escrow depleted | Bounty runs out mid-program | Enrollment closes automatically when remaining funds < reward_per_student. Students already enrolled and studying are guaranteed their payout from a reserve buffer (2% of deposit). |

## Scalability Considerations (Post-Hackathon)

- **Horizontal API scaling**: Stateless Express servers behind a load balancer
- **Database read replicas**: For analytics-heavy sponsor queries
- **RAGFlow sharding**: Separate RAGFlow instances per curriculum domain
- **Multi-chain support**: Circle supports 10 chains — easy to expand
- **CDN for static assets**: Next.js on Vercel/Cloudflare Pages
- **Event sourcing**: Replace webhook polling with event-driven architecture using Kafka/NATS
