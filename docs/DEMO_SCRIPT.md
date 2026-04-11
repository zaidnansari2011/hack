# Demo Script & Pitch Structure

Total time: **5 minutes** (adjust to hackathon rules)
Split: **2 min pitch + 2.5 min live demo + 0.5 min close**

---

## Slide Deck (2 Minutes)

### Slide 1: The Hook (15 seconds)

> "In May 2025, Coinbase killed the most popular learn-to-earn program on the internet. 
> Millions of users lost their path to earning while learning.
> We built what should have existed instead."

Visual: Coinbase Learn & Earn shutdown headline + "RIP" graphic

### Slide 2: The Problem (30 seconds)

> "Education is broken in two ways."

**Column 1: Students pay to learn**
- 600M+ Indian students can't afford quality tutoring
- Those who can have no guarantee of outcomes
- No incentive alignment — school gets paid whether you learn or not

**Column 2: Learn-to-earn is dead**
- Coinbase model: rewards from their own pocket (unsustainable)
- No proof of real understanding (complete a task ≠ learn a concept)
- Lottery/pool rewards (no guarantee per student)

> "Nobody has built the obvious fix."

### Slide 3: The Solution (30 seconds)

> "Proof-of-Learn flips who pays for education."

**Three-column diagram:**

```
SPONSOR                    PROTOCOL                   STUDENT
(Company, Govt, DAO)       (AI + Blockchain)          (Learner)
                                                      
Deposits USDC    ───>     AI teaches from            Learns, passes quiz
into escrow               real curriculum (RAG)       
                                                     Gets USDC directly
                          Verifies learning           in their wallet
                          on-chain                    
                                                     Builds portable
                          Auto-distributes            credential (SBT)
                          rewards                     
```

> "Companies fund bounties. AI teaches. Blockchain proves it. Students earn."

### Slide 4: Why Now (15 seconds)

Three converging forces:
1. **Coinbase vacuum** — the market leader just left
2. **RAG maturity** — we can finally ground AI tutors in real textbooks, not hallucinations
3. **Stablecoin rails** — Circle Programmable Wallets make $2 payouts feasible for the first time

### Slide 5: Tech Stack (15 seconds)

Quick visual overview — don't explain each one, just show credibility:

```
Dify (AI Workflow) + RAGFlow (Knowledge Base) + Circle (Wallets + USDC) + Base (L2)
```

> "Every component is production-grade, open-source or enterprise-backed, and chosen for a specific reason. Details in our docs."

### Slide 6: Transition to Demo (15 seconds)

> "Enough slides. Let me show you the loop — from signup to USDC in a student's wallet."

---

## Live Demo (2.5 Minutes)

### Pre-Demo Setup

Before going on stage:
1. Pre-seed a bounty ("Learn Rust Programming — $2 per student, 100 slots") so you don't waste demo time on sponsor flow
2. Have Basescan open in a tab (Base Sepolia explorer)
3. Have the student registration page loaded
4. Clear browser storage for a fresh experience
5. Have a backup video ready in case anything breaks

### Demo Flow

**Step 1: Register as a Student (20 seconds)**

> "I'm a student in Mumbai. I sign up with my email."

- Fill in registration form
- Account created → wallet assigned automatically

> "I already have a crypto wallet. I didn't install MetaMask. I didn't buy ETH. The protocol created one for me."

**Step 2: Browse Bounties (15 seconds)**

- Show the bounty browser
- Click on "Learn Rust Programming — Earn $2"

> "This bounty was funded by a sponsor who deposited $200 in USDC. 100 students can earn $2 each for completing the curriculum."

**Step 3: Enroll + Chat with AI Tutor (30 seconds)**

- Click "Enroll"
- Chat with the tutor: "What is ownership in Rust?"
- Show the AI response with **source citations** (the textbook chunk it pulled from)

> "This isn't ChatGPT. The tutor is grounded in the actual Rust Programming textbook via RAGFlow. See the source — page 45, chapter 4. No hallucinations."

**Step 4: Take the Quiz (30 seconds)**

- Click "Start Quiz"
- Show 3-4 multiple choice questions (pre-answer them quickly or have a pre-filled state)
- Submit

> "These questions were generated from the same curriculum content I just learned. Every student gets different questions — you can't share answers."

