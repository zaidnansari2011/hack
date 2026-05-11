import "dotenv/config"
import { PrismaClient, Prisma } from "@prisma/client"
import bcrypt from "bcryptjs"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { embedAll, toPgvectorLiteral } from "../src/services/tutor/embeddings"

const prisma = new PrismaClient()

type SyllabusModule = {
  module: string
  summary: string
  durationMinutes: number
}

type CurriculumSeed = {
  slug: string
  title: string
  summary: string
  topics: string[]
  category: string
  difficulty: string
  estimatedMinutes: number
  contentFile: string
  quizFile: string
  syllabus: SyllabusModule[]
}

type SponsorSeed = {
  email: string
  name: string
  organizationName: string
  websiteUrl: string
}

type BountySeed = {
  id: string
  sponsorEmail: string
  curriculumSlug: string
  title: string
  description: string
  rewardInr: number
  rewardUsdcMicros: bigint
  maxStudents: number
  enrolled: number
  completed: number
  status: "active" | "depleted" | "closed"
}

const SPONSORS: SponsorSeed[] = [
  {
    email: "sponsor@demo.pol",
    name: "Acme CSR Foundation",
    organizationName: "Acme CSR Foundation",
    websiteUrl: "https://acme-csr.example",
  },
  {
    email: "grants@web3india.example",
    name: "Web3 India Grants",
    organizationName: "Web3 India Grants",
    websiteUrl: "https://web3india.example",
  },
  {
    email: "diversity@kalpataru.example",
    name: "Kalpataru Initiative",
    organizationName: "Kalpataru Initiative",
    websiteUrl: "https://kalpataru.example",
  },
  {
    email: "talent@bluestack.example",
    name: "Bluestack Talent",
    organizationName: "Bluestack Talent",
    websiteUrl: "https://bluestack.example",
  },
  {
    email: "finance@rupeenest.example",
    name: "RupeeNest Financial Literacy",
    organizationName: "RupeeNest Financial Literacy",
    websiteUrl: "https://rupeenest.example",
  },
  {
    email: "creative@palette.example",
    name: "Palette Design Collective",
    organizationName: "Palette Design Collective",
    websiteUrl: "https://palette.example",
  },
  {
    email: "english@globalfluency.example",
    name: "Global Fluency Council",
    organizationName: "Global Fluency Council",
    websiteUrl: "https://globalfluency.example",
  },
  {
    email: "health@arogyaplus.example",
    name: "Arogya+ Foundation",
    organizationName: "Arogya+ Foundation",
    websiteUrl: "https://arogyaplus.example",
  },
  {
    email: "climate@greenstack.example",
    name: "Greenstack Climate Lab",
    organizationName: "Greenstack Climate Lab",
    websiteUrl: "https://greenstack.example",
  },
  {
    email: "careers@brightpath.example",
    name: "BrightPath Careers",
    organizationName: "BrightPath Careers",
    websiteUrl: "https://brightpath.example",
  },
  {
    email: "agri@harvestsetu.example",
    name: "HarvestSetu Cooperative",
    organizationName: "HarvestSetu Cooperative",
    websiteUrl: "https://harvestsetu.example",
  },
  {
    email: "ai@futurelens.example",
    name: "FutureLens AI Initiative",
    organizationName: "FutureLens AI Initiative",
    websiteUrl: "https://futurelens.example",
  },
]

