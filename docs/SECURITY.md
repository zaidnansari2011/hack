# Security & Threat Model

This document covers every security surface in Proof-of-Learn: quiz integrity, financial safety, data privacy, and infrastructure hardening.

---

## Threat Model Overview

### Actors

| Actor | Motivation | Capability |
|-------|-----------|------------|
| Cheating student | Earn USDC without actually learning | Browser dev tools, answer sharing, bots, multiple accounts |
| Malicious sponsor | Create bounty then withdraw funds before students are paid | Smart contract interaction, social engineering |
| External attacker | Steal funds, compromise wallets, exfiltrate data | Network attacks, API abuse, smart contract exploits |
| Compromised relayer | Backend key leaked — attacker can call releasePayout | Smart contract calls with valid authorization |

### Assets to Protect

1. **USDC in escrow** — The primary financial asset
2. **Student wallets** — Circle-managed, but we hold the developer control key
3. **Quiz integrity** — If quizzes are cheatable, the entire protocol is worthless
4. **User data** — Emails, learning history, wallet addresses
5. **API keys** — Dify, Circle, RAGFlow, deployer private key

---

## 1. Anti-Cheat System (Quiz Integrity)

This is the most critical security surface. If students can cheat quizzes, sponsors lose trust and the protocol fails.

### Defenses

| Attack | Defense | Implementation |
|--------|---------|---------------|
| **Answer sharing** | Dynamic question pools — each student gets different questions | Dify generates questions from RAG context; question selection is randomized per session |
| **Multiple accounts** | Rate limiting + fingerprinting | Browser fingerprint hash (canvas, WebGL, fonts) stored per quiz session; flag accounts with identical fingerprints |
| **Bot/automation** | Session fingerprinting + timing analysis | Track time-per-question distribution; flag sessions where all answers arrive simultaneously |
| **Copy-paste from AI** | Time limits + question complexity | 10-minute time limit per quiz; questions require comprehension of specific RAG-retrieved content, not general knowledge |
| **Answer lookup during quiz** | Randomized option order + context-dependent questions | Options are shuffled per student; questions reference specific paragraphs/examples from the curriculum |
| **Inspect element / DOM scraping** | Answers never sent to frontend | Quiz grading happens server-side; correct answers are only in Dify's workflow, never in API responses |
| **Replay attacks** | Session tokens with TTL | Quiz session ID is a one-time-use token stored in Redis with expiry; submitting the same session twice returns 409 |

### Escalation Path

```
Level 1: Automated detection (fingerprint match, timing anomaly)
  → Flag account for review, allow quiz to complete
  → Payout held in QUEUED status

Level 2: Admin review dashboard
  → Compare flagged sessions side-by-side
  → Approve or reject payout

Level 3: Account suspension
  → Repeat offenders get suspended
  → Wallet frozen (Circle developer-controlled wallets allow this)
```

### What We Explicitly Don't Do (Hackathon Scope)

- No proctoring/webcam monitoring — too invasive, too complex
- No keystroke dynamics — unreliable and privacy-concerning
- No hardware attestation — excludes most Indian students on basic devices

---

## 2. Financial Security

### Smart Contract Safety

| Measure | Details |
|---------|---------|
| **ReentrancyGuard** | On all state-changing functions in ProofOfLearnEscrow |
| **Double-claim prevention** | `hasClaimed[bountyId][student]` mapping checked before every payout |
| **Authorized relayers only** | `releasePayout` requires `authorizedRelayers[msg.sender]` |
| **Sponsor lock-in** | No refund before deadline — sponsors can't rug-pull students mid-program |
| **Balance checks** | Every payout verifies `remaining >= rewardPerStudent` before transfer |
| **2% reserve buffer** | Sponsors deposit 102% of total rewards — covers edge cases |
| **No delegatecall** | Contract doesn't use delegatecall or proxy patterns — no upgrade risk during hackathon |

### Payout Pipeline Safety

```
Quiz Pass
  → Generate idempotency key: sha256(bountyId + userId + quizSessionId)
  → Check Payout table for existing key (prevent duplicates)
  → Queue BullMQ job with idempotency key
  → Worker calls Circle transfer API
  → On success: mark COMPLETED, record txHash
  → On failure: retry with exponential backoff (max 5 retries)
  → On max retries: mark FAILED, alert admin
```

**Key invariant**: A student can never receive more than `rewardPerStudent` per bounty. Enforced at three levels:
1. Database: `@@unique([userId, bountyId])` on Enrollment
2. Smart contract: `hasClaimed` mapping
3. Payout table: `idempotencyKey` uniqueness

### Circle Wallet Security

- **Developer-controlled model**: We hold the encryption key, not the student. Students interact through our API.
- **Entity secret**: Encrypted with Circle's public key; stored in env vars, never in code.
- **Wallet set isolation**: Student wallets are in a separate wallet set from operational wallets.
- **No raw private key export**: Circle doesn't expose private keys — even if our backend is compromised, attacker can't extract wallet keys directly.

---

## 3. API Security

### Authentication

- JWT tokens with RS256 signing (asymmetric — verify without the signing key)
- Tokens expire after 7 days (configurable)
- Refresh token rotation on each use
- Password hashing: bcrypt with cost factor 12

### Authorization

