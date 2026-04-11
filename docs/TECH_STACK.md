# Tech Stack

Every technology choice in this project was made with three constraints: **hackathon speed**, **demo impact**, and **production viability**. Nothing here is a toy — every piece scales.

---

## AI Layer

### Dify (Workflow Engine + AI Tutor)

- **What**: Open-source LLM application platform (100K+ GitHub stars) with visual workflow builder
- **Why chosen**:
  - Visual agentic workflow: RAG retrieval -> lesson delivery -> quiz generation -> scoring -> webhook trigger — all without custom orchestration code
  - Built-in RAG pipeline with support for external knowledge base providers (RAGFlow)
  - 50+ tool integrations out of the box
  - Free Education tier — no cost during hackathon
  - REST API for workflow execution + webhook callbacks for async results
- **What it replaces**: Custom LangChain/LlamaIndex pipeline (would consume the entire hackathon)
- **Integration point**: Backend calls Dify's workflow execution API. Dify calls back to `POST /webhooks/dify` with quiz scores.
- **Gap to fill**: Dify has no native quiz engine. We build a custom webhook node that calls our backend to verify answers, enforce anti-cheat rules, and trigger payouts.
- **Docs**: https://github.com/langgenius/dify

### RAGFlow (Knowledge Base + Document Parsing)

- **What**: Open-source RAG engine (77K+ GitHub stars) specializing in complex document parsing
- **Why chosen**:
  - Best-in-class at parsing PDFs with tables, scanned documents, and complex layouts — critical for Indian textbooks (NCERT, JEE material)
  - Official Dify integration documented and maintained
  - Chunking strategies optimized for educational content
  - Handles Hindi/mixed-language documents
- **What it replaces**: Generic PDF loaders that break on table-heavy textbook pages
- **Integration point**: Runs as a Docker service. Connected to Dify as an external knowledge base. RAGFlow handles ingestion and retrieval; Dify handles the conversation.
- **Docs**: https://github.com/infiniflow/ragflow

### LLM Provider