const CURRICULA: CurriculumSeed[] = [
  {
    slug: "rust-101",
    title: "Rust Foundations",
    summary:
      "Memory safety without a garbage collector. Learn ownership, borrowing, lifetimes, and build your first CLI.",
    topics: ["Systems Programming", "Rust", "Backend"],
    category: "engineering",
    difficulty: "intermediate",
    estimatedMinutes: 90,
    contentFile: "rust-101.md",
    quizFile: "quiz-rust-101.json",
    syllabus: [
      {
        module: "Ownership",
        summary:
          "Why Rust has no garbage collector and what 'move' means in practice.",
        durationMinutes: 12,
      },
      {
        module: "Borrowing",
        summary:
          "Shared references vs mutable references; the one-writer-or-many-readers rule.",
        durationMinutes: 12,
      },
      {
        module: "Lifetimes",
        summary:
          "Annotations the compiler uses to prove no reference outlives its data.",
        durationMinutes: 14,
      },
      {
        module: "Traits",
        summary:
          "Rust's answer to interfaces. Generics, dynamic dispatch, and trait objects.",
        durationMinutes: 12,
      },
      {
        module: "Error handling",
        summary:
          "Result, Option, and the ? operator — propagating failure without exceptions.",
        durationMinutes: 10,
      },
      {
        module: "Collections",
        summary:
          "Vec, HashMap, slices, and when each is the right reach.",
        durationMinutes: 10,
      },
      {
        module: "Cargo & crates",
        summary:
          "The package manager, the test runner, and the wider ecosystem.",
        durationMinutes: 10,
      },
      {
        module: "Build a CLI",
        summary:
          "Apply everything above: arg parsing, file I/O, error propagation.",
        durationMinutes: 10,
      },
    ],
  },
  {
    slug: "solidity-101",
    title: "Solidity & Smart Contract Security",
    summary:
      "Build, test, and ship audited Solidity. Storage layout, reentrancy, access control, and the Foundry workflow.",
    topics: ["Smart Contracts", "Web3", "Security", "Solidity"],
    category: "engineering",
    difficulty: "advanced",
    estimatedMinutes: 110,
    contentFile: "solidity-101.md",
    quizFile: "quiz-solidity-101.json",
    syllabus: [
      {
        module: "State and Storage",
        summary:
          "Slot layout, calldata vs memory, why senior devs obsess over storage.",
        durationMinutes: 14,
      },
      {
        module: "Functions and Visibility",
        summary:
          "public, external, internal, private — and what `private` does NOT mean.",
        durationMinutes: 12,
      },
      {
        module: "Reentrancy",
        summary:
          "The DAO hack pattern, Checks-Effects-Interactions, and ReentrancyGuard.",
        durationMinutes: 14,
      },
      {
        module: "Events and Logs",
        summary:
          "Indexed parameters, when to use them, and what they cost.",
        durationMinutes: 12,
      },
      {
        module: "Access Control",
        summary:
          "Ownable, AccessControl roles, multisigs, timelocks — production patterns.",
        durationMinutes: 14,
      },
      {
        module: "ERC-20 and ERC-721",
        summary:
          "SafeERC20, the approve race, and how soulbound tokens are built.",
        durationMinutes: 14,
      },
      {
        module: "Foundry",
        summary:
          "Solidity-native tests, vm cheatcodes, fuzzing, invariant testing.",
        durationMinutes: 16,
      },
      {
        module: "Deployment & Verification",
        summary:
          "CREATE2 addresses, source verification, and why skipping it kills trust.",
        durationMinutes: 14,
      },
    ],
  },
  {
    slug: "python-data-101",
    title: "Python for Data Analysis",
    summary:
      "From messy CSV to polished chart. Pandas, group-by, matplotlib, and the Jupyter habits that prevent 3am debugging.",
    topics: ["Data Science", "Python", "Analytics", "Data Visualization"],
    category: "data-ai",
    difficulty: "intermediate",
    estimatedMinutes: 100,
    contentFile: "python-data-101.md",
    quizFile: "quiz-python-data-101.json",
    syllabus: [
      {
        module: "Pandas mental model",
        summary:
          "DataFrames, Series, and the three operations that cover 80% of analysis.",
        durationMinutes: 12,
      },
      {
        module: "Reading messy data",
        summary:
          "read_csv parameters, parse_dates, dtype, and when to switch to Parquet.",
        durationMinutes: 12,
      },
      {
        module: "Cleaning & transforming",
        summary:
          "Missing-data treatments, type coercion with errors='coerce', .str accessors.",
        durationMinutes: 14,
      },
      {
        module: "Group-by & pivot",
        summary:
          "Split-apply-combine, named aggregation, pivot tables with margins.",
        durationMinutes: 14,
      },
      {
        module: "Matplotlib fundamentals",
        summary:
          "Figure vs Axes, multi-panel layouts, publication-quality output.",
        durationMinutes: 12,
      },
      {
        module: "Time series",
        summary:
          "DatetimeIndex, resampling, rolling windows, time zone handling.",
        durationMinutes: 12,
      },
      {
        module: "Jupyter discipline",
        summary:
          "Restart-and-run-all, when to extract code into modules, common traps.",
        durationMinutes: 10,
      },
      {
        module: "Beyond pandas",
        summary:
          "chunksize iteration, polars, duckdb — when (and when not) to scale up.",
        durationMinutes: 14,
      },
    ],
  },
  {
    slug: "react-101",
    title: "React Fundamentals",
    summary:
      "The mental model that scales: components, state, effects done right. Stop fighting hooks; start composing them.",
    topics: ["Frontend", "React", "Web Development", "UI Engineering"],
    category: "engineering",
    difficulty: "intermediate",
    estimatedMinutes: 95,
    contentFile: "react-101.md",
    quizFile: "quiz-react-101.json",
    syllabus: [
      {
        module: "Components and JSX",
        summary:
          "Functions returning JSX, the three JSX rules, and how children compose.",
        durationMinutes: 10,
      },
      {
        module: "Props vs state",
        summary:
          "What state is for, the function-form setter, and avoiding derived state.",
        durationMinutes: 12,
      },
      {
        module: "Effects",
        summary:
          "Dependency arrays, the cleanup function, and when NOT to reach for useEffect.",
        durationMinutes: 14,
      },
      {
        module: "Lists and keys",
        summary:
          "Why array-index keys are a bug, what 'unique among siblings' means.",
        durationMinutes: 10,
      },
      {
        module: "Forms",
        summary:
          "Controlled vs uncontrolled, when react-hook-form is worth reaching for.",
        durationMinutes: 12,
      },
      {
        module: "Hooks: useReducer, useMemo, useCallback",
        summary:
          "When each is genuinely useful (and when sprinkling it is just noise).",
        durationMinutes: 14,
      },
      {
        module: "Context and prop drilling",
        summary:
          "When context is the right tool — and the perf trap of one giant context.",
        durationMinutes: 11,
      },
      {
        module: "Performance",
        summary:
          "Profile first; React.memo, virtualization, and where premature opt hurts.",
        durationMinutes: 12,
      },
    ],
  },
  {
    slug: "personal-finance-101",
    title: "Personal Finance & Tax (India)",
    summary:
      "Budgets, emergency funds, the old vs new tax regime, SIPs, and insurance you actually need — written for Indian salaries.",
    topics: ["Finance", "Tax", "Investing", "India"],
    category: "business",
    difficulty: "beginner",
    estimatedMinutes: 60,
    contentFile: "personal-finance-101.md",
    quizFile: "quiz-personal-finance-101.json",
    syllabus: [
      { module: "Budgeting", summary: "The 50-30-20 rule and tracking habits that actually stick.", durationMinutes: 10 },
      { module: "Emergency fund", summary: "Why 3–6 months in a liquid account beats any investment.", durationMinutes: 10 },
      { module: "Tax regimes", summary: "Old vs new regime — when each one wins.", durationMinutes: 12 },
      { module: "Investing", summary: "Index funds, SIPs, and the math of compounding.", durationMinutes: 14 },
      { module: "Insurance", summary: "Term + health, not endowment or ULIP.", durationMinutes: 14 },
    ],
  },
  {
    slug: "digital-marketing-101",
    title: "Digital Marketing Fundamentals",
    summary:
      "Funnels, SEO, paid ads, lifecycle email, and the analytics chain that tells you what's working.",
    topics: ["Marketing", "SEO", "Paid Ads", "Email"],
    category: "business",
    difficulty: "intermediate",
    estimatedMinutes: 90,
    contentFile: "digital-marketing-101.md",
    quizFile: "quiz-digital-marketing-101.json",
    syllabus: [
      { module: "Funnel basics", summary: "Awareness → consideration → conversion → retention.", durationMinutes: 16 },
      { module: "SEO", summary: "Technical, on-page, off-page; long-tail intent.", durationMinutes: 18 },
      { module: "Paid ads", summary: "Google vs Meta, the LTV:CAC ratio that matters.", durationMinutes: 18 },
      { module: "Email & lifecycle", summary: "Welcome, abandoned cart, win-back.", durationMinutes: 18 },
      { module: "Analytics", summary: "GA4, attribution models, and honest measurement.", durationMinutes: 20 },
    ],
  },
  {
    slug: "ux-research-101",
    title: "UX Research Basics",
    summary:
      "Five-user interviews, usability tasks, survey design, and the synthesis that converts hours of tape into decisions.",
    topics: ["UX", "Design", "Research", "User Interviews"],
    category: "design",
    difficulty: "intermediate",
    estimatedMinutes: 80,
    contentFile: "ux-research-101.md",
    quizFile: "quiz-ux-research-101.json",
    syllabus: [
      { module: "Why research first", summary: "Replacing 'I think' with 'we observed'.", durationMinutes: 12 },
      { module: "Interview discipline", summary: "Past behaviour, open questions, sitting in silence.", durationMinutes: 18 },
      { module: "Usability testing", summary: "Tasks vs feedback — what to actually run.", durationMinutes: 16 },
      { module: "Survey design", summary: "Leading, double-barrelled, and sampling bias traps.", durationMinutes: 16 },
      { module: "Synthesis", summary: "Affinity mapping and the one-page research report.", durationMinutes: 18 },
    ],
  },
  {
    slug: "visual-design-101",
    title: "Visual Design & Typography",
    summary:
      "Hierarchy, typography, restrained colour, the 8-point grid — the craft signals that separate amateur from professional.",
    topics: ["Design", "Typography", "Visual Design", "UI"],
    category: "design",
    difficulty: "beginner",
    estimatedMinutes: 75,
    contentFile: "visual-design-101.md",
    quizFile: "quiz-visual-design-101.json",
    syllabus: [
      { module: "Hierarchy", summary: "Size, weight, spacing — and why whitespace beats bold.", durationMinutes: 14 },
      { module: "Typography", summary: "Pairing, line height, measure that reads.", durationMinutes: 16 },
      { module: "Colour", summary: "Restrained palettes, WCAG 4.5:1 contrast.", durationMinutes: 14 },
      { module: "Spacing", summary: "The 8-point grid and the rule of proximity.", durationMinutes: 14 },
      { module: "Icons & images", summary: "One family, consistent stroke, modern formats.", durationMinutes: 12 },
    ],
  },
  {
    slug: "business-english-101",
    title: "Business English Communication",
    summary:
      "Write email that gets replied to, run meetings that decide things, present with structure, negotiate without filler words.",
    topics: ["Communication", "English", "Business", "Writing"],
    category: "languages",
    difficulty: "beginner",
    estimatedMinutes: 70,
    contentFile: "business-english-101.md",
    quizFile: "quiz-business-english-101.json",
    syllabus: [
      { module: "Email", summary: "Subject promise, first-line ask, one CTA.", durationMinutes: 12 },
      { module: "Meetings", summary: "Agendas, traffic-light status, decisions + owners.", durationMinutes: 14 },
      { module: "Presenting", summary: "Pyramid principle, three points, plain language.", durationMinutes: 14 },
      { module: "Cross-cultural", summary: "Adapting English for multinational rooms.", durationMinutes: 14 },
      { module: "Negotiation phrases", summary: "Three phrases that punch above their weight.", durationMinutes: 16 },
    ],
  },
  {
    slug: "public-health-101",
    title: "Public Health & First Aid Basics",
    summary:
      "Recognising emergencies, hands-only CPR, wound care, choking, burns, and the public-health basics that prevent illness.",
    topics: ["Health", "First Aid", "CPR", "Public Health"],
    category: "health",
    difficulty: "beginner",
    estimatedMinutes: 65,
    contentFile: "public-health-101.md",
    quizFile: "quiz-public-health-101.json",
    syllabus: [
      { module: "Emergencies", summary: "When to call — chest pain, F.A.S.T., breathing.", durationMinutes: 12 },
      { module: "CPR & AED", summary: "Hands-only CPR at 100–120 per minute.", durationMinutes: 14 },
      { module: "Bleeding & wounds", summary: "Direct pressure, clean rinse, when to escalate.", durationMinutes: 12 },
      { module: "Choking & burns", summary: "Back blows, Heimlich, 20 minutes of running water.", durationMinutes: 12 },
      { module: "Prevention", summary: "Hand washing, vaccination, herd immunity.", durationMinutes: 15 },
    ],
  },
  {
    slug: "mental-health-101",
    title: "Mental Health Literacy",
    summary:
      "Stress, anxiety, depression — what each is, recognising them in yourself, talking to someone struggling, and what actually helps.",
    topics: ["Health", "Mental Health", "Wellbeing"],
    category: "health",
    difficulty: "beginner",
    estimatedMinutes: 70,
    contentFile: "mental-health-101.md",
    quizFile: "quiz-mental-health-101.json",
    syllabus: [
      { module: "Definitions", summary: "Stress vs anxiety vs depression.", durationMinutes: 12 },
      { module: "Recognising signs", summary: "Two-week checklist that warrants attention.", durationMinutes: 12 },
      { module: "Supporting others", summary: "Open questions, three useful sentences, suicide risk.", durationMinutes: 16 },
      { module: "What helps", summary: "Sleep, movement, CBT, medication when needed.", durationMinutes: 16 },
      { module: "Reducing stigma", summary: "At work and at home.", durationMinutes: 14 },
    ],
  },
  {
    slug: "climate-science-101",
    title: "Climate Science Essentials",
    summary:
      "The greenhouse effect, why 1.5°C matters, feedback loops, mitigation leverage points, and adaptation for an Indian context.",
    topics: ["Climate", "Science", "Sustainability", "Policy"],
    category: "science",
    difficulty: "intermediate",
    estimatedMinutes: 85,
    contentFile: "climate-science-101.md",
    quizFile: "quiz-climate-science-101.json",
    syllabus: [
      { module: "Greenhouse effect", summary: "Why Earth is +15°C instead of −18°C.", durationMinutes: 14 },
      { module: "1.5 vs 2°C", summary: "Averages hide tails — extreme weather statistics.", durationMinutes: 16 },
      { module: "Carbon cycle", summary: "Ocean, land, and the long atmospheric tail.", durationMinutes: 16 },
      { module: "Mitigation", summary: "Where decarbonisation leverage is largest.", durationMinutes: 18 },
      { module: "Adaptation in India", summary: "Heat plans, water, vector-borne disease.", durationMinutes: 21 },
    ],
  },
  {
    slug: "public-speaking-101",
    title: "Public Speaking & Storytelling",
    summary:
      "Stage fear, the three-act talk, stories that beat statistics, pacing and silence, Q&A that doesn't collapse.",
    topics: ["Communication", "Public Speaking", "Storytelling", "Soft Skills"],
    category: "soft-skills",
    difficulty: "beginner",
    estimatedMinutes: 80,
    contentFile: "public-speaking-101.md",
    quizFile: "quiz-public-speaking-101.json",
    syllabus: [
      { module: "Stage fear", summary: "Reframing nervousness as excitement.", durationMinutes: 12 },
      { module: "Structure", summary: "Three-act shape and the 90-second opening.", durationMinutes: 14 },
      { module: "Stories", summary: "Person → struggle → turn.", durationMinutes: 16 },
      { module: "Delivery", summary: "Pace, pause, pitch — silence as a tool.", durationMinutes: 18 },
      { module: "Slides", summary: "Cues, not scripts; one idea per slide.", durationMinutes: 8 },
      { module: "Q&A", summary: "Repeat the question; handle hostile asks.", durationMinutes: 12 },
    ],
  },
  {
    slug: "career-craft-101",
    title: "Resume + Interview Craft",
    summary:
      "Resumes that pass the 8-second skim, short cover letters that get read, STAR behavioural answers, and the negotiation lines that work.",
    topics: ["Career", "Resume", "Interview", "Negotiation"],
    category: "soft-skills",
    difficulty: "beginner",
    estimatedMinutes: 90,
    contentFile: "career-craft-101.md",
    quizFile: "quiz-career-craft-101.json",
    syllabus: [
      { module: "Resume", summary: "8-second skim test; quantified bullets.", durationMinutes: 16 },
      { module: "Cover letter", summary: "Under 200 words, three paragraphs, company-specific.", durationMinutes: 14 },
      { module: "Interview prep", summary: "Research, 6–8 stories, your questions.", durationMinutes: 18 },
      { module: "STAR answers", summary: "I vs we; lessons learned.", durationMinutes: 20 },
      { module: "Negotiation", summary: "Anchored numbers, then silence.", durationMinutes: 22 },
    ],
  },
  {
    slug: "sustainable-farming-101",
    title: "Sustainable Farming Practices",
    summary:
      "Soil as ecosystem, drip irrigation, integrated pest management, crop rotation, and the FPO model that lifts smallholder income.",
    topics: ["Agriculture", "Sustainability", "Farming", "India"],
    category: "agriculture",
    difficulty: "intermediate",
    estimatedMinutes: 110,
    contentFile: "sustainable-farming-101.md",
    quizFile: "quiz-sustainable-farming-101.json",
    syllabus: [
      { module: "Soil health", summary: "Cover crops, compost, minimal tillage.", durationMinutes: 20 },
      { module: "Irrigation", summary: "Drip systems, mulching, rainwater harvesting.", durationMinutes: 22 },
      { module: "IPM", summary: "Monitor → prevent → biological → targeted chemical.", durationMinutes: 22 },
      { module: "Crop rotation", summary: "Cereal → legume → oilseed → vegetable.", durationMinutes: 22 },
      { module: "Markets & FPOs", summary: "Why aggregation captures the margin smallholders lose.", durationMinutes: 24 },
    ],
  },
  {
    slug: "ai-literacy-101",
    title: "AI Literacy for Everyone",
    summary:
      "What LLMs actually do, how to catch hallucination, prompting that works, what AI replaces in your job, and privacy you should keep.",
    topics: ["AI", "LLM", "ChatGPT", "Literacy"],
    category: "data-ai",
    difficulty: "beginner",
    estimatedMinutes: 65,
    contentFile: "ai-literacy-101.md",
    quizFile: "quiz-ai-literacy-101.json",
    syllabus: [
      { module: "What LLMs do", summary: "Token prediction, not reasoning.", durationMinutes: 12 },
      { module: "Hallucination", summary: "Catching confident wrongness.", durationMinutes: 12 },
      { module: "Prompting", summary: "Context, audience, format, examples.", durationMinutes: 14 },
      { module: "Jobs", summary: "Tasks change faster than whole roles.", durationMinutes: 14 },
      { module: "Privacy & bias", summary: "What not to paste; auditing for bias.", durationMinutes: 13 },
    ],
  },
]

