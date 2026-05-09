# Tech Stack

Every technology choice in this project was made with three constraints: **hackathon speed**, **demo impact**, and **production viability**. Nothing here is a toy — every piece scales.

---

## AI Layer

### Dify (Workflow Engine + AI Tutor)

- **What**: Open-source LLM application platform (100K+ GitHub stars) with visual workflow builder
- **Why chosen**:
  - Visual agentic workflow: RAG retrieval → lesson delivery → quiz generation → scoring → webhook trigger — all without custom orchestration code
  - Built-in RAG pipeline with support for external knowledge base providers
  - 50+ tool integrations out of the box
  - Free Education tier — no cost during hackathon
  - REST API for workflow execution + webhook callbacks for async results
- **What it replaces**: Custom LangChain/LlamaIndex pipeline (would consume the entire hackathon)
- **Integration point**: Backend calls Dify's workflow execution API. Dify calls back to `POST /webhooks/dify` with quiz scores.
- **Gap to fill**: Dify has no native quiz engine. We build a custom webhook node that calls our backend to verify answers, enforce anti-cheat rules, and trigger payouts.
- **Docs**: <https://github.com/langgenius/dify>

### pgvector (Knowledge Base)

- **What**: PostgreSQL extension that adds vector similarity search to the existing database
- **Why chosen**:
  - Zero additional infrastructure — runs inside the PostgreSQL instance we already operate
  - Cosine similarity search over curriculum embeddings is fast enough at our scale
  - Eliminates RAGFlow as an external service dependency (one fewer thing to run, monitor, or pay for)
  - Handles Hindi/mixed-language documents via embedding — language-agnostic at the vector level
- **What it replaces**: RAGFlow (separate Docker service, heavier operational footprint)
- **How it works**: Curriculum PDFs are chunked and embedded at ingest time. Embeddings stored in a `curriculum_chunks` table with a `vector(1536)` column. On each student query, the question is embedded and top-k chunks are retrieved via cosine similarity, then passed to Dify as context.
- **Docs**: <https://github.com/pgvector/pgvector>

### LLM Provider

- **Primary**: Groq API — Llama 3.1 70B
  - Free tier: 14,400 requests/day — covers all early-stage usage
  - Fastest publicly available inference (important for a tutor where students wait for responses)
  - $0.59/1M input tokens when free tier is exceeded — cheapest capable option
- **Embeddings**: OpenAI text-embedding-3-small ($0.02/1M tokens — effectively free at this scale)
- **Fallback**: GPT-4o-mini for quiz generation if Groq is unavailable
- **Why not GPT-4o**: Cost. At 1,000 active students/day with 5 tutor exchanges each, Groq costs near zero. GPT-4o at the same volume costs ~₹3,000/day before any revenue.
- **Provider abstraction**: Dify manages the model config — switching providers is a settings change, not a code change.

---

## Payments Layer

### Razorpay (Student Payouts — Primary)

- **What**: India's leading payment gateway with full UPI payout support
- **Why chosen**:
  - UPI transfer lands in a student's bank account in seconds — no exchange, no off-ramping, no crypto knowledge needed
  - Students receive INR directly: ₹170 reward = ₹170 in their account. Always.
  - Razorpay Payouts API supports bulk disbursement with idempotency keys — maps cleanly onto our BullMQ queue
  - Well-documented, widely understood by Indian developers, strong webhook reliability
  - Handles KYC and compliance for the payment leg — we don't carry that burden
- **What it replaces**: Circle Programmable Wallets for the student-facing payment layer
- **Integration points**:
  - `POST /v1/payouts` — initiate UPI transfer to student bank account on quiz pass
  - Webhook at `POST /webhooks/razorpay` — notified on transfer completion or failure
- **Docs**: <https://razorpay.com/docs/payouts>

### Smart Contracts (Sponsor Escrow — Blockchain Layer)

- **What**: Solidity contracts on Base that hold sponsor USDC and release per verified completion
- **Why on-chain for sponsors**:
  - Trustless escrow — sponsor funds can only be released to verified learners, not withdrawn arbitrarily
  - Transparent pool: any sponsor can audit how much has been disbursed vs. how much remains
  - This is the genuine value blockchain adds — traditional bank accounts don't provide this guarantee
- **Contracts**:
  - `ProofOfLearnEscrow.sol` — holds sponsor deposits, triggers release on verified completion event
  - `LearnCredential.sol` — mints non-transferable SBT (learning proof) on quiz pass

### USDC (Sponsor Side Only)

- **What**: Regulated stablecoin issued by Circle, pegged 1:1 to USD
- **Where it appears**: Sponsor escrow contracts only. Students never hold or see USDC.
- **Why USDC for sponsors**: Global sponsors (companies, NGOs, grant programs) can deposit USDC directly into escrow. Indian sponsors deposit INR via bank transfer — backend accounting mirrors this in the contract.
- **Why not native tokens**: Volatile, speculative, and sponsors don't understand them. "Deposit $20,000 USDC" is a sentence any CFO can approve.

---

## Blockchain Layer

### Base (Coinbase L2)

