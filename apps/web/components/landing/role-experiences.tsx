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