const BOUNTIES: BountySeed[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    sponsorEmail: "sponsor@demo.pol",
    curriculumSlug: "rust-101",
    title: "Rust Systems Engineering track",
    description:
      "Acme is funding verified Rust completions for engineering students. Master memory-safety and build a functional CLI.",
    rewardInr: 250,
    rewardUsdcMicros: 3_000_000n,
    maxStudents: 100,
    enrolled: 18,
    completed: 7,
    status: "active",
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    sponsorEmail: "grants@web3india.example",
    curriculumSlug: "solidity-101",
    title: "Master Solidity security",
    description:
      "Web3 India is bootstrapping 50 audit-ready Solidity engineers. Complete the curriculum and the anti-cheat verification to get your certification.",
    rewardInr: 400,
    rewardUsdcMicros: 4_800_000n,
    maxStudents: 50,
    enrolled: 11,
    completed: 4,
    status: "active",
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    sponsorEmail: "diversity@kalpataru.example",
    curriculumSlug: "python-data-101",
    title: "Pandas & matplotlib foundations",
    description:
      "Kalpataru is funding 200 women and non-binary learners through hands-on data analysis. Open to all students to upskill in AI.",
    rewardInr: 300,
    rewardUsdcMicros: 3_600_000n,
    maxStudents: 200,
    enrolled: 64,
    completed: 23,
    status: "active",
  },
  {
    id: "00000000-0000-0000-0000-000000000004",
    sponsorEmail: "talent@bluestack.example",
    curriculumSlug: "react-101",
    title: "Ship React applications",
    description:
      "Bluestack is hiring junior React engineers. Complete this curriculum to get a verified credential and open up an interview slot for our latest cohort.",
    rewardInr: 250,
    rewardUsdcMicros: 3_000_000n,
    maxStudents: 150,
    enrolled: 32,
    completed: 9,
    status: "active",
  },
  {
    id: "00000000-0000-0000-0000-000000000005",
    sponsorEmail: "finance@rupeenest.example",
    curriculumSlug: "personal-finance-101",
    title: "Financially literate India",
    description:
      "RupeeNest is funding 1000 young earners through hands-on personal finance. Budgets, tax, SIPs, and term insurance — completion gets you paid and certified.",
    rewardInr: 150,
    rewardUsdcMicros: 1_800_000n,
    maxStudents: 1000,
    enrolled: 312,
    completed: 87,
    status: "active",
  },
  {
    id: "00000000-0000-0000-0000-000000000006",
    sponsorEmail: "creative@palette.example",
    curriculumSlug: "digital-marketing-101",
    title: "Digital marketing for makers",
    description:
      "Palette is sponsoring 80 founders and creators to master the marketing stack — funnels, SEO, paid ads, and email lifecycle.",
    rewardInr: 350,
    rewardUsdcMicros: 4_200_000n,
    maxStudents: 80,
    enrolled: 22,
    completed: 6,
    status: "active",
  },
  {
    id: "00000000-0000-0000-0000-000000000007",
    sponsorEmail: "creative@palette.example",
    curriculumSlug: "ux-research-101",
    title: "Research-led product design",
    description:
      "Palette wants the next generation of Indian designers to start with the user, not the wireframe. Get paid to learn the research basics every product team should share.",
    rewardInr: 400,
    rewardUsdcMicros: 4_800_000n,
    maxStudents: 40,
    enrolled: 11,
    completed: 3,
    status: "active",
  },
  {
    id: "00000000-0000-0000-0000-000000000008",
    sponsorEmail: "creative@palette.example",
    curriculumSlug: "visual-design-101",
    title: "Visual craft fundamentals",
    description:
      "Hierarchy, type, restrained colour, 8-point spacing — the craft signals that separate junior and senior work. Bounty open to all aspiring designers.",
    rewardInr: 300,
    rewardUsdcMicros: 3_600_000n,
    maxStudents: 60,
    enrolled: 18,
    completed: 5,
    status: "active",
  },
  {
    id: "00000000-0000-0000-0000-000000000009",
    sponsorEmail: "english@globalfluency.example",
    curriculumSlug: "business-english-101",
    title: "English for the global workplace",
    description:
      "Global Fluency Council is funding 100 students through workplace-ready English communication — email, meetings, presenting, negotiation. Nearly full.",
    rewardInr: 200,
    rewardUsdcMicros: 2_400_000n,
    maxStudents: 100,
    enrolled: 95,
    completed: 41,
    status: "active",
  },
  {
    id: "00000000-0000-0000-0000-000000000010",
    sponsorEmail: "health@arogyaplus.example",
    curriculumSlug: "public-health-101",
    title: "First aid for every Indian household",
    description:
      "Arogya+ funded 100 community first-aid responders across two states. Bounty closed — fully delivered and paid out.",
    rewardInr: 180,
    rewardUsdcMicros: 2_160_000n,
    maxStudents: 100,
    enrolled: 100,
    completed: 100,
    status: "depleted",
  },
  {
    id: "00000000-0000-0000-0000-000000000011",
    sponsorEmail: "health@arogyaplus.example",
    curriculumSlug: "mental-health-101",
    title: "Mental health literacy for managers",
    description:
      "Arogya+ is funding 120 managers and team leads to recognise warning signs, support struggling colleagues, and reduce stigma at work.",
    rewardInr: 220,
    rewardUsdcMicros: 2_640_000n,
    maxStudents: 120,
    enrolled: 38,
    completed: 12,
    status: "active",
  },
  {
    id: "00000000-0000-0000-0000-000000000012",
    sponsorEmail: "climate@greenstack.example",
    curriculumSlug: "climate-science-101",
    title: "Climate literacy for India 2030",
    description:
      "Greenstack is bootstrapping 60 climate-literate professionals across NGOs, journalism, and policy. Strong on the science; strongest on adaptation for India.",
    rewardInr: 275,
    rewardUsdcMicros: 3_300_000n,
    maxStudents: 60,
    enrolled: 14,
    completed: 4,
    status: "active",
  },
  {
    id: "00000000-0000-0000-0000-000000000013",
    sponsorEmail: "careers@brightpath.example",
    curriculumSlug: "public-speaking-101",
    title: "Speak with confidence",
    description:
      "BrightPath is funding 80 students through the public-speaking curriculum — structure, storytelling, pace, Q&A. Recommended before our interview-prep track.",
    rewardInr: 250,
    rewardUsdcMicros: 3_000_000n,
    maxStudents: 80,
    enrolled: 47,
    completed: 18,
    status: "active",
  },
  {
    id: "00000000-0000-0000-0000-000000000014",
    sponsorEmail: "careers@brightpath.example",
    curriculumSlug: "career-craft-101",
    title: "Career craft for the first interview",
    description:
      "BrightPath is hiring junior roles directly from this cohort. Complete the resume, cover letter, STAR-answer, and negotiation curriculum to qualify.",
    rewardInr: 300,
    rewardUsdcMicros: 3_600_000n,
    maxStudents: 100,
    enrolled: 28,
    completed: 9,
    status: "active",
  },
  {
    id: "00000000-0000-0000-0000-000000000015",
    sponsorEmail: "agri@harvestsetu.example",
    curriculumSlug: "sustainable-farming-101",
    title: "Sustainable farming for smallholders",
    description:
      "HarvestSetu is funding 50 smallholders and FPO members through soil health, water-smart irrigation, IPM, and FPO formation. Premium reward reflects 110-minute depth.",
    rewardInr: 450,
    rewardUsdcMicros: 5_400_000n,
    maxStudents: 50,
    enrolled: 19,
    completed: 5,
    status: "active",
  },
  {
    id: "00000000-0000-0000-0000-000000000016",
    sponsorEmail: "ai@futurelens.example",
    curriculumSlug: "ai-literacy-101",
    title: "AI literacy for non-engineers",
    description:
      "FutureLens is sponsoring 30 professionals across law, medicine, journalism, and education to use AI well — and avoid the failure modes that matter in their fields.",
    rewardInr: 600,
    rewardUsdcMicros: 7_200_000n,
    maxStudents: 30,
    enrolled: 7,
    completed: 2,
    status: "active",
  },
]

