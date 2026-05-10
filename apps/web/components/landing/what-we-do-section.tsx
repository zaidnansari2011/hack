"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"

import { ease } from "@/lib/motion"

const TENETS = [
  {
    n: "01",
    headline: "Money should follow learning, not the other way around.",
    body:
      "Sponsors deposit funds before anyone enrols. The pool releases exactly one payout per verified completion. Not per sign-up, not per self-reported badge. No guesswork on either side.",
  },
  {
    n: "02",
    headline: "If you can't see the proof, it isn't proof.",
    body:
      "Every passed quiz puts a public record on Base and mints a credential to the student's wallet. It's not a certificate someone issued. It's a hash anyone can recompute. That's the difference.",
  },
  {
    n: "03",
    headline: "Get the rupee to UPI before the celebration ends.",
    body:
      "The rupees arrive via UPI in seconds, not days. The on-chain record and the payment fire from the same pipeline — the student gets paid before they've switched tabs.",
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
        Learning should pay out the way finance does: on verified facts, not
        vibes. What settles between a sponsor and a student should be as clear
        as what settles between two banks.
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
