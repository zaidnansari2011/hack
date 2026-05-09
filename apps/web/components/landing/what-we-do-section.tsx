"use client"

import { motion } from "framer-motion"
import { GraduationCap, BriefcaseBusiness, Check } from "lucide-react"

const studentPoints = [
  "Free, adaptive AI tutor trained on the full curriculum",
  "Guaranteed USDC micro-rewards for every verified milestone",
  "Programmable Circle wallet — no prior crypto experience needed",
  "Transcripts and receipts retained for portfolio review",
]

const sponsorPoints = [
  "Escrow-backed bounties with full spend visibility",
  "Pay only for verified, anti-cheat-proof completions",
  "Cohort analytics: completion velocity, cost per pass, drop-off",
  "Open-source Solidity contracts, audited and live on Base",
]

export function WhatWeDoSection() {
  return (
    <section id="sides" className="px-4 py-24 md:px-8 md:py-32">
      <div className="mx-auto w-[min(1200px,92vw)]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl"
        >
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
            Built For Both Sides
          </p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
            One protocol, two aligned incentives.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600 md:text-lg">
            Students learn for real rewards. Sponsors fund measurable outcomes. The protocol keeps
            both sides honest — without intermediaries.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-5 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-3xl border border-slate-200 bg-white p-10"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-900">
                <GraduationCap className="size-5" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                For Students
              </p>
            </div>
            <h3 className="mt-7 text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
              Learn freely. Earn real value.
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              A guided path from first lesson to first payout, with nothing to sign up, pay, or
              install beyond your browser.
            </p>
            <ul className="mt-8 space-y-4">
              {studentPoints.map((point) => (
                <li key={point} className="flex gap-3 text-sm text-slate-700">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-slate-50 text-slate-900">
                    <Check className="size-3" />
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-3xl border border-slate-900 bg-slate-950 p-10 text-white"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-slate-700 to-transparent" />
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-white">
                <BriefcaseBusiness className="size-5" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                For Sponsors
              </p>
            </div>
            <h3 className="mt-7 text-2xl font-semibold tracking-tight md:text-3xl">
              Fund outcomes. Not clicks.
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              Deposit USDC into escrow, define the curriculum and the bounty, and let the protocol
              disburse only against verified completions.
            </p>
            <ul className="mt-8 space-y-4">
              {sponsorPoints.map((point) => (
                <li key={point} className="flex gap-3 text-sm text-slate-200">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-white">
                    <Check className="size-3" />
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </motion.div>
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