async function main() {
  console.log("🌱 Seeding database...")

  const passwordHash = await bcrypt.hash("demo1234", 10)

  // Sponsors
  const sponsorsByEmail = new Map<string, { sponsorId: string; userId: string }>()
  for (const s of SPONSORS) {
    const u = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        email: s.email,
        passwordHash,
        name: s.name,
        role: "sponsor",
        sponsor: {
          create: {
            organizationName: s.organizationName,
            websiteUrl: s.websiteUrl,
          },
        },
      },
      include: { sponsor: true },
    })
    if (!u.sponsor) throw new Error(`Sponsor profile missing for ${s.email}`)
    sponsorsByEmail.set(s.email, { sponsorId: u.sponsor.id, userId: u.id })
  }

  // Demo student
  const studentUser = await prisma.user.upsert({
    where: { email: "student@demo.pol" },
    update: {},
    create: {
      email: "student@demo.pol",
      passwordHash,
      name: "Aarav Sharma",
      role: "student",
      studentProfile: {
        create: { upiId: "aarav@upi" },
      },
    },
  })

  // Curricula + chunks + question banks
  const curriculaBySlug = new Map<string, string>()
  for (const c of CURRICULA) {
    const cur = await prisma.curriculum.upsert({
      where: { slug: c.slug },
      update: {
        title: c.title,
        summary: c.summary,
        topics: c.topics,
        category: c.category,
        difficulty: c.difficulty,
        syllabus: c.syllabus as unknown as object,
        estimatedMinutes: c.estimatedMinutes,
      },
      create: {
        slug: c.slug,
        title: c.title,
        summary: c.summary,
        topics: c.topics,
        category: c.category,
        difficulty: c.difficulty,
        syllabus: c.syllabus as unknown as object,
        estimatedMinutes: c.estimatedMinutes,
        thumbnailUrl: null,
      },
    })
    curriculaBySlug.set(c.slug, cur.id)

    const contentPath = resolve(__dirname, "../src/content", c.contentFile)
    const chunks = await ingestCurriculumContent(cur.id, contentPath)

    const quizPath = resolve(__dirname, "../src/content", c.quizFile)
    const questions = await ingestQuestionBank(cur.id, quizPath)

    console.log(`   • ${c.title}: ${chunks} chunks, ${questions} questions`)
  }

  // Bounties
  for (const b of BOUNTIES) {
    const sp = sponsorsByEmail.get(b.sponsorEmail)
    const curriculumId = curriculaBySlug.get(b.curriculumSlug)
    if (!sp || !curriculumId) {
      throw new Error(`Bounty ${b.id} references missing sponsor or curriculum`)
    }
    const totalDeposit = b.rewardUsdcMicros * BigInt(b.maxStudents)
    const remaining = b.rewardUsdcMicros * BigInt(b.maxStudents - b.completed)
    await prisma.bounty.upsert({
      where: { id: b.id },
      update: {
        title: b.title,
        description: b.description,
        rewardInr: b.rewardInr,
        rewardUsdcMicros: b.rewardUsdcMicros,
        maxStudents: b.maxStudents,
        enrolled: b.enrolled,
        completed: b.completed,
        totalDepositMicros: totalDeposit,
        remainingMicros: remaining,
        status: b.status,
      },
      create: {
        id: b.id,
        sponsorId: sp.sponsorId,
        curriculumId,
        title: b.title,
        description: b.description,
        rewardInr: b.rewardInr,
        rewardUsdcMicros: b.rewardUsdcMicros,
        maxStudents: b.maxStudents,
        enrolled: b.enrolled,
        completed: b.completed,
        totalDepositMicros: totalDeposit,
        remainingMicros: remaining,
        status: b.status,
      },
    })
  }

  // ─── Showcase completions ───────────────────────────────────────────────
  // Pre-passed enrollments that populate /verify, /recruit, and
  // /credentials/[address] so a fresh install isn't an empty room.
  const showcaseCount = await seedShowcaseCompletions({
    sponsorsByEmail,
    curriculaBySlug,
    passwordHash,
  })

  console.log("✅ Seeded:")
  console.log(`   Sponsor: sponsor@demo.pol / demo1234`)
  console.log(`   Student: student@demo.pol / demo1234`)
  console.log(`   ${SPONSORS.length} sponsors · ${CURRICULA.length} curricula · ${BOUNTIES.length} bounties`)
  console.log(`   ${showcaseCount} showcase credentials minted`)
  console.log(`   Demo studentUser.id=${studentUser.id}`)
}

