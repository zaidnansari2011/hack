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
]

const CURRICULA: CurriculumSeed[] = [
  {
    slug: "rust-101",
    title: "Rust Foundations",
    summary:
      "Memory safety without a garbage collector. Learn ownership, borrowing, lifetimes, and build your first CLI.",
    topics: ["Ownership", "Borrowing", "Lifetimes", "Traits", "Error handling"],
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
    topics: ["Storage", "Visibility", "Reentrancy", "Events", "ERC standards", "Foundry"],
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
    topics: ["DataFrames", "Cleaning", "Group-by", "Visualization", "Time series"],
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
    topics: ["Components", "State", "Effects", "Hooks", "Performance"],
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
]

const BOUNTIES: BountySeed[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    sponsorEmail: "sponsor@demo.pol",
    curriculumSlug: "rust-101",
    title: "Learn Rust, earn ₹250",
    description:
      "Acme is funding 100 verified Rust completions for engineering students. Pass the quiz, get ₹250 to your UPI in seconds.",
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
    title: "Master Solidity security, earn ₹400",
    description:
      "Web3 India is bootstrapping 50 audit-ready Solidity engineers. Complete the curriculum and the anti-cheat quiz to unlock ₹400 — one of our highest payouts.",
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
    title: "Pandas & matplotlib, earn ₹300",
    description:
      "Kalpataru is funding 200 women and non-binary learners through hands-on data analysis. Open to all — funded for the first 200.",
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
    title: "Ship React, earn ₹250",
    description:
      "Bluestack is hiring junior React engineers. Complete this curriculum to earn ₹250 and an interview slot — a verified credential is worth more than a resume line.",
    rewardInr: 250,
    rewardUsdcMicros: 3_000_000n,
    maxStudents: 150,
    enrolled: 32,
    completed: 9,
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
        syllabus: c.syllabus as unknown as object,
        estimatedMinutes: c.estimatedMinutes,
      },
      create: {
        slug: c.slug,
        title: c.title,
        summary: c.summary,
        topics: c.topics,
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
