"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"

import { ease } from "@/lib/motion"

const STEPS = [
  {
    n: "01",
    label: "Fund",
    title: "Sponsor deposits into escrow.",
    body:
      "A sponsor signs once: rewardPerStudent × maxStudents in USDC, locked in the ProofOfLearnEscrow contract on Base. The contract holds it until a verifier signs off, or the sponsor calls refund.",
    detail: "depositBounty(bountyId, curriculumHash, ...)",
  },
  {
    n: "02",
    label: "Learn",
    title: "An AI tutor grounded in real curriculum.",
    body:
      "Students ask questions; retrieval pulls the relevant chunks from pgvector + full-text search. Groq Llama 3.1 generates the answer — every claim cited back to a numbered section.",
    detail: "POST /tutor/messages — RAG over curriculum chunks",
  },
  {
    n: "03",
    label: "Verify",
    title: "Anti-cheat quiz, scored server-side.",
    body:
      "Five randomized MCQs from a topic-balanced bank. Per-session shuffle salt, browser fingerprint capture, single submission, time-bounded session. Sixty percent passes.",
    detail: "deterministic Fisher-Yates over a SHA-256 keystream",
  },
  {
    n: "04",
    label: "Settle",
    title: "₹ to UPI, proof to chain.",
    body:
      "On pass, the verifier triggers releasePayout() and mints a soulbound LearnCredential. In parallel, Razorpay X UPI sends the rupees to the student's bank in seconds.",
    detail: "LearningVerified · CredentialMinted · Razorpay payout",
  },
] as const