- **Primary**: OpenAI GPT-4o (via Dify's model management)
- **Fallback**: Claude 3.5 Sonnet via Anthropic API
- **Why**: GPT-4o has the best price/performance for educational content generation. Dify abstracts the provider — switching models is a config change, not a code change.

---

## Payments Layer

### Circle Programmable Wallets

- **What**: Enterprise wallet infrastructure for creating and managing crypto wallets via API
- **Why chosen**:
  - Students get wallets automatically — no MetaMask, no seed phrases, no crypto knowledge needed
  - Developer-controlled wallet model: we manage both sponsor escrow wallets and student payout wallets
  - Supports Base, Polygon, Arbitrum, Solana — 10 chains total
  - First 1,000 wallets free (hackathon + early users covered)
  - Circle themselves ran a "learn quests -> bounty" program with StackUp (2,000+ learners) — they understand this use case
  - USDC is a regulated stablecoin: no volatility, no token speculation
  - Circle has a sample repo for AI agents + blockchain payments
- **What it replaces**: Raw ethers.js wallet management + custom key storage (security nightmare for a hackathon)
- **Integration points**:
  - `POST /v1/w3s/developer/wallets` — create student wallets on signup
  - `POST /v1/w3s/developer/transactions/transfer` — send USDC from escrow to student
  - Webhook at `POST /webhooks/circle` — notified on wallet creation and transfer completion
- **Docs**: https://developers.circle.com

### USDC (USD Coin)

- **What**: Regulated stablecoin issued by Circle, pegged 1:1 to USD
- **Why over native tokens**:
  - No volatility — $2 reward = $2 received. Always.
  - Regulatory clarity — USDC is a regulated payment instrument, not a speculative token
  - Students can off-ramp to fiat via Coinbase, Binance, or local exchanges
  - Sponsors understand "deposit $20,000 USDC" — they don't understand "buy 50,000 LEARN tokens"

---

## Blockchain Layer

### Base (Coinbase L2)

- **What**: Ethereum L2 built on the OP Stack, operated by Coinbase
- **Why chosen**:
  - Gas fees ~$0.001 per transaction (vs. $1-5 on Ethereum mainnet) — critical for micro-payouts
  - Fast finality (~2 seconds)
  - Strong Circle integration (Circle's primary supported L2)
  - Large developer ecosystem and tooling support
  - Coinbase on/off-ramp for students who want to convert to fiat
- **Fallback**: Polygon PoS (also supported by Circle, slightly higher fees)
- **Testnet**: Base Sepolia for development

### Solidity + Foundry

- **What**: Smart contract language + testing/deployment framework
- **Why Foundry over Hardhat**:
  - Faster compilation and testing (written in Rust)
  - Better fuzzing support for financial contracts
  - Cleaner scripting for deployments
  - forge test runs in milliseconds, not seconds
- **Contracts**:
  - `ProofOfLearnEscrow.sol` — holds sponsor deposits, releases per verified completion
  - `LearnCredential.sol` — ERC-721 non-transferable SBT for learning proof

---

## Backend

### Node.js + Express + TypeScript

- **What**: API server handling all business logic, webhook orchestration, and service coordination
- **Why Express**: Minimal, well-understood, fast to build. No need for NestJS complexity at hackathon stage.
- **Key responsibilities**:
  - REST API for frontend
  - Webhook ingestion (Dify, Circle, blockchain events)
  - Quiz verification and anti-cheat enforcement
  - Payout queue management

### PostgreSQL + Prisma ORM

- **What**: Relational database with type-safe ORM
- **Why Postgres**: ACID transactions for financial data (bounty balances, payout records). Prisma provides type-safe queries and automatic migrations.
- **Key tables**: users, bounties, enrollments, quiz_sessions, quiz_attempts, payouts, wallets

### Redis + BullMQ

- **What**: In-memory cache + reliable job queue
- **Why**:
  - **Redis**: Cache Dify workflow states, rate limiting counters, quiz session data (TTL-based expiry)
  - **BullMQ**: Reliable payout processing with retry logic, dead-letter queues, and job deduplication. No student loses money because of a transient Circle API failure.

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
- PostgreSQL 16
- Redis 7
- RAGFlow (requires Docker — no standalone binary)

### Turborepo (Monorepo)

- **Why**: Single repo for web, api, contracts, and shared packages. Parallel builds, shared configs, atomic changes.
- **Workspaces**: `apps/web`, `apps/api`, `apps/contracts`, `packages/shared`, `packages/config`

---

## Integration Map

```
┌──────────────┐     REST API      ┌──────────────┐
│   Next.js    │ ────────────────> │   Express    │
│   Frontend   │ <──────────────── │   Backend    │
└──────────────┘                   └──────┬───────┘
                                          │
                    ┌─────────────────────┼──────────────────────┐
                    │                     │                      │
                    ▼                     ▼                      ▼
             ┌──────────┐         ┌──────────────┐      ┌──────────────┐
             │   Dify   │         │    Circle    │      │  Base Chain  │
             │ Workflow  │         │   Wallets   │      │  (Foundry)   │
             └─────┬────┘         └──────────────┘      └──────────────┘
                   │
                   ▼
             ┌──────────┐
             │ RAGFlow  │
             │ Knowledge│
             └──────────┘
```

## What We Explicitly Did NOT Choose (and Why)

| Rejected Option | Why |
|----------------|-----|
| LangChain/LlamaIndex | Building RAG pipeline from scratch eats the hackathon. Dify + RAGFlow gives us the same thing with a visual builder. |
| Hardhat | Slower tests, JavaScript-based scripting. Foundry is faster and better for financial contract testing. |
| Native token (ERC-20) | Volatile, speculative, regulatory risk. USDC is stable, regulated, and sponsors understand it. |
| MetaMask-only auth | Excludes 99% of Indian students who don't have a crypto wallet. Circle creates wallets for them. |
| Firebase/Supabase | Need fine-grained control over payout logic and webhook handling. Can't trust BaaS with financial orchestration. |
| Hardcoded quiz banks | Doesn't scale, doesn't adapt. Dify generates quizzes from RAG context — every student gets unique questions. |
| Ethereum mainnet | $2 payout with $3 gas fee is a non-starter. Base L2 keeps gas under $0.01. |
