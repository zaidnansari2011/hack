# Hackathon Round 1 — Screening Answers

---

## 1. In exactly 2–3 sentences: What specific problem are you solving, who faces it, and how frequently does it affect them?

Across India, hundreds of millions of students cannot afford private tutoring — and the tens of millions who turn to free online courses instead are quitting before finishing, with NPTEL and SWAYAM reporting completion rates as low as 5–10%. The organizations funding these programs — companies spending mandatory CSR budgets, government digital literacy initiatives, NGOs — have no mechanism to verify whether their money produced a single confirmed learner, making this a daily funding failure across hundreds of crores of education spend. The problem is not access to content; content is everywhere — it is the complete absence of accountability, incentive, and verifiable proof on both sides of the education transaction.

---

## 2. Cite 1–2 real data points (statistics, reports, or studies) that prove this problem exists at scale

1. **2025 Systematic Review (ICBDIE — 70 studies across MOOC platforms):** Over 90% of MOOC learners globally drop out before completing a course. In India specifically, NPTEL and SWAYAM report completion rates of 5–10% — meaning for every 100 students who enroll in a government-backed free course, 90–95 never finish.
   Source: <https://dl.acm.org/doi/10.1145/3729605.3729652>

2. **India Skills Report 2025 (Wheebox + CII + LinkedIn — Asia's largest annual graduate employability study):** Despite India producing over 1.5 million engineering graduates every year, only around 51% are considered employable by industry standards — meaning one in two graduates completes years of education without becoming job-ready. Verified skill credentials, not just degrees or course completions, are what the market actually demands.
   Source: <https://wheebox.com/india-skills-report.htm>

---

## 3. Which UN Sustainable Development Goal(s) does your solution directly address? In one sentence, explain how

**SDG 4 (Quality Education) and SDG 8 (Decent Work and Economic Growth):** Proof-of-Learn directly advances SDG 4 by deploying a RAG-grounded AI tutor that delivers personalized, curriculum-aligned education to underserved students at zero cost to them, and advances SDG 8 by creating a direct financial pathway — guaranteed cash payouts in INR directly to a student's bank account — that ties skill acquisition to immediate economic benefit, incentivizing completion and workforce readiness.

---

## 4. Who is your primary user? Define them clearly by demographics, geography, or behaviour

Our primary user is an **Indian student aged 16–25**, studying at a government college or self-teaching online, who cannot afford private tutoring (₹5,000–₹50,000/month). They self-study through WhatsApp and YouTube, they've started and abandoned at least two online courses in the past year, and they would genuinely change their behaviour for even ₹150–₹400 on completing a module — that's a meal or two, and it proves their time was worth something. They receive their earnings in INR directly to their bank account — no wallet, no exchange, nothing to set up.

---

## 5. Name 2 existing solutions or competitors, explain why they fall short for your user, describe what your solution does differently, and identify the single biggest challenge your solution faces and how you plan to address it

**Competitor 1 — NPTEL/SWAYAM (Government-backed free courses):** These are the exact platforms our target users are already on — and they have catastrophically low completion rates (5–10%) because there is no adaptive tutoring, no financial incentive to finish, and certificates have limited employer recognition. The student has everything to gain and nothing to lose by quitting, so 90 out of 100 do exactly that.

**Competitor 2 — BitDegree:** An online course platform with token-based scholarship incentives. It falls short because rewards are paid in a volatile native token (not stablecoins), distributed via lottery (not guaranteed per student), and courses are pre-recorded videos with no adaptive AI tutoring or curriculum grounding via RAG. A student in Jaipur completing an entire course might receive nothing — which doesn't just disappoint them, it confirms every suspicion they had about "earn online" schemes.

**What we do differently:** Proof-of-Learn combines three capabilities no competitor has together: (1) a RAG-grounded AI tutor that teaches from actual curriculum documents (NCERT textbooks, coding docs) — not generic AI — with adaptive quizzes generated from a rotating bank that can't be memorized or shared, time limits enforced per question, answer-order randomised every attempt, and session fingerprinting to detect cheating, (2) guaranteed per-completion INR payouts via UPI directly to the student's bank account — not lotteries, not tokens, not an exchange account needed, and (3) a sponsor-funded bounty model where companies and governments deposit into smart contract escrow, so the economics are sustainable without the platform subsidising rewards from its own pocket (the reason Coinbase Learn & Earn shut down in May 2025).

**Biggest challenge:** Two problems in parallel — the cold-start marketplace and regulatory clarity.

On **regulation**: We use blockchain exactly where it adds trust that traditional infrastructure cannot replicate — sponsor escrow and immutable proof of completion — and nowhere else. Sponsor funds sit in a smart contract on Base that can only release to verified learners. When a student passes, the contract emits an on-chain completion event and mints a non-transferable certificate. At that point, our backend triggers a UPI payout via Razorpay directly to the student's bank account in INR. Students never see a wallet, never touch crypto, and receive money through infrastructure they already trust. Blockchain for proof. UPI for payment. For global sponsors depositing USDC directly, the escrow is fully trustless. For Indian sponsors paying in INR, our backend handles the conversion before funds enter the contract — a deliberate tradeoff for India-market accessibility that we are transparent about.

On **cold-start**: Sponsors won't fund bounties without students, and students won't come without funded bounties. We solve this in two steps. First, Zaid and Vaibhav personally seed the first demo cohort — enough to run one live bounty, prove the completion rate, and generate the on-chain proof receipts. Second, we take that data to our first anchor sponsor — targeting NASSCOM's FutureSkills program or a state government digital literacy initiative — and close a pre-funded bounty covering 1,000–10,000 student slots. Real completion data from a real cohort sells the next contract; a pitch deck alone doesn't.

---

## 6. How does this solution make money or sustain itself? Name the primary revenue stream and specify who pays

The platform sustains itself through four revenue streams — students never pay a single rupee. **Blockchain handles escrow and proof. UPI handles the last metre to the student's bank account.** Students receive INR directly — no crypto knowledge required, no exchange account, no off-ramping friction.

**How sponsors fund the pool:** Global sponsors deposit USDC directly into the smart contract escrow. Indian companies — the primary CSR channel — pay in INR via standard bank transfer. Our backend handles the conversion and deposits into the contract on their behalf. Sponsors never touch crypto; they get a CSR-compliant auditable impact report showing exactly how many students completed what curriculum.

**1. Protocol fee on sponsor deposits (Primary — Day 1):** 3–5% fee on every sponsor deposit. The sponsor pays. When a company deposits ₹17,00,000 to fund a bounty for 10,000 students at ₹170 each, the protocol retains ₹51,000–₹85,000. At scale (10 lakh verified completions/year at ₹170 average reward), this alone generates ₹50L–₹85L annually.

**2. India CSR compliance channel:** Section 135 of the Companies Act legally requires every company with ₹5Cr+ net profit to spend 2% on CSR — and education is a qualifying category. Indian companies collectively spend ₹25,000+ Cr on CSR annually, but struggle to prove impact. Proof-of-Learn gives them on-chain, auditable proof that their ₹X funded Y verified learners. We become the *reporting infrastructure* for CSR education spend, not just a platform. We charge a 5–8% facilitation fee for sourcing, managing, and verifying CSR-funded bounties.

**3. Recruitment/hiring access (Post-traction):** Students who complete bounties build a verifiable on-chain learning portfolio (SBT credentials). Employers and recruitment agencies pay ₹500–₹2,000 per verified candidate profile to access top performers — essentially a reverse job board where skills are cryptographically proven, not self-reported. In a country where 60%+ of resumes contain exaggerations, verified credentials have real value.

**4. Sponsor analytics SaaS (Post-traction):** Premium dashboards for sponsors — completion funnels, score distributions, regional breakdowns, cost-per-verified-learner metrics. Free tier shows basic stats; paid tier (₹25,000–₹1,00,000/month) unlocks detailed ROI reporting that sponsors need for internal stakeholders and CSR compliance filings.

---

## 7. How will you reach your first 100 users? Name the specific channel and explain why that user would choose you

**Channel: Our own campus in Mumbai first, then college WhatsApp groups across India.** We start by sitting students down, running them through a live session on our AI tutor, and letting them watch their completion payout land before they leave the room. No deck, no promises — just a real number going up on a phone screen. That first cohort becomes the proof.

From there we reach CS/IT WhatsApp groups at state university-affiliated engineering colleges and polytechnics — institutions where most students are self-funding their education and ₹150–₹400 is not pocket change. The message is simple: "Learn Rust/Python for free with an AI tutor and earn ₹150–₹400 directly in your bank account. No investment, no lottery — just pass the quiz." These students are already in placement season, studying the same content anyway, and a guaranteed payout for finishing what they'd study regardless is a no-brainer.

The acquisition loop is designed to self-replicate. When a student's payout lands, their natural instinct is to screenshot and share — a UPI payment notification hitting your phone converts better than any ad. We seed this on Instagram Reels, YouTube Shorts, and Reddit communities like r/developersIndia and r/btechtards where this exact student already discusses placements, money, and courses they never finished. LinkedIn hits students and young professionals simultaneously. The reason a student picks us is simple: it costs them nothing, the AI tutor answers back when they're stuck, and a guaranteed payout is waiting on the other side.

---

## 8. If your solution succeeds in 3 years, what is one measurable outcome that proves it worked?

**10,00,000 (10 lakh) verified learning completions with on-chain proof, disbursing ₹17+ Cr in cumulative INR rewards to students across 50+ curricula — with an average net earnings of ₹500+ per learner across their full course journey.** The path: Year 1 — 10,000 completions across 10 college cohorts, proving the model and validating completion rates. Year 2 — 75,000 completions as WhatsApp virality, first employer partnerships, and CSR sponsor referrals compound. Year 3 — 9,15,000 completions as organic word-of-mouth, scaled CSR mandates, and platform-led national growth push the total to 10 lakh. Each completion is independently verifiable on-chain — not a self-reported metric, not a vanity signup number, but a cryptographically proven record that a specific student demonstrated understanding of a specific curriculum and received a specific payment. No education platform today can make this claim at this scale.

Behind that number: a student from a small town in Jharkhand who enrolled in a full-stack course, finished it in 24 days, received ₹600 directly in his bank account, and now has a skill profile an employer can verify on-chain without calling anyone. First in his family to land a tech job — not because he got lucky, but because he showed up and the system paid him back.

---

## 9. Has your team spoken to anyone who has this problem? If yes, what did you learn? If no, why not?

Yes. We spoke to 8–10 engineering students at our own college — all grinding through placement prep, using YouTube and free resources to self-study. Every one had dropped at least 2–3 courses. Same reason, every time: needed to earn, couldn't afford to just learn.

One guy said he would have finished the whole thing easily if even ₹500 was waiting at the end. That one sentence is basically why this exists.

Three things came through clearly: first, every student confirmed that a guaranteed financial reward — even a small one — would change their completion behaviour, not just motivate them. Second, they deeply distrusted "earn crypto" pitches because of past scams, but once they understood that the payout is guaranteed in INR and lands directly in their bank account — no exchange, no tokens, no investment required — something shifted. Third, the AI tutor resonated more than any video course — one student said it best: "With a video if I don't get it it's over. With this I can just ask again." That's the product, in one sentence from a user.

We know this is a small and homogeneous sample. Before launch, we plan to run structured conversations with students at 3 government engineering colleges across different states to test whether the financial incentive and AI tutor resonate beyond our immediate peer group — and to surface objections we haven't heard yet.

---

## 10. Why is your team the right one to build this? Mention one relevant skill or experience each member has

Because we've been this student. Both of us have sat in front of an unfinished course and chosen a part-time shift instead. We're not building for a user persona.

- **Zaid Ansari:** Full-stack developer currently building a production quick-commerce platform for a client in the on-demand delivery space — shipping real systems under real deadlines. Has hands-on project experience with blockchain, Web3, decentralized identity (DID), and zero-knowledge proofs — directly relevant to the on-chain proof and wallet infrastructure this project requires.

- **Vaibhav Shiroorkar:** AI/ML developer working on deepfake detection systems — building models that distinguish authentic from fraudulent signals, which directly maps to our quiz anti-cheat system. Has already shipped working prototypes with Dify and AI workflow tooling. The AI layer isn't a plan — it's half built.

We've done this before. At our institute-level competition we built a disease prediction system from scratch under deadline — a Random Forest model with a full working website on top of it — and we won. Zaid handled the system architecture and web layer, Vaibhav handled the model. Neither of us had to explain what the other was doing. That's the kind of team dynamic you can't fake under pressure, and this is a much bigger problem worth building under pressure for.