```
STUDENT:  /learn/*, /quizzes/*, /wallet/*, /enrollments/*
SPONSOR:  /bounties/*, /analytics/*
ADMIN:    /admin/* (all endpoints)
```

Role checked via middleware on every request. No endpoint is unprotected except `/auth/register`, `/auth/login`, and `/health`.

### Input Validation

- All request bodies validated with Zod schemas
- SQL injection: impossible (Prisma parameterized queries)
- XSS: React auto-escapes by default; no `dangerouslySetInnerHTML` without sanitization
- CSRF: API is token-based (no cookies for auth), so CSRF doesn't apply

### Rate Limiting

Implemented via Redis sliding window:

| Endpoint | Limit | Penalty |
|----------|-------|---------|
| `/auth/register` | 5/hour per IP | 429 + 15min cooldown |
| `/auth/login` | 10/15min per IP | 429 + account lockout after 20 attempts |
| `/learn/chat` | 60/min per user | 429 |
| `/quizzes/start` | 3/hour per user | 429 |
| `/wallet/withdraw` | 5/hour per user | 429 |

### Webhook Verification

All inbound webhooks are verified before processing:

- **Dify**: HMAC-SHA256 signature in `X-Dify-Signature` header
- **Circle**: HMAC-SHA256 signature in `X-Circle-Signature` header
- **Chain events**: Verified against known contract addresses and expected event signatures

---

## 4. Data Privacy

### What We Store

| Data | Purpose | Retention |
|------|---------|-----------|
| Email | Account identity | Until account deletion |
| Password hash | Authentication | Until account deletion |
| Wallet address | Payment delivery | Until account deletion |
| Quiz answers | Audit trail, anti-cheat | 90 days after quiz |
| Chat messages | Tutor context continuity | 90 days after enrollment ends |
| IP address | Anti-cheat fingerprinting | 30 days |
| Browser fingerprint | Anti-cheat | 30 days |

### What We Don't Store

- Real names (optional field)
- Phone numbers
- Government IDs
- Biometric data
- Raw private keys (Circle manages these)

### Privacy Measures

- Score hashes on-chain (not raw scores) — `keccak256(score + nonce)` preserves privacy while enabling verification
- No PII on-chain — wallet addresses are pseudonymous
- Database encryption at rest (Postgres with AES-256)
- TLS everywhere (API, webhooks, database connections)

---

## 5. KYC/AML Considerations

### Hackathon Scope

For the hackathon demo, we operate on testnet with test USDC — no real money, no KYC required.

### Production Considerations (Post-Hackathon)

| Threshold | Requirement |
|-----------|-------------|
| < $600/year per student | No tax reporting required (US: below 1099 threshold) |
| > $600/year per student | May need KYC (name, address, tax ID) and 1099 reporting |
| Sponsor deposits > $10,000 | Enhanced due diligence (Circle handles this for USDC) |
| India-specific | RBI crypto regulations, potential UPI integration for off-ramp |

**Circle's compliance**: Circle is a regulated money transmitter. Using their infrastructure means we inherit their AML/KYC checks on the USDC side. We'd need to add our own KYC for the student identity layer.

### Recommended Approach (Post-Hackathon)

1. Tier 1 (< $50 earned): Email verification only
2. Tier 2 (< $600 earned): Email + phone verification
3. Tier 3 (> $600 earned): Full KYC (ID verification via third-party like Persona or Sumsub)

---

## 6. Infrastructure Security

### Secrets Management

| Secret | Storage | Rotation |
|--------|---------|----------|
| JWT signing key | Env var (prod: AWS Secrets Manager) | Quarterly |
| Circle API key | Env var (prod: AWS Secrets Manager) | On compromise |
| Circle entity secret | Env var (encrypted) | On compromise |
| Dify API key | Env var | On compromise |
| Deployer private key | Local only (never in CI/CD) | One-time use per deployment |
| Database password | Env var | Monthly |
| Webhook signing secrets | Env var | Monthly |

### Production Checklist (Post-Hackathon)

- [ ] All secrets in a vault (AWS Secrets Manager / HashiCorp Vault)
- [ ] Database not exposed to public internet
- [ ] Redis requires authentication
- [ ] API behind Cloudflare / AWS WAF
- [ ] Audit logging on all admin actions
- [ ] Alerting on: failed payouts, unusual quiz patterns, API error spikes
- [ ] Smart contract audited before mainnet deployment
- [ ] Circle webhook IPs whitelisted
- [ ] Regular dependency vulnerability scanning (`pnpm audit`)
- [ ] Backup strategy for PostgreSQL

---

## 7. Incident Response Plan

### Severity Levels

| Level | Example | Response |
|-------|---------|----------|
| P0 | Funds draining from escrow | Pause contract immediately, freeze Circle transfers, investigate |
| P1 | Widespread quiz cheating detected | Pause quiz submissions, review flagged sessions, patch vulnerability |
| P2 | API key leaked | Rotate key immediately, audit recent API calls |
| P3 | Individual account compromise | Freeze affected wallet, reset credentials |

### Emergency Actions

```bash
# Pause the escrow contract (requires owner)
cast send $ESCROW_ADDRESS "pause()" --private-key $OWNER_KEY

# Freeze all payout processing
# Set PAYOUT_PAUSED=true in env -> payout worker skips all jobs

# Rotate Circle API key
# 1. Generate new key in Circle console
# 2. Update env var
# 3. Restart API server
```
