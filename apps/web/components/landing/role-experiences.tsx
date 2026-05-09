"use client"

import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"

const marks = [
  { label: "Learners rewarded", value: "10,000+" },
  { label: "Avg. payout latency", value: "2.4s" },
  { label: "Sponsor completion rate", value: "97.8%" },
]

export function RoleExperiences() {
  return (
    <section id="start" className="px-4 py-24 md:px-8 md:py-32">
      <div className="mx-auto w-[min(1200px,92vw)]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-[2rem] border border-slate-900 bg-slate-950 p-10 md:p-16"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-slate-700 to-transparent" />
          <div className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[620px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.18)_0%,rgba(15,23,42,0)_70%)]" />

          <div className="relative">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
              Start Shipping Verified Learning
            </p>
            <h2 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-white md:text-5xl">
              Learning that pays. Funding that lands.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-300 md:text-lg">
              Whether you're a student ready to earn or a sponsor ready to fund outcomes, you can
              be live in minutes — no custody, no intermediaries, no unverified claims.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" className="group bg-white text-slate-950 shadow-none hover:bg-slate-100 hover:brightness-100">
                Start Learning
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-slate-700 bg-transparent text-white hover:bg-slate-900 hover:text-white"
              >
                Become a Sponsor
              </Button>
            </div>

            <div className="mt-14 grid gap-10 border-t border-slate-800 pt-10 md:grid-cols-3">
              {marks.map((m, i) => (
                <motion.div
                  key={m.label}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.45, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                >
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
                    {m.label}
                  </p>
                  <p className="mt-3 font-[family-name:var(--font-heading)] text-4xl font-semibold tracking-tight text-white md:text-5xl">
                    {m.value}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
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
        Funds, bounties, completions, payouts — every record is one row away
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
