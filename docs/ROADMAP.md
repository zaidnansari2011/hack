# Development Roadmap

This is a phased build plan optimized for **hackathon delivery**. The goal: demo the core loop live with a real USDC transaction on Base Sepolia testnet.

---

## Phase 0: Foundation (Day 1 — First 4 Hours)

**Goal:** Repo scaffolded, infra running, team can start coding in parallel.

### Tasks

- [ ] Initialize Turborepo monorepo with pnpm workspaces
- [ ] Set up `apps/web` (Next.js 14 with App Router, Tailwind, shadcn/ui)
- [ ] Set up `apps/api` (Express + TypeScript, basic routing skeleton)
- [ ] Set up `apps/contracts` (Foundry project, OpenZeppelin dependencies)
- [ ] Create `packages/shared` (TypeScript types, constants)
- [ ] Write `docker-compose.yml` (PostgreSQL, Redis)
- [ ] Write Prisma schema (all models from DATA_MODEL.md)
- [ ] Run initial migration
- [ ] Set up ESLint + Prettier shared configs
- [ ] Create `.env.example` with all variables documented
- [ ] Git init, first commit, push to GitHub
- [ ] Set up CI: lint + type-check on PR (GitHub Actions — simple, fast)

**Deliverable:** `pnpm dev` starts both frontend and backend. Database is migrated. Team has local dev running.

**Parallel tracks possible:**
- Person A: monorepo + frontend scaffold
- Person B: backend + database + Docker
- Person C: smart contracts + Foundry setup

---

## Phase 1: Smart Contracts (Day 1 — Hours 4-8)

**Goal:** Escrow contract deployed to Base Sepolia with passing tests.

### Tasks

- [ ] Write `ProofOfLearnEscrow.sol` (see SMART_CONTRACTS.md)
- [ ] Write `LearnCredential.sol` (Soulbound Token)
- [ ] Write comprehensive Foundry tests (all cases from SMART_CONTRACTS.md)
- [ ] Write deploy script (`script/Deploy.s.sol`)
- [ ] Deploy to Base Sepolia
- [ ] Verify contracts on Basescan
- [ ] Record deployed addresses in `.env`
- [ ] Write contract interaction service in backend (`apps/api/services/blockchain/`)

**Deliverable:** Contracts deployed, verified, and callable from backend.

---

## Phase 2: Circle Integration (Day 1-2 — Hours 6-12)

**Goal:** Student wallet creation and USDC transfer working end-to-end.

### Tasks

- [ ] Set up Circle developer account + API key
- [ ] Implement wallet creation on user registration
- [ ] Handle Circle webhook for wallet creation confirmation
- [ ] Implement USDC transfer from escrow wallet to student wallet
- [ ] Handle Circle webhook for transfer completion
- [ ] Write BullMQ payout worker with retry logic
- [ ] Test full payout flow: trigger transfer -> receive webhook -> update DB
- [ ] Get testnet USDC from Circle faucet

**Deliverable:** Can programmatically create a wallet and send USDC to it.

---

## Phase 3: Dify + RAGFlow Setup (Day 1-2 — Hours 6-14)

**Goal:** AI tutor can teach from real curriculum content and generate quizzes.

### Tasks

- [ ] Deploy RAGFlow via Docker (or use cloud instance)
- [ ] Upload curriculum documents (pick ONE curriculum for demo — e.g., Rust fundamentals)
- [ ] Configure parsing rules (Book parser for textbooks)
- [ ] Verify retrieval quality with test queries
- [ ] Set up Dify workspace (cloud or self-hosted)
- [ ] Build tutor workflow in Dify:
  - RAG retrieval node (connected to RAGFlow)
  - Lesson delivery node (system prompt: "You are a patient tutor...")
  - Quiz generation node (generate 5-10 MCQ from lesson content)
  - Scoring node (compare answers against correct answers)
  - Webhook node (callback to our API with results)
- [ ] Connect Dify workflow to backend API endpoints
- [ ] Test: send a learning message -> get RAG-grounded response
- [ ] Test: request quiz -> get generated questions from curriculum

**Deliverable:** Working AI tutor that teaches from real content and generates quizzes.

---

## Phase 4: Backend Core (Day 2 — Hours 12-20)

**Goal:** All API endpoints working. The core loop runs end-to-end via API.

### Tasks

