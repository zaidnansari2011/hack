# Testing Strategy

## Philosophy

For a hackathon, we test what can **break the demo** and what handles **real money**. Not everything needs unit tests. Smart contracts and the payout pipeline get thorough coverage. UI components get manual testing.

---

## Test Pyramid

```
          ┌───────────────┐
          │   E2E Tests   │  1-2 critical paths (the demo loop)
          │   (Playwright) │
          ├───────────────┤
          │  Integration  │  API + DB + external services
          │   (Vitest)    │  Focus on: webhooks, payout flow
          ├───────────────┤
          │  Contract     │  Comprehensive (Foundry forge test)
          │   Tests       │  Every function, every edge case
          ├───────────────┤
          │  Unit Tests   │  Business logic only (quiz scoring,
          │   (Vitest)    │  anti-cheat rules, payout calculations)
          └───────────────┘
```

---

## Layer 1: Smart Contract Tests (Critical — 100% Coverage)

Framework: **Foundry** (`forge test`)

These tests are non-negotiable. The contracts hold real money.

### Test File: `test/ProofOfLearnEscrow.t.sol`

```
✓ testCreateBounty
    - Sponsor deposits USDC, bounty created with correct state
    - BountyCreated event emitted with correct args

✓ testCreateBountyInsufficientBalance
    - Reverts if sponsor doesn't have enough USDC

✓ testCreateBountyDuplicateId
    - Reverts if bounty ID already exists

✓ testReleasePayout
    - Authorized relayer calls, student receives exact reward amount
    - ProofOfLearn event emitted
    - hasClaimed set to true
    - completions incremented
    - totalPaidOut updated

✓ testDoubleClaimReverts
    - Same student, same bounty → revert "Already claimed"

✓ testUnauthorizedRelayerReverts
    - Non-relayer address → revert "Not authorized"

✓ testBountyFullReverts
    - All slots taken → revert "Bounty full"

✓ testBountyExpiredReverts
    - Past deadline → revert "Bounty expired"

✓ testInsufficientFundsReverts
    - Not enough USDC left in escrow → revert

✓ testRefundAfterDeadline
    - Sponsor reclaims remaining USDC after deadline
    - BountyRefunded event emitted
    - Bounty marked inactive

✓ testRefundBeforeDeadlineReverts
    - Sponsor tries early withdrawal → revert

✓ testRefundNonSponsorReverts
    - Random address tries to refund → revert

✓ testSetRelayer
    - Owner adds/removes relayer
    - RelayerUpdated event emitted

✓ testSetRelayerNonOwnerReverts
    - Non-owner → revert

✓ testFuzzReleasePayout(address student, uint256 reward)
    - Fuzz with random addresses and reward amounts
    - Verify invariants hold across 1000 runs

✓ testReentrancyAttack
    - Malicious contract tries to re-enter during payout
    - ReentrancyGuard blocks it
```

### Test File: `test/LearnCredential.t.sol`

```
✓ testMintCredential
    - Authorized minter creates SBT for student
    - Credential data stored correctly

✓ testDuplicateCredentialReverts
    - Same student + same bounty → revert

✓ testTransferReverts
    - transferFrom → revert "Soulbound: non-transferable"
    - safeTransferFrom → revert

✓ testApproveReverts
    - approve → revert
    - setApprovalForAll → revert

✓ testUnauthorizedMinterReverts
    - Non-minter → revert
```

### Running

```bash
cd apps/contracts
forge test               # All tests
forge test -vvvv         # Verbose (see call traces)
forge test --gas-report  # Gas usage report
forge coverage           # Coverage report
```

**Target: 100% line coverage on both contracts.**

---

## Layer 2: Unit Tests (Business Logic)

Framework: **Vitest**

Test pure functions and business logic in isolation. No database, no external services.

### Quiz Scoring (`apps/api/services/quiz/__tests__/`)

```
✓ gradeQuiz — correct answers scored properly
✓ gradeQuiz — partial credit calculated correctly
✓ gradeQuiz — returns pass/fail based on bounty threshold
✓ generateIdempotencyKey — deterministic for same inputs
✓ generateIdempotencyKey — unique for different inputs
✓ isQuizSessionExpired — returns true after TTL
✓ isQuizSessionExpired — returns false within TTL
```

### Anti-Cheat Rules (`apps/api/services/quiz/__tests__/anti-cheat.test.ts`)

```
✓ detectSuspiciousTimings — flags all-at-once submissions
✓ detectSuspiciousTimings — passes normal submission patterns
✓ matchFingerprints — detects same browser across accounts
✓ matchFingerprints — doesn't flag different browsers
✓ validateSessionToken — rejects expired tokens
✓ validateSessionToken — rejects replayed tokens
```

### Payout Calculations (`apps/api/services/payout/__tests__/`)