- **What**: Ethereum L2 built on the OP Stack, operated by Coinbase
- **Why chosen**:
  - Gas fees ~$0.001 per transaction — critical for the SBT mint on every completion
  - Fast finality (~2 seconds)
  - Large developer ecosystem and tooling support
- **Fallback**: Polygon PoS (slightly higher fees but same EVM compatibility)
- **Testnet**: Base Sepolia for development

### Solidity + Foundry

- **What**: Smart contract language + testing/deployment framework
- **Why Foundry over Hardhat**:
  - Faster compilation and testing (written in Rust)
  - Better fuzzing support for financial contracts
  - Cleaner scripting for deployments — `forge test` runs in milliseconds

---

## Backend

### Node.js + Express + TypeScript

- **What**: API server handling all business logic, webhook orchestration, and service coordination
- **Why Express**: Minimal, well-understood, fast to build. No need for NestJS complexity at hackathon stage.
- **Key responsibilities**:
  - REST API for frontend
  - Webhook ingestion (Dify, Razorpay, blockchain events)
  - Quiz verification and anti-cheat enforcement
  - Payout queue management

### PostgreSQL + Prisma ORM + pgvector

- **What**: Relational database with type-safe ORM and vector search extension
- **Why Postgres**: ACID transactions for financial data (bounty balances, payout records). pgvector adds vector search without a second database. Prisma provides type-safe queries and automatic migrations.
- **Key tables**: users, bounties, enrollments, quiz_sessions, quiz_attempts, payouts, curriculum_chunks

### Redis + BullMQ

- **What**: In-memory cache + reliable job queue
- **Why**:
  - **Redis**: Cache Dify workflow states, rate limiting counters, quiz session data (TTL-based expiry)
  - **BullMQ**: Reliable payout processing with retry logic, dead-letter queues, and job deduplication. No student loses money because of a transient Razorpay API failure.

---

## Frontend

### Next.js 14 (App Router)

- **What**: React framework with server components, file-based routing, and built-in API routes
- **Why chosen**:
  - App Router enables server components — faster initial load for student dashboard
  - Route groups: `(student)/`, `(sponsor)/`, `(auth)/` for clean separation
  - Built-in image optimization for curriculum thumbnails
  - Easy deployment to Vercel for hackathon demo
- **UI library**: shadcn/ui (copy-paste components, not a dependency — stays lightweight)
- **State management**: Zustand for client state, TanStack Query for server state
- **Styling**: Tailwind CSS

---

## Infrastructure

### Docker Compose (Local Development)

Services:

- PostgreSQL 16 (with pgvector extension)
- Redis 7

### Turborepo (Monorepo)

- **Why**: Single repo for web, api, contracts, and shared packages. Parallel builds, shared configs, atomic changes.
- **Workspaces**: `apps/web`, `apps/api`, `apps/contracts`, `packages/shared`, `packages/config`

---

## Integration Map

```text
┌──────────────┐     REST API      ┌──────────────┐
│   Next.js    │ ────────────────> │   Express    │
│   Frontend   │ <──────────────── │   Backend    │
└──────────────┘                   └──────┬───────┘
                                          │
                    ┌─────────────────────┼──────────────────────┐
                    │                     │                      │
                    ▼                     ▼                      ▼
             ┌──────────┐         ┌──────────────┐      ┌──────────────┐
             │   Dify   │         │   Razorpay   │      │  Base Chain  │
             │ Workflow  │         │  UPI Payouts │      │  (Foundry)   │
             └─────┬────┘         └──────────────┘      └──────────────┘
                   │ (Groq LLM)
                   ▼
             ┌──────────┐
             │ pgvector │
             │(in PG DB)│
             └──────────┘
```

## What We Explicitly Did NOT Choose (and Why)

| Rejected Option | Why |
|----------------|-----|
| RAGFlow | External Docker service adding operational overhead. pgvector runs inside existing PostgreSQL — same vector search, zero extra infrastructure. |
| Circle Programmable Wallets (student payouts) | Indian students can't easily off-ramp USDC to INR. Razorpay UPI lands INR in their bank account in seconds with no friction. |
| GPT-4o as primary LLM | Cost is prohibitive at scale for a student-built product. Groq + Llama 3.1 70B is free at our usage levels and fast enough for a real-time tutor. |
| LangChain/LlamaIndex | Building a RAG pipeline from scratch eats the hackathon. Dify + pgvector gives the same result with a visual builder and no orchestration code. |
| Hardhat | Slower tests, JavaScript-based scripting. Foundry is faster and better for financial contract testing. |
| Native token (ERC-20) | Volatile, speculative, regulatory risk. USDC is stable and regulated; sponsors understand it. |
| MetaMask for students | Excludes 99% of Indian students. Students receive INR via UPI — no wallet needed. |
| Firebase/Supabase | Need fine-grained control over payout logic and webhook handling. Can't trust BaaS with financial orchestration. |
| Ethereum mainnet | SBT mint with $3 gas fee on a ₹170 reward is a non-starter. Base L2 keeps gas under ₹0.10. |