**Step 5: The Wow Moment — USDC Payout (45 seconds)**

- Show the result: "Score: 85% — PASSED"
- Show the reward notification: "$2.00 USDC sent to your wallet"
- Navigate to wallet page — show the balance: "$2.00"
- **Click on the transaction hash** → opens Basescan
- Show the on-chain proof: ProofOfLearn event with the student's address

> "That's real USDC. On a real blockchain. Verifiable by anyone. The student earned it by proving they understand Rust ownership — not by clicking a button or completing a task."

**Step 6: Show the SBT Credential (15 seconds)**

- Show the credential in the portfolio page
- Highlight: non-transferable, linked to this specific curriculum and score

> "And they now have a permanent, non-transferable credential proving they completed this curriculum. This follows them forever — a portable proof of learning."

### If Live Demo Breaks

Switch to the pre-recorded video immediately. Say:

> "Our live demo hit a snag — here's the recorded version showing the same flow."

Don't debug on stage. Don't apologize more than once. Show the video and move on.

---

## Close (30 Seconds)

### The Market

> "There are 600 million students in India alone. The global corporate training market is $370 billion. Governments spend billions on workforce development with no way to verify outcomes."

### The Ask

> "We're not building a quiz app. We're building infrastructure — a protocol where anyone can fund education and the AI handles everything from teaching to payment."

### The One-Liner

> "Proof-of-Learn: Sponsors fund it. AI teaches it. Blockchain proves it. Students earn it."

---

## Judge Q&A Preparation

### Expected Questions and Answers

**Q: How do you prevent cheating?**
> "Three layers: dynamic question pools so every student gets different questions, time limits with session fingerprinting, and questions generated directly from RAG-retrieved content so you can't Google the answers. We also have an admin flagging system for suspicious patterns."

**Q: Why USDC and not your own token?**
> "Two reasons. First, no volatility — a $2 reward should be worth $2 when the student receives it. Second, sponsors understand USDC. Try getting a government to buy your custom token — USDC is a regulated, audited stablecoin they can actually approve."

**Q: What's your business model?**
> "Protocol fee on each payout — 2-5% of the reward. If a sponsor deposits $20,000 for 10,000 students, we earn $400-$1,000. The fee is paid by sponsors, not students."

**Q: How is this different from Layer3/RabbitHole/BitDegree?**
> "Those platforms verify actions — did you swap a token, did you bridge assets. We verify knowledge — did you actually understand ownership in Rust. They have no AI tutor, no RAG grounding, no guaranteed per-student payouts. We have all three."

**Q: What's your go-to-market?**
> "India first. Partner with NASSCOM, NPTEL, or one state government to run a pilot: 'Fund 10,000 students to learn Python.' The sponsor gets a dashboard showing exactly how many students completed, what they scored, and what it cost per verified learner. That data sells the next contract."

**Q: Can this work for non-technical subjects?**
> "Absolutely. RAGFlow can ingest any document — textbooks, manuals, compliance training material. The curriculum is just a knowledge base. Swap the Rust docs for medical training manuals and the same loop works."

**Q: What happens if the AI generates wrong quiz answers?**
> "Quiz answers are generated from the RAG-retrieved content, not from the model's general knowledge. The 'correct' answer is always traceable to a specific document chunk. We also store all questions and answers for audit. In production, we'd add a question review pipeline before they go live."

**Q: How do you handle students with no internet/devices?**
> "Honestly, for the hackathon, we need a smartphone with internet. Post-hackathon, the architecture supports offline-first: download lessons, take quizzes offline, sync results when connected. WhatsApp integration is also on the roadmap — 500M+ Indian users."

---

## Demo Environment Checklist

Before the presentation:

- [ ] Pre-seeded bounty with testnet USDC
- [ ] Pre-funded Circle escrow wallet
- [ ] RAGFlow indexed with curriculum docs
- [ ] Dify workflow tested end-to-end
- [ ] ngrok tunnel active for webhooks
- [ ] Basescan tab open
- [ ] Browser in incognito mode (clean state)
- [ ] Backup demo video on USB/cloud
- [ ] Charger plugged in
- [ ] Notifications silenced
- [ ] Font size increased for projector readability
