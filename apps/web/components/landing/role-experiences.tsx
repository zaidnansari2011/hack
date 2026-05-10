"use client"

import Link from "next/link"
import { motion, useInView } from "framer-motion"
import { useRef } from "react"

import { ease } from "@/lib/motion"

const ROLES = [
  {
    tag: "01 / Sponsor",
    eyebrow: "For companies funding learning",
    title: "Make the rupee follow the proof.",
    body:
      "Open a bounty in under a minute: pick a curriculum, set per-student reward and seat cap, fund the escrow on Base. The contract releases one payout per verified completion. Never speculatively, never to a no-show.",
    proofs: [
      "Per-bounty USDC escrow with refundable balance",
      "BaseScan-linked tx hash on every release",
      "Seat-cap and remaining-balance enforced on-chain",
    ],
    cta: { label: "Open the sponsor portal", href: "/dashboard" },
  },
  {
    tag: "02 / Student",
    eyebrow: "For learners who want guaranteed reward",
    title: "Learn the thing. Earn the rupee. Walk with the credential.",
    body:
      "An AI tutor walks you through curriculum chunks with citations. When you're ready, take the anti-cheat quiz. Pass with sixty percent and your INR lands in UPI in seconds. Plus a soulbound credential to your wallet.",
    proofs: [
      "Tutor answers grounded in real curriculum chunks",
      "Soulbound credential, non-transferable",
      "INR settles via Razorpay UPI in seconds",
    ],
    cta: { label: "Browse active bounties", href: "/learn" },
  },
] as const

export function RoleExperiences() {
  return (
    <section
      id="roles"
      className="relative isolate"
    >
      <div className="mx-auto w-[min(1240px,94vw)] py-24 lg:py-32">
        <Header />
        <div className="mt-16 grid gap-px overflow-hidden rounded-md border border-rule bg-rule lg:grid-cols-2">
          {ROLES.map((r, i) => (
            <RoleCard key={r.tag} role={r} index={i} />
          ))}
        </div>
        <CTA />
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
      transition={{ duration: 0.85, ease: ease.outQuart }}
      className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-end lg:gap-16"
    >
      <div>
        <div className="eyebrow eyebrow-tick">Roles</div>
        <h2 className="display-lg mt-5 text-balance text-ink">
          Two surfaces.{" "}
          <span className="display-italic text-teal">One protocol underneath.</span>
        </h2>
      </div>
      <p className="text-balance text-[1.0625rem] leading-relaxed text-ink-muted">
        Sponsors and students see different views of the same shared state.
        Funds, bounties, completions, payouts. Every record is one row away
        from the public on-chain event that proves it.
      </p>
    </motion.div>
  )
}

function RoleCard({
  role,
  index,
}: {
  role: (typeof ROLES)[number]
  index: number
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.75, ease: ease.outQuart, delay: index * 0.08 }}
      className="group relative bg-surface p-9 lg:p-12"
    >
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-ink-faint">
          {role.tag}
        </span>
        <span className="h-px w-12 bg-rule transition-all duration-700 ease-out-quart group-hover:w-24 group-hover:bg-terracotta" />
      </div>
      <div className="mt-6 eyebrow text-[0.625rem]">{role.eyebrow}</div>
      <h3 className="display-md mt-3 max-w-[20ch] text-balance text-ink">
        {role.title}
      </h3>
      <p className="mt-5 max-w-[52ch] text-[0.9375rem] leading-relaxed text-ink-muted">
        {role.body}
      </p>

      <ul className="mt-6 space-y-2.5 text-[0.875rem] text-ink-soft">
        {role.proofs.map((p) => (
          <li key={p} className="flex items-start gap-3">
            <span className="mt-2 h-px w-3 shrink-0 bg-teal" />
            <span>{p}</span>
          </li>
        ))}
      </ul>

      <Link
        href={role.cta.href}
        className="group/btn mt-9 inline-flex items-center gap-2 text-[0.875rem] font-medium text-ink transition-colors hover:text-teal"
      >
        <span className="link-underline">{role.cta.label}</span>
        <span className="transition-transform duration-300 ease-out-quart group-hover/btn:translate-x-1">
          →
        </span>
      </Link>
    </motion.div>
  )
}

function CTA() {
  const ref = useRef<HTMLDivElement | null>(null)
  const inView = useInView(ref, { once: true, amount: 0.5 })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 22 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.85, ease: ease.outQuart }}
      className="mt-16 overflow-hidden rounded-md border border-ink bg-ink p-10 text-paper lg:p-14"
    >
      <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:items-end lg:gap-16">
        <div>
          <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.28em] text-paper/60">
            Read this far?
          </div>
          <h3 className="display-lg mt-5 max-w-[18ch] text-balance text-paper">
            Open the platform. Verify it for yourself.
          </h3>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/signup"
            className="group inline-flex items-center gap-3 rounded-full bg-paper px-7 py-3.5 text-[0.875rem] font-medium text-ink transition-all duration-300 ease-out-quart hover:bg-paper/90"
          >
            Create account
            <span className="transition-transform duration-300 ease-out-quart group-hover:translate-x-1">
              →
            </span>
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-full border border-paper/30 px-6 py-3.5 text-[0.875rem] font-medium text-paper transition-colors hover:bg-paper/10"
          >
            Sign in
          </Link>
        </div>
      </div>
    </motion.div>
  )
}