// ─── Showcase data ─────────────────────────────────────────────────────────

type ShowcasePersona = {
  email: string
  name: string
  upi: string
  curriculumSlug: string
  bountyId: string
  scorePct: number
  daysAgo: number
  durationMinutes: number
}

const SHOWCASE_PERSONAS: ShowcasePersona[] = [
  {
    email: "anuj.r@learners.pol",
    name: "Anuj Reddy",
    upi: "anuj@upi",
    curriculumSlug: "solidity-101",
    bountyId: "00000000-0000-0000-0000-000000000002",
    scorePct: 92,
    daysAgo: 1,
    durationMinutes: 47,
  },
  {
    email: "priya.iyer@learners.pol",
    name: "Priya Iyer",
    upi: "priya@upi",
    curriculumSlug: "python-data-101",
    bountyId: "00000000-0000-0000-0000-000000000003",
    scorePct: 88,
    daysAgo: 2,
    durationMinutes: 53,
  },
  {
    email: "vikram.s@learners.pol",
    name: "Vikram Singh",
    upi: "vikram@upi",
    curriculumSlug: "rust-101",
    bountyId: "00000000-0000-0000-0000-000000000001",
    scorePct: 76,
    daysAgo: 3,
    durationMinutes: 71,
  },
  {
    email: "kavya.n@learners.pol",
    name: "Kavya Nair",
    upi: "kavya@upi",
    curriculumSlug: "react-101",
    bountyId: "00000000-0000-0000-0000-000000000004",
    scorePct: 80,
    daysAgo: 4,
    durationMinutes: 39,
  },
  {
    email: "arjun.m@learners.pol",
    name: "Arjun Menon",
    upi: "arjun@upi",
    curriculumSlug: "solidity-101",
    bountyId: "00000000-0000-0000-0000-000000000002",
    scorePct: 84,
    daysAgo: 5,
    durationMinutes: 58,
  },
  {
    email: "sneha.k@learners.pol",
    name: "Sneha Krishnan",
    upi: "sneha@upi",
    curriculumSlug: "python-data-101",
    bountyId: "00000000-0000-0000-0000-000000000003",
    scorePct: 96,
    daysAgo: 6,
    durationMinutes: 42,
  },
  {
    email: "rohit.b@learners.pol",
    name: "Rohit Bose",
    upi: "rohit@upi",
    curriculumSlug: "react-101",
    bountyId: "00000000-0000-0000-0000-000000000004",
    scorePct: 68,
    daysAgo: 8,
    durationMinutes: 64,
  },
  {
    email: "meera.p@learners.pol",
    name: "Meera Pillai",
    upi: "meera@upi",
    curriculumSlug: "rust-101",
    bountyId: "00000000-0000-0000-0000-000000000001",
    scorePct: 82,
    daysAgo: 11,
    durationMinutes: 88,
  },
]