```
✓ calculatePayout — returns correct USDC amount
✓ calculatePayout — returns 0 for failed quiz
✓ calculatePayout — handles decimal precision correctly (6 decimals for USDC)
✓ buildCircleTransferPayload — correct format for Circle API
```

### Running

```bash
cd apps/api
pnpm test              # All unit tests
pnpm test:watch        # Watch mode during development
pnpm test:coverage     # Coverage report
```

**Target: 90%+ coverage on services/quiz/ and services/payout/.**

---

## Layer 3: Integration Tests (API + Database)

Framework: **Vitest** + test database

These hit the real database (test instance) and verify that API endpoints, middleware, and database operations work together.

### Setup

```bash
# Uses a separate test database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/proofoflearn_test

# Before each test suite:
# 1. Reset database
# 2. Run migrations
# 3. Seed with test data
```

### Auth Integration (`apps/api/routes/__tests__/auth.test.ts`)

```
✓ POST /auth/register — creates user + wallet record
✓ POST /auth/register — returns JWT
✓ POST /auth/register — rejects duplicate email
✓ POST /auth/login — returns JWT for valid credentials
✓ POST /auth/login — rejects wrong password
✓ GET /auth/me — returns user with valid token
✓ GET /auth/me — returns 401 without token
```

### Bounty Integration (`apps/api/routes/__tests__/bounties.test.ts`)

```
✓ POST /bounties — sponsor creates bounty
✓ POST /bounties — student role rejected (403)
✓ GET /bounties — lists active bounties
✓ GET /bounties/:id — returns bounty with stats
✓ POST /enrollments — student enrolls in bounty
✓ POST /enrollments — rejects duplicate enrollment
✓ POST /enrollments — rejects depleted bounty
```

### Quiz Integration (`apps/api/routes/__tests__/quizzes.test.ts`)

```
✓ POST /quizzes/start — creates session with questions
✓ POST /quizzes/start — rejects if lessons not completed
✓ POST /quizzes/:id/submit — grades and returns result
✓ POST /quizzes/:id/submit — rejects expired session
✓ POST /quizzes/:id/submit — rejects double submission
✓ POST /quizzes/:id/submit — queues payout on pass
```

### Webhook Integration (`apps/api/webhooks/__tests__/`)

```
✓ POST /webhooks/circle — processes transfer completion
✓ POST /webhooks/circle — rejects invalid signature
✓ POST /webhooks/dify — processes quiz score
✓ POST /webhooks/dify — rejects invalid signature
```

### Running

```bash
cd apps/api
pnpm test:integration    # Integration tests only
```

**Target: All critical paths covered. Focus on the payout flow.**

---

## Layer 4: E2E Tests (The Demo Loop)

Framework: **Playwright**

One or two tests that replicate the exact demo flow. If these pass, the demo works.

### Test: `apps/web/e2e/core-loop.spec.ts`

```
✓ Student completes full learning loop
    1. Register new student account
    2. Browse bounties
    3. Enroll in "Learn Rust" bounty
    4. Chat with AI tutor (send one message, verify response)
    5. Complete lesson
    6. Start quiz
    7. Submit answers
    8. Verify pass result displayed
    9. Verify wallet balance updated
    10. Verify transaction hash is clickable
```

### Running

```bash
cd apps/web
pnpm test:e2e           # Run Playwright tests
pnpm test:e2e --ui      # Playwright UI mode (visual debugging)
```

**Target: This one test passes reliably. That's it.**

---

## What We Don't Test (Hackathon Scope)

- Individual React components (shadcn/ui is battle-tested)
- CSS / visual regressions
- Performance benchmarks
- Load testing
- Cross-browser compatibility (Chrome-only for demo)
- Accessibility audits (important for prod, not for hackathon)

---

## CI Pipeline (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm type-check

  contracts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: foundry-rs/foundry-toolchain@v1
      - run: cd apps/contracts && forge test

  api-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: proofoflearn_test
          POSTGRES_PASSWORD: postgres
        ports: ['5432:5432']
      redis:
        image: redis:7
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: cd apps/api && pnpm prisma migrate deploy
      - run: cd apps/api && pnpm test
```

**Keep CI under 5 minutes.** Anything longer kills velocity during a hackathon.

---

## Manual Testing Checklist (Before Demo)

Run through this by hand on the morning of the presentation:

- [ ] Fresh browser, register new student
- [ ] Wallet address appears on profile
- [ ] Browse bounties, see the seeded bounty
- [ ] Enroll in bounty
- [ ] Chat with tutor — response is relevant and cites sources
- [ ] Start quiz — questions appear, timer works
- [ ] Submit quiz — score displayed correctly
- [ ] Passing score triggers reward notification
- [ ] Wallet balance updates
- [ ] Transaction hash links to Basescan and shows the ProofOfLearn event
- [ ] (If time) Try failing the quiz — verify no payout, retry option appears
