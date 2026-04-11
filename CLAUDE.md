# Proof-of-Learn — Claude Code Context

## What This Project Is

A "Proof-of-Learning" protocol for a hackathon. Sponsors deposit USDC into escrow smart contracts with bounties (e.g., "Pay 10,000 students $2 each to complete this Rust curriculum"). Students learn via an AI tutor (Dify + RAGFlow), pass quizzes, and receive guaranteed USDC micro-rewards via Circle Programmable Wallets. On-chain events prove every completion.

## Core Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **Frontend**: Next.js (App Router) in `apps/web/`
- **Backend**: Express + TypeScript in `apps/api/`
- **Smart Contracts**: Solidity + Foundry in `apps/contracts/`
- **AI Tutor**: Dify workflows (external service, configs in `dify/`)
- **Knowledge Base**: RAGFlow (external service, configs in `ragflow/`)
- **Payments**: Circle Programmable Wallets API
- **Database**: PostgreSQL via Prisma ORM
- **Queue**: Redis + BullMQ for payout processing
- **Chain**: Base (Sepolia testnet for dev, Base mainnet for prod)

## Key Commands

```bash
pnpm install          # Install all workspace dependencies
pnpm dev              # Start web + api in parallel
pnpm build            # Build all packages
pnpm test             # Run all tests
pnpm lint             # Lint all packages
docker-compose up -d  # Start Postgres, Redis, RAGFlow
```

## Conventions

- TypeScript strict mode everywhere
- Prisma for all database access (no raw SQL outside migrations)
- All API routes return `{ success: boolean, data?: T, error?: string }`
- Environment variables: never commit `.env` files, use `.env.example` as template
- Smart contracts: Foundry for testing + deployment, not Hardhat
- Commit messages: conventional commits (`feat:`, `fix:`, `docs:`, `chore:`)
- Branch strategy: `main` -> `feat/<name>` -> PR

## Architecture Notes

- The Dify workflow calls back to our API via webhooks when quiz scoring completes
- Circle webhooks notify us of wallet creation and transfer completion
- Smart contract events are indexed by our backend to confirm on-chain proof
- Quiz anti-cheat: question bank rotation, time limits, answer-order randomization, session fingerprinting
- All USDC payouts go through a BullMQ queue with retry logic and idempotency keys
