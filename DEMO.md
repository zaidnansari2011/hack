# Proof-of-Learn — Demo Runbook

A 4-minute walkthrough that shows the full loop: sponsor funds bounty →
student learns with AI tutor → passes anti-cheat quiz → INR lands in UPI →
on-chain proof event verifies the completion.

## One-time setup

```bash
# 1. Install deps + bring up postgres / redis
pnpm install
docker-compose up -d

# 2. Seed: demo sponsor, demo student, Rust 101 curriculum + chunks + 12 quiz questions
pnpm db:migrate
pnpm db:seed
```

## Optional: flip from simulated to live on-chain mode

Without this step the demo runs end-to-end with realistic-looking simulated
tx hashes. To make BaseScan links actually resolve:

```bash
# Prereq: deployer wallet has Base Sepolia ETH (~0.005 covers both contracts)
./apps/contracts/deploy.sh
# Patches ESCROW_CONTRACT_ADDRESS + CREDENTIAL_CONTRACT_ADDRESS into .env.local.
# Restart the API to pick them up.
```

The "BASE SEPOLIA · LIVE" / "DEMO MODE" pill on the sponsor dashboard tells
you which mode is active.

## Run the demo

```bash
pnpm dev   # starts api on :3001 and web on :3000
```

Open two browser windows side-by-side:

- **Left:** sponsor dashboard
- **Right:** student learn page

### Demo script (≈4 min)

1. **Land on the homepage** (right window) — point at the live activity feed.
   "Every row is a real platform event; the strip refreshes every 8s."

2. **Sign in as sponsor** (left window) → `sponsor@demo.pol` / `demo1234`.
   Land on the dashboard. Note the chain-mode pill, completion counter, and
   recent bounties row with BaseScan links.

3. **Fund a new bounty** (left) — `+ New bounty`. Show the curriculum
   selector, plug in `₹500 × 50 students`, hit `Fund ₹25,000 bounty`. The
   success card shows a tx hash linking out to BaseScan.

4. **Sign in as student** (right) → `student@demo.pol` / `demo1234`.
   Pick the original `Learn Rust, earn ₹250` bounty.

5. **Tutor turn** (right) — click a suggested prompt like "Explain ownership
   in two sentences". Point at the citation chips under the response —
   "every claim is grounded in a chunk of the seeded curriculum". Send a
   follow-up question; show that retrieval picks a different chunk.

6. **Take the quiz** (right) — click `Take quiz →` on the sidebar. Walk
   through 5 randomized MCQs (point at the timer and the per-session shuffle:
   "answers are reordered per session, fingerprint is captured on submit").

7. **The money shot** — submit. Confetti fires, the ₹250 counter eases up,
   the payout track walks queued → processing → sent → confirmed in ~3
   seconds. The on-chain proof card flips to `minted` with a BaseScan link.

8. **Pivot to the sponsor window** (left) — the verified-completions stat
   card pulses green; the count went from 0 to 1 without a refresh. Open
   the BaseScan tx link to show the `LearningVerified` event.

9. **Close** with the earnings page (right) — `/payouts`. "Same flow at
   scale: 10,000 verified completions, 10,000 INR transfers, 10,000 on-chain
   events, all auditable."

## What's real vs simulated (be honest in Q&A)

| Layer | Real | Simulated for the demo |
|-------|------|------------------------|
| Auth, DB, RAG retrieval, quiz scoring, anti-cheat | ✅ all real | — |
| Groq LLM (tutor) | ✅ live, with `GROQ_API_KEY` set | Falls back to a chunk-quote response if Groq is offline |
| Smart contracts | ✅ deployable to Base Sepolia via `deploy.sh` | Realistic tx hashes when contracts aren't deployed |
| Razorpay UPI payouts | Scaffolded (`PAYOUT_SIMULATION=false` flips to live) | `PAYOUT_SIMULATION=true` walks the state machine in-process |
| Student wallets | Deterministic per userId for the demo | Real users would connect MetaMask / Privy |

## Reset the demo data

```bash
docker-compose down -v && docker-compose up -d   # nukes Postgres
pnpm db:migrate && pnpm db:seed                  # re-seeds
```