// Deterministic-looking values so reseeds produce identical credentials
// (good for sharing /verify links across teammates).
function pseudoTxHash(seed: string): string {
  let h = ""
  let s = seed
  for (let i = 0; i < 8; i++) {
    s = `${s}:${i}`
    let acc = 0
    for (let j = 0; j < s.length; j++) acc = (acc * 33 + s.charCodeAt(j)) >>> 0
    h += acc.toString(16).padStart(8, "0")
  }
  return `0x${h}`
}

function pseudoAddress(seed: string): string {
  return `0x${pseudoTxHash(seed).slice(2, 42)}`
}

async function seedShowcaseCompletions(deps: {
  sponsorsByEmail: Map<string, { sponsorId: string; userId: string }>
  curriculaBySlug: Map<string, string>
  passwordHash: string
}): Promise<number> {
  let minted = 0

  for (const p of SHOWCASE_PERSONAS) {
    const curriculumId = deps.curriculaBySlug.get(p.curriculumSlug)
    if (!curriculumId) continue

    // Persona user + enrollment.
    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: {},
      create: {
        email: p.email,
        passwordHash: deps.passwordHash,
        name: p.name,
        role: "student",
        studentProfile: { create: { upiId: p.upi, totalEarnedInr: 0 } },
      },
    })

    const completedAt = new Date(Date.now() - p.daysAgo * 24 * 60 * 60 * 1000)
    const startedAt = new Date(
      completedAt.getTime() - p.durationMinutes * 60 * 1000,
    )

    const enrollment = await prisma.enrollment.upsert({
      where: {
        studentId_bountyId: { studentId: user.id, bountyId: p.bountyId },
      },
      update: {
        status: "completed",
        progressPct: 100,
        startedAt,
        completedAt,
      },
      create: {
        studentId: user.id,
        bountyId: p.bountyId,
        status: "completed",
        progressPct: 100,
        startedAt,
        completedAt,
      },
    })

    // Pick 5 random questions for the session record.
    const questions = await prisma.question.findMany({
      where: { curriculumId },
      take: 5,
      select: { id: true, correctIndex: true },
    })
    if (questions.length < 5) continue

    // Build an answers payload that matches the score: round(scorePct/20)
    // correct out of 5.
    const correctCount = Math.round((p.scorePct / 100) * questions.length)
    const answers = questions.map((q, i) => ({
      questionId: q.id,
      choiceIndex: i < correctCount ? q.correctIndex : (q.correctIndex + 1) % 4,
    }))

    // Idempotent: clear prior showcase sessions for this enrollment.
    await prisma.quizSession.deleteMany({
      where: { enrollmentId: enrollment.id },
    })

    const session = await prisma.quizSession.create({
      data: {
        enrollmentId: enrollment.id,
        studentId: user.id,
        status: "passed",
        questionIds: questions.map((q) => q.id),
        answers: answers as unknown as Prisma.InputJsonValue,
        scorePct: p.scorePct,
        passed: true,
        startedAt,
        expiresAt: new Date(startedAt.getTime() + 8 * 60 * 1000),
        submittedAt: completedAt,
      },
    })

    // On-chain proof — deterministic tx hash so /verify links are stable.
    const studentAddress = pseudoAddress(`addr:${user.id}`)
    const txHash = pseudoTxHash(`tx:${enrollment.id}:${session.id}`)
    const scoreHash = pseudoTxHash(`score:${user.id}:${session.id}:${p.scorePct}`)

    await prisma.onchainProof.deleteMany({
      where: { enrollmentId: enrollment.id },
    })
    await prisma.onchainProof.create({
      data: {
        enrollmentId: enrollment.id,
        curriculumId,
        studentAddress,
        scoreHash,
        txHash,
        tokenId: String(1000 + minted),
        status: "minted",
        createdAt: completedAt,
        mintedAt: completedAt,
      },
    })

    // Confirmed payout — feeds the dashboard "paid" totals.
    const bounty = await prisma.bounty.findUnique({ where: { id: p.bountyId } })
    if (bounty) {
      await prisma.payout.deleteMany({
        where: { enrollmentId: enrollment.id },
      })
      await prisma.payout.create({
        data: {
          studentId: user.id,
          enrollmentId: enrollment.id,
          amountInr: bounty.rewardInr,
          status: "confirmed",
          upiId: p.upi,
          idempotencyKey: `showcase:${enrollment.id}`,
          createdAt: completedAt,
          sentAt: completedAt,
          confirmedAt: completedAt,
        },
      })

      // Reflect this completion in the bounty + student totals.
      await prisma.studentProfile.update({
        where: { userId: user.id },
        data: { totalEarnedInr: bounty.rewardInr },
      })
    }

    minted += 1
  }

  return minted
}