- [ ] Auth endpoints (register, login, me) with JWT
- [ ] Bounty CRUD endpoints (create, list, get, deposit)
- [ ] Enrollment endpoints (enroll, list, progress)
- [ ] Learning chat endpoint (proxy to Dify)
- [ ] Quiz endpoints (start session, submit answers)
- [ ] Wallet endpoints (balance, transactions, withdraw)
- [ ] Webhook handlers (Dify, Circle, chain events)
- [ ] Payout orchestration: quiz pass -> on-chain proof -> Circle transfer
- [ ] Rate limiting middleware (Redis sliding window)
- [ ] Error handling middleware
- [ ] Health check endpoint with service status
- [ ] Seed script with sample data

**Deliverable:** Entire core loop works via curl/Postman: register -> enroll -> chat -> quiz -> payout.

---

## Phase 5: Frontend (Day 2-3 — Hours 18-28)

**Goal:** Student dashboard and sponsor portal with working UI.

### Tasks

**Student Dashboard:**
- [ ] Auth pages (register, login)
- [ ] Bounty browser (list available bounties, filter, search)
- [ ] Enrollment flow (enroll in bounty, see progress)
- [ ] AI tutor chat interface (streaming responses, source citations)
- [ ] Quiz UI (timed quiz, progress bar, submit)
- [ ] Results page (score, pass/fail, reward notification)
- [ ] Wallet page (balance, transaction history, withdraw)
- [ ] Credential portfolio (list of earned SBTs)

**Sponsor Portal:**
- [ ] Bounty creation form
- [ ] Bounty dashboard (completions, payouts, ROI)
- [ ] Deposit USDC flow

**Shared:**
- [ ] Navigation + layout
- [ ] Loading states, error states
- [ ] Responsive design (mobile-first — Indian students are on phones)
- [ ] Dark mode (optional, but judges love it)

**Deliverable:** Complete working UI for the demo.

---

## Phase 6: Integration Testing + Polish (Day 3 — Hours 28-34)

**Goal:** Everything works together. No demo-breaking bugs.

### Tasks

- [ ] End-to-end test: full loop from signup to USDC in wallet
- [ ] Test with real testnet USDC (not just mocked)
- [ ] Fix edge cases (expired sessions, network errors, race conditions)
- [ ] Add loading/success/error toasts
- [ ] Polish UI animations and transitions
- [ ] Test on mobile viewport
- [ ] Prepare seed data for demo (pre-funded bounty, pre-enrolled student)
- [ ] Dry-run the demo 3 times

**Deliverable:** Demo-ready application with no known blockers.

---

## Phase 7: Demo Prep (Day 3 — Hours 34-36)

**Goal:** Rehearsed, polished presentation.

### Tasks

- [ ] Write pitch script (see DEMO_SCRIPT.md)
- [ ] Prepare slides (problem -> solution -> demo -> market -> team)
- [ ] Record backup video of the demo (in case live demo fails)
- [ ] Prepare "wow moment": student passes quiz -> USDC appears in wallet -> show tx on Basescan
- [ ] Practice pitch 3 times with timer
- [ ] Prepare FAQ answers for judges

**Deliverable:** Confident team ready to present.

---

## Scope Cuts (If Running Behind)

Priority order of what to cut:

1. **Cut first:** Sponsor portal UI (demo as admin-seeded bounty)
2. **Cut second:** SBT credential minting (keep the escrow + payout, drop the NFT)
3. **Cut third:** Withdraw to external wallet (show balance, skip withdrawal)
4. **Cut fourth:** Chat streaming (use non-streaming responses)
5. **Never cut:** The core loop (signup -> learn -> quiz -> USDC payout). This IS the demo.

---

## Stretch Goals (If Ahead of Schedule)

- [ ] Leaderboard: top students by earnings / completions
- [ ] Multi-language support (Hindi + English)
- [ ] Sponsor analytics dashboard with charts
- [ ] Email notifications on quiz pass + payout
- [ ] PWA support (installable on mobile)
- [ ] Multiple curricula in the demo (Rust + Python)
- [ ] Referral system (student invites friend -> bonus USDC)

---

## Team Allocation (Suggested for 3-Person Team)

| Person | Phase 0-1 | Phase 2-3 | Phase 4-5 | Phase 6-7 |
|--------|-----------|-----------|-----------|-----------|
| **Dev A (Full-Stack)** | Monorepo + Frontend scaffold | Dify + RAGFlow setup | Frontend pages | Integration testing |
| **Dev B (Backend)** | Backend scaffold + DB | Circle integration | Backend APIs + webhooks | Bug fixes + polish |
| **Dev C (Blockchain)** | Smart contracts + tests | Contract deployment | Contract service + payout orchestration | Demo prep + pitch |