export function LearningTimeline() {
  return (
    <section
      id="methodology"
      className="relative isolate"
    >
      <div className="mx-auto w-[min(1240px,94vw)] py-24 lg:py-32">
        <Header />
        <div className="mt-16 grid gap-12 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
          <Diagram />
          <ol className="space-y-10 lg:space-y-12">
            {STEPS.map((s, i) => (
              <Step key={s.n} step={s} index={i} />
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

function Header() {
  const ref = useRef<HTMLDivElement | null>(null)
  const inView = useInView(ref, { once: true, amount: 0.3 })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 22 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, ease: ease.outQuart }}
    >
      <div className="eyebrow eyebrow-tick">Methodology</div>
      <h2 className="display-lg mt-5 max-w-[20ch] text-balance text-ink">
        From an empty bounty to a verified rupee —{" "}
        <span className="display-italic text-teal">in four steps.</span>
      </h2>
    </motion.div>
  )
}

function Step({
  step,
  index,
}: {
  step: (typeof STEPS)[number]
  index: number
}) {
  const ref = useRef<HTMLLIElement | null>(null)
  const inView = useInView(ref, { once: true, amount: 0.5 })

  return (
    <motion.li
      ref={ref}
      initial={{ opacity: 0, y: 22 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.75, ease: ease.outQuart, delay: index * 0.05 }}
      className="group relative grid gap-4 border-l border-rule pl-7 lg:grid-cols-[auto_1fr] lg:gap-8 lg:border-l-0 lg:pl-0"
    >
      <div className="flex items-baseline gap-3 lg:flex-col lg:items-start lg:gap-1.5">
        <span className="font-mono text-[0.75rem] font-semibold uppercase tracking-[0.22em] text-ink-faint">
          {step.n}
        </span>
        <span className="font-display text-[1.5rem] font-medium tracking-tight text-teal">
          {step.label}
        </span>
      </div>
      <div>
        <h3 className="display-md text-balance text-ink">{step.title}</h3>
        <p className="mt-3 max-w-[58ch] text-[0.9375rem] leading-relaxed text-ink-muted">
          {step.body}
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-sm border border-rule bg-surface-soft px-3 py-1.5 font-mono text-[0.75rem] text-ink-muted">
          <span className="text-ink-faint">›</span>
          {step.detail}
        </div>
      </div>
    </motion.li>
  )
}

/**
 * A small SVG diagram that animates a flow from the sponsor → escrow →
 * student → chain. Hand-drawn lines, register marks at corners.
 */
function Diagram() {
  const ref = useRef<HTMLDivElement | null>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 1, ease: ease.outQuart }}
      className="surface-paper paper-grain sticky top-24 hidden h-fit overflow-hidden rounded-md p-6 lg:block"
    >
      <div className="flex items-center justify-between border-b border-rule pb-3">
        <span className="eyebrow eyebrow-tick text-[0.625rem]">Schematic</span>
        <span className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-ink-faint">
          fig. 01
        </span>
      </div>
      <svg viewBox="0 0 336 380" className="mt-4 h-auto w-full">
        <defs>
          <marker
            id="arrowhead"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M0,0 L0,10 L10,5 z" fill="hsl(var(--ink))" />
          </marker>
        </defs>

        {/* Sponsor box */}
        <DiagramNode x={20} y={20} w={120} label="Sponsor" sub="sign once" />
        {/* Escrow */}
        <DiagramNode
          x={180}
          y={20}
          w={120}
          label="Escrow"
          sub="ETH / USDC"
          accent
        />
        {/* Student */}
        <DiagramNode x={20} y={150} w={120} label="Student" sub="enrolls + learns" />
        {/* Quiz */}
        <DiagramNode
          x={180}
          y={150}
          w={120}
          label="Quiz"
          sub="anti-cheat"
        />
        {/* Chain proof */}
        <DiagramNode
          x={20}
          y={280}
          w={120}
          label="Chain proof"
          sub="LearningVerified"
          accent
        />
        {/* UPI payout */}
        <DiagramNode
          x={180}
          y={280}
          w={120}
          label="UPI"
          sub="₹ in seconds"
        />

        {/* Arrows */}
        {/* Sponsor → Escrow */}
        <Arrow d="M 140 50 L 180 50" inView={inView} delay={0.3} />
        {/* Sponsor → Student */}
        <Arrow d="M 80 80 L 80 150" inView={inView} delay={0.5} />
        {/* Student → Quiz */}
        <Arrow d="M 140 180 L 180 180" inView={inView} delay={0.7} />
        {/* Escrow → below-Quiz row (routed outside right edge, avoiding Quiz box) */}
        <Arrow d="M 300 50 L 316 50 L 316 250 L 240 250" inView={inView} delay={0.5} />
        {/* Quiz bottom → gap between rows → Chain proof (routes below Quiz, not through it) */}
        <Arrow d="M 240 210 L 240 250 L 80 250 L 80 280" inView={inView} delay={0.9} />
        {/* Chain proof → UPI */}
        <Arrow d="M 140 310 L 180 310" inView={inView} delay={1.1} />
      </svg>

      <div className="mt-4 border-t border-rule pt-4 text-[0.6875rem] uppercase tracking-[0.18em] text-ink-faint">
        <p>Read top-to-bottom · Two parallel settlements</p>
      </div>
    </motion.div>
  )
}

function DiagramNode({
  x,
  y,
  w,
  label,
  sub,
  accent,
}: {
  x: number
  y: number
  w: number
  label: string
  sub: string
  accent?: boolean
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={60}
        rx={4}
        fill={accent ? "hsl(var(--teal-tint))" : "hsl(var(--surface))"}
        stroke="hsl(var(--rule))"
        strokeWidth="1"
      />
      <text
        x={x + 12}
        y={y + 24}
        fontFamily="var(--font-display)"
        fontSize="14"
        fontWeight="500"
        fill={accent ? "hsl(var(--teal))" : "hsl(var(--ink))"}
      >
        {label}
      </text>
      <text
        x={x + 12}
        y={y + 44}
        fontFamily="var(--font-mono)"
        fontSize="9"
        letterSpacing="0.5"
        fill="hsl(var(--ink-faint))"
      >
        {sub.toUpperCase()}
      </text>
    </g>
  )
}

function Arrow({
  d,
  inView,
  delay,
}: {
  d: string
  inView: boolean
  delay: number
}) {
  return (
    <motion.path
      d={d}
      fill="none"
      stroke="hsl(var(--ink))"
      strokeWidth="1"
      strokeDasharray="3 3"
      markerEnd="url(#arrowhead)"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={inView ? { pathLength: 1, opacity: 1 } : {}}
      transition={{ duration: 0.9, ease: ease.outQuart, delay }}
    />
  )
}