async function ingestQuestionBank(
  curriculumId: string,
  filePath: string,
): Promise<number> {
  type Q = {
    topic: string
    difficulty: number
    prompt: string
    choices: string[]
    correctIndex: number
  }
  const items = JSON.parse(readFileSync(filePath, "utf8")) as Q[]
  await prisma.$transaction([
    prisma.question.deleteMany({ where: { curriculumId } }),
    prisma.question.createMany({
      data: items.map((q) => ({
        curriculumId,
        prompt: q.prompt,
        choices: q.choices,
        correctIndex: q.correctIndex,
        difficulty: q.difficulty,
        topic: q.topic,
      })),
    }),
  ])
  return items.length
}

// Inline ingest — Prisma seed runs outside the API src/ rootDir, so we can't
// import services here without complicating the build. Keep this small and
// duplicated rather than reaching across the boundary.
async function ingestCurriculumContent(
  curriculumId: string,
  filePath: string,
): Promise<number> {
  const raw = readFileSync(filePath, "utf8")
  const fmMatch = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/)
  const body = fmMatch ? fmMatch[2] : raw

  const sections = body.split(/^# /m).filter((s) => s.trim().length > 0)
  const chunks: { index: number; topic: string; content: string }[] = []
  let idx = 0

  for (const section of sections) {
    const [headingLine, ...rest] = section.split(/\r?\n/)
    const topic = headingLine.trim()
    const text = rest.join("\n").trim()
    if (!text) continue

    const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
    let buf = ""
    for (const p of paragraphs) {
      if (buf.length + p.length + 1 > 1100 && buf.length > 0) {
        chunks.push({ index: idx++, topic, content: buf.replace(/\s+/g, " ").trim() })
        buf = ""
      }
      buf = buf ? `${buf}\n\n${p}` : p
    }
    if (buf.length > 0) {
      chunks.push({ index: idx++, topic, content: buf.replace(/\s+/g, " ").trim() })
    }
  }

  await prisma.curriculumChunk.deleteMany({ where: { curriculumId } })
  await prisma.curriculumChunk.createMany({
    data: chunks.map((c) => ({
      curriculumId,
      chunkIndex: c.index,
      content: `${c.topic}\n\n${c.content}`,
      source: `${curriculumId.slice(0, 8)}#${c.topic.toLowerCase().replace(/\s+/g, "-")}`,
      pageNumber: c.index + 1,
    })),
  })

  // Compute + write embeddings. Local model — first call downloads ~25MB.
  const inserted = await prisma.curriculumChunk.findMany({
    where: { curriculumId },
    orderBy: { chunkIndex: "asc" },
    select: { id: true, content: true },
  })
  const vectors = await embedAll(inserted.map((r) => r.content))
  for (let i = 0; i < inserted.length; i++) {
    const row = inserted[i]!
    const vec = vectors[i]!
    await prisma.$executeRaw(Prisma.sql`
      UPDATE "CurriculumChunk"
      SET embedding = ${toPgvectorLiteral(vec)}::vector
      WHERE id = ${row.id}
    `)
  }

  return chunks.length
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
