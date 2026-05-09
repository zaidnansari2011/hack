"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"

import { ease } from "@/lib/motion"

const TENETS = [
  {
    n: "01",
    headline: "Money should follow learning, not the other way around.",
    body:
      "Sponsors deposit USDC into per-bounty escrow before a single student enrolls. The pool releases one student-sized payout per verified completion — never speculatively, never on a self-reported badge.",
  },
  {
    n: "02",
    headline: "If you can't see the proof, it isn't proof.",
    body:
      "Every passed quiz emits a public LearningVerified event on Base and mints a soulbound credential to the student's wallet. The hash is the receipt, the receipt is the credential, the credential is the audit trail.",
  },
  {
    n: "03",
    headline: "Get the rupee to UPI before the celebration ends.",
    body:
      "INR settles via Razorpay UPI in seconds — not days. The on-chain event and the off-chain payout fire from the same pipeline so the student feels one moment, not a queue.",
  },
] as const

export function WhatWeDoSection() {
  return (
    <section
      id="manifesto"
      className="relative isolate border-t border-rule bg-paper-deep/40"
    >
      <div className="mx-auto w-[min(1240px,94vw)] py-24 lg:py-32">
        <Header />
        <ol className="mt-16 grid gap-px overflow-hidden rounded-md border border-rule bg-rule lg:grid-cols-3">
          {TENETS.map((t, i) => (
            <Tenet key={t.n} tenet={t} index={i} />
          ))}
        </ol>
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
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, ease: ease.outQuart }}
      className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:items-end lg:gap-20"
    >
      <div>
        <div className="eyebrow eyebrow-tick">Manifesto</div>
        <h2 className="display-lg mt-5 text-balance text-ink">
          Three rules. <span className="display-italic text-teal">No exceptions.</span>
        </h2>
      </div>
      <p className="text-balance text-[1.0625rem] leading-relaxed text-ink-muted">
        We treat education like a financial primitive. The same standards we
        expect from clearing systems — deterministic settlement, public
        receipts, no creative accounting — should apply to learning rewards.
      </p>
    </motion.div>
  )
}

function Tenet({
  tenet,
  index,
}: {
  tenet: (typeof TENETS)[number]
  index: number
}) {
  const ref = useRef<HTMLLIElement | null>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })

  return (
    <motion.li
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: ease.outQuart, delay: index * 0.08 }}
      className="group relative bg-surface p-8 lg:p-10"
    >
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[0.75rem] font-semibold uppercase tracking-[0.22em] text-ink-faint">
          {tenet.n}
        </span>
        <span className="h-px w-10 bg-rule transition-all duration-700 ease-out-quart group-hover:w-20 group-hover:bg-terracotta" />
      </div>
      <h3 className="display-md mt-7 text-balance text-ink">
        {tenet.headline}
      </h3>
      <p className="mt-5 text-[0.9375rem] leading-relaxed text-ink-muted">
        {tenet.body}
      </p>
    </motion.li>
  )
}
