/# Hackathon Round 1 — Screening Answers

---

### 1. In exactly 2–3 sentences: What specific problem are you solving, who faces it, and how frequently does it affect them?

Hundreds of millions of students in developing countries — particularly India's 250M+ K-12 learners — lack access to quality, personalized education and have zero financial incentive to complete self-paced curricula, leading to a 50%+ dropout rate in online learning. Simultaneously, organizations (governments, corporations, NGOs) spend billions annually on workforce development and literacy programs with no reliable way to verify that learning actually occurred. This misalignment between funding and outcomes is a daily, systemic failure — every single day, sponsored education budgets are spent with no proof they produced knowledge.

---

### 2. Cite 1–2 real data points (statistics, reports, or studies) that prove this problem exists at scale. Include the source/URL.

1. **World Bank Learning Poverty Brief (2022):** 56% of children in South Asia are in "learning poverty" — unable to read and understand a simple text by age 10. In India specifically, this means roughly 140 million children are not learning foundational skills despite being enrolled in school.
   Source: https://www.worldbank.org/en/topic/education/brief/what-is-learning-poverty

2. **ASER 2023 (Annual Status of Education Report — India's largest citizen-led education survey):** Only 25.6% of Class 5 students in rural India could do basic division (3-digit by 1-digit). Despite near-universal enrollment, actual learning outcomes remain catastrophically low — proving enrollment ≠ education.
   Source: https://asercentre.org/report/aser-2023/

---

### 3. Which UN Sustainable Development Goal(s) does your solution directly address? In one sentence, explain how.

**SDG 4 (Quality Education) and SDG 8 (Decent Work and Economic Growth):** Proof-of-Learn directly advances SDG 4 by deploying a RAG-grounded AI tutor that delivers personalized, curriculum-aligned education to underserved students at zero cost to them, and advances SDG 8 by creating a direct financial pathway — guaranteed micro-earnings in USDC stablecoins — that ties skill acquisition to immediate economic benefit, incentivizing completion and workforce readiness.

---

### 4. Who is your primary user? Define them clearly by demographics, geography, or behaviour.

Our primary user is an **Indian student aged 16–25**, from a Tier 2/Tier 3 city or rural area, who owns a smartphone with mobile data but cannot afford private tutoring (₹5,000–₹50,000/month). They are digitally literate enough to use WhatsApp and YouTube for self-study, are actively seeking to build employable skills (programming, English, digital literacy), and would be strongly motivated by even a small guaranteed financial reward (₹85–₹400 per completed module) — the equivalent of a day's pocket money that validates their effort. They have never used a crypto wallet and don't need to know they're using one.

---

### 5. Name 2 existing solutions or competitors, explain why they fall short for your user, describe what your solution does differently, and identify the single biggest challenge your solution faces and how you plan to address it.

**Competitor 1 — Layer3 (layer3.xyz):** A quest-based platform where users complete on-chain tasks (swap tokens, bridge assets) to earn token rewards. It falls short because it verifies *actions*, not *knowledge* — completing a token swap doesn't prove you understand DeFi concepts. There is no tutoring, no curriculum, and the target user is a crypto-native adult, not an Indian student learning foundational skills.

**Competitor 2 — BitDegree:** An online course platform with token-based scholarship incentives. It falls short because rewards are paid in a volatile native token (not stablecoins), distributed via lottery/pool (not guaranteed per student), and courses are pre-recorded videos with no adaptive AI tutoring or curriculum grounding via RAG. A student in Jaipur completing a course might receive nothing.

**What we do differently:** Proof-of-Learn combines three capabilities no competitor has together: (1) a RAG-grounded AI tutor that teaches from actual curriculum documents (NCERT textbooks, coding docs) — not generic AI, (2) guaranteed per-completion USDC payouts via Circle Programmable Wallets — not lotteries, not volatile tokens, and (3) a sponsor-funded bounty model where companies/governments deposit into smart contract escrow, so the economics are sustainable without the platform subsidizing rewards from its own pocket (the reason Coinbase Learn & Earn shut down in May 2025).

**Biggest challenge:** The cold-start marketplace problem — sponsors won't fund bounties without students, and students won't come without funded bounties. We plan to address this by **securing one anchor sponsor before launch** (targeting NASSCOM's FutureSkills program or a state government digital literacy initiative) to pre-fund 3–5 bounties covering 10,000 student slots. This creates initial supply. Students are acquired through college WhatsApp networks (see Q7). Once we demonstrate a 60%+ completion rate with verified on-chain proof, the sponsor ROI data sells the next contract.

---

### 6. How does this solution make money or sustain itself? Name the primary revenue stream and specify who pays.

The platform sustains itself through four revenue streams — students never pay a single rupee:

**1. Protocol fee on sponsor deposits (Primary — Day 1):** 3–5% fee on every sponsor deposit. The sponsor pays. When a company deposits ₹17,00,000 to fund a bounty for 10,000 students at ₹170 each, the protocol retains ₹51,000–₹85,000. At scale (10 lakh verified completions/year at ₹170 average reward), this alone generates ₹50L–₹85L annually.

**2. India CSR compliance channel:** Section 135 of the Companies Act legally requires every company with ₹5Cr+ net profit to spend 2% on CSR — and education is a qualifying category. Indian companies collectively spend ₹25,000+ Cr on CSR annually, but struggle to prove impact. Proof-of-Learn gives them on-chain, auditable proof that their ₹X funded Y verified learners. We become the *reporting infrastructure* for CSR education spend, not just a platform. We charge a 5–8% facilitation fee for sourcing, managing, and verifying CSR-funded bounties.

**3. Recruitment/hiring access (Post-traction):** Students who complete bounties build a verifiable on-chain learning portfolio (SBT credentials). Employers and recruitment agencies pay ₹500–₹2,000 per verified candidate profile to access top performers — essentially a reverse job board where skills are cryptographically proven, not self-reported. In a country where 60%+ of resumes contain exaggerations, verified credentials have real value.

**4. Sponsor analytics SaaS (Post-traction):** Premium dashboards for sponsors — completion funnels, score distributions, regional breakdowns, cost-per-verified-learner metrics. Free tier shows basic stats; paid tier (₹25,000–₹1,00,000/month) unlocks detailed ROI reporting that sponsors need for internal stakeholders and CSR compliance filings.

---

### 7. How will you reach your first 100 users? Name the specific channel and explain why that user would choose you.

**Channel: College WhatsApp groups in Indian Tier 2/3 engineering colleges (specifically, 5–10 CS/IT department groups at colleges like NIT Jaipur, IIIT Allahabad, VIT Vellore).** We reach group admins through our personal college networks and post a single message: "Learn Rust/Python for free with an AI tutor and earn ₹150–₹400 in real USDC. No investment, no lottery — just pass the quiz." These students already use WhatsApp as their primary coordination channel, are actively learning to code for placement season, and a guaranteed ₹150–₹400 payout (a meal or two) for completing something they'd study anyway is a no-brainer. The "earn while learning" hook converts because it's zero-risk to the student: there's nothing to buy, no wallet to set up manually, and the AI tutor is available 24/7 — unlike a human tutor who costs ₹500/hour.

---

### 8. If your solution succeeds in 3 years, what is one measurable outcome that proves it worked?

**10,00,000 (10 lakh) verified learning completions with on-chain proof, disbursing ₹17+ Cr in cumulative USDC rewards to students across 50+ curricula.** Each completion is independently verifiable on-chain — not a self-reported metric, not a vanity signup number, but a cryptographically proven record that a specific student demonstrated understanding of a specific curriculum and received a specific payment. No education platform today can make this claim at this scale.

---

### 9. Has your team spoken to anyone who has this problem? If yes, what did you learn? If no, why not?

Yes. We spoke informally with 8–10 peers at our own college — engineering students actively preparing for placements and using free online resources (YouTube, GeeksforGeeks, LeetCode) to self-study. Three key insights emerged: **(1)** Every student said they had started and abandoned at least 2–3 online courses — the top reason was "no accountability, no reason to finish." A guaranteed financial reward, even a small one, was unanimously cited as something that would change their completion behaviour. **(2)** Students deeply distrusted "earn crypto" pitches because of past scams — the fact that USDC is a dollar-pegged stablecoin (not a speculative token) and that they don't need to invest anything made them significantly more receptive. **(3)** The AI tutor concept was more appealing than video courses because "you can ask it to explain again" — students specifically valued the ability to ask follow-up questions, something no pre-recorded course offers.

---

### 10. Why is your team the right one to build this? Mention one relevant skill or experience each member has.

- **Zaid Ansari:** Full-stack developer currently building a production quick-commerce ecosystem (Blinkit-scale) for a client — experienced in shipping real products under real deadlines. Has hands-on project experience with blockchain, Web3, decentralized identity (DID), and zero-knowledge proofs — directly relevant to the on-chain proof and wallet infrastructure this project requires.

- **Vaibhav Shiroorkar:** AI/ML developer working on deepfake detection systems — experienced in building models that distinguish authentic from fraudulent signals, which directly maps to our quiz anti-cheat system (detecting genuine learning vs. gaming). Understands ML pipelines, model evaluation, and the kind of adversarial thinking our verification layer demands.

Together, we've already won an institute-level competition as a team (disease prediction system using Random Forest), so we have a track record of building and shipping under hackathon-style pressure — together, not just individually. Our stack coverage is exact: Zaid handles full-stack development + blockchain/smart contracts + payment integration, Vaibhav handles AI/ML pipeline + RAG integration + anti-cheat intelligence. We're building this because we *are* the primary user — Indian engineering students who've experienced firsthand that enrollment doesn't equal education, that online courses get abandoned without accountability, and that a small guaranteed reward would have changed our own completion behaviour.
