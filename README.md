# Proof-of-Learn

**A decentralized protocol where sponsors fund education and students earn guaranteed USDC for verified learning outcomes.**

> "Coinbase killed Learn & Earn in May 2025. We built what should have existed instead."

---

## The Problem

Education is broken in two directions:

1. **Students pay to learn** — but 600M+ Indian students can't afford quality education, and even those who can have no guarantee of outcomes.
2. **Learn-to-earn died** — Coinbase shut down its program because rewards came from their own pocket, there was no proof of real understanding, and the model wasn't sustainable.

No one has built the obvious fix: **make sponsors pay, make AI teach, make blockchain prove it.**

## The Solution

Proof-of-Learn is an infrastructure protocol with three actors:

| Actor | Role | Incentive |
|-------|------|-----------|
| **Sponsor** | Deposits USDC into escrow with a bounty (e.g., "Pay 10,000 students $2 each to complete this Rust curriculum") | Workforce development, brand visibility, social impact reporting |
| **Student** | Learns from an AI tutor grounded in real curriculum, passes quizzes | Guaranteed USDC per verified completion — no lottery, no pool |
| **Protocol** | AI tutor (Dify + RAGFlow), quiz verification, on-chain proof, auto-payout (Circle) | Small protocol fee per transaction |

### Core Loop

```
Student signs up
  -> Gets a wallet (Circle Programmable Wallets)
  -> AI tutor delivers a lesson (Dify workflow + RAGFlow on real textbook content)
  -> Quiz is generated and graded
  -> Student passes -> on-chain proof-of-learning event emitted
  -> USDC lands in their wallet from sponsor escrow
  -> On-chain tx hash proves it happened
```

## Key Differentiators

- **RAG-grounded tutoring** — Not ChatGPT wrapper quizzes. RAGFlow ingests actual NCERT textbooks, JEE prep material, coding documentation. The AI teaches from real curriculum, not hallucinations.
- **Guaranteed per-completion payouts** — No token volatility, no lottery pools. Pass the quiz, get USDC. Period.
- **Sponsor marketplace model** — Flips who pays. Companies, governments, and DAOs fund the bounties. Students earn. The protocol orchestrates.
- **On-chain proof** — Every completion is a verifiable on-chain event. Sponsors get transparent ROI. Students build a portable learning credential.

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| AI Tutor | [Dify](https://github.com/langgenius/dify) | Agentic workflow: RAG retrieval -> lesson -> quiz -> scoring -> webhook |
| Knowledge Base | [RAGFlow](https://github.com/infiniflow/ragflow) | Document parsing (PDFs, scans, tables) for Indian textbook ingestion |
| Payments | [Circle Programmable Wallets](https://developers.circle.com) | Wallet creation, escrow management, USDC distribution |
| Smart Contracts | Solidity (Base/Polygon) | Sponsor escrow, proof-of-learning events, payout triggers |
| Backend | Node.js / Express | API layer, webhook orchestration, quiz verification |
| Frontend | Next.js | Student dashboard, sponsor portal, wallet interface |
| Database | PostgreSQL | User profiles, learning progress, bounty tracking |
| Cache/Queue | Redis + BullMQ | Quiz session management, payout queue, rate limiting |

## Project Structure

```
proof-of-learn/
├── apps/
│   ├── web/                  # Next.js frontend
│   │   ├── app/
│   │   │   ├── (student)/    # Student dashboard, lessons, quizzes
│   │   │   ├── (sponsor)/    # Sponsor portal, bounty management
│   │   │   └── (auth)/       # Auth flows, wallet connection
│   │   └── components/
│   ├── api/                  # Express backend
│   │   ├── routes/
│   │   ├── services/
│   │   │   ├── dify/         # Dify workflow integration
│   │   │   ├── circle/       # Circle wallet + payout logic
│   │   │   ├── quiz/         # Quiz generation, grading, anti-cheat
│   │   │   └── blockchain/   # Contract interactions
│   │   ├── webhooks/         # Dify callback, Circle callback, chain events
│   │   └── middleware/
│   └── contracts/            # Solidity smart contracts
│       ├── src/
│       │   ├── ProofOfLearnEscrow.sol
│       │   └── LearnToken.sol  # Optional: non-transferable SBT credential
│       └── test/
├── packages/
│   ├── shared/               # Shared types, constants, utils
│   └── config/               # Shared ESLint, TS, Prettier configs
├── dify/
│   ├── workflows/            # Exported Dify workflow JSONs
│   └── prompts/              # System prompts for tutor persona
├── ragflow/
│   ├── datasets/             # Curriculum document configs
│   └── parsing-rules/        # Custom parsing rules for Indian textbooks
├── docs/                     # Project documentation
├── .env.example
├── docker-compose.yml        # Local dev: Postgres, Redis, RAGFlow
└── turbo.json                # Monorepo pipeline config
```

## Quick Start

See [docs/SETUP.md](docs/SETUP.md) for full environment setup.

```bash
# Clone and install
git clone <repo-url>
cd proof-of-learn
pnpm install

# Set up environment
cp .env.example .env.local
# Fill in Circle API key, Dify API key, database URL

# Start infrastructure
docker-compose up -d  # Postgres, Redis, RAGFlow

# Run development
pnpm dev              # Starts both web + api
```

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | System design, component interactions, data flow diagrams |
| [Tech Stack](docs/TECH_STACK.md) | Technology choices and rationale |
| [Setup Guide](docs/SETUP.md) | Development environment and local run guide |
| [API Specification](docs/API_SPEC.md) | Backend endpoints, webhooks, external API contracts |
| [Smart Contracts](docs/SMART_CONTRACTS.md) | Escrow contract design, events, deployment |
| [Data Model](docs/DATA_MODEL.md) | Database schema, entity relationships |
| [Security](docs/SECURITY.md) | Anti-cheat, KYC/AML, wallet security, threat model |
| [Testing Strategy](docs/TESTING.md) | Test plan, coverage targets, E2E scenarios |
| [Roadmap](docs/ROADMAP.md) | Phased build plan with milestones |
| [Demo Script](docs/DEMO_SCRIPT.md) | Hackathon demo flow and pitch structure |

## License

MIT
