"use client"

import { motion } from "framer-motion"
import { BrainCircuit, CircleCheckBig, Coins, Fingerprint, Layers3, ShieldCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const pillars = [
  {
    title: "Teach Through AI",
    description:
      "Students learn with guided Dify tutoring, adaptive explanations, and structured practice that keeps momentum high.",
    icon: BrainCircuit,
    tone: "bg-violet-100 text-violet-700",
  },
  {
    title: "Verify Mastery",
    description:
      "We validate learning with anti-cheat quiz sessions using rotation, timers, randomization, and session-level checks.",
    icon: Fingerprint,
    tone: "bg-blue-100 text-blue-700",
  },
  {
    title: "Reward Outcomes",
    description:
      "Passing milestones triggers guaranteed USDC micro-rewards, while on-chain events prove each completion transparently.",
    icon: Coins,
    tone: "bg-emerald-100 text-emerald-700",
  },
]

const flow = [
  {
    title: "Curriculum Activated",
    detail: "Sponsor-funded bounties unlock learning paths.",
    icon: Layers3,
  },
  {
    title: "Quiz Confirmed",
    detail: "Cheat-resistant assessments validate outcomes.",
    icon: CircleCheckBig,
  },
  {
    title: "Proof + Payout",
    detail: "Completion is recorded and payout is sent.",
    icon: ShieldCheck,
  },
]

export function WhatWeDoSection() {
  return (
    <section id="what-we-do" className="px-4 pb-14 md:px-8 md:pb-18">
      <div className="mx-auto w-[min(1200px,92vw)]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-3xl text-center"
        >
          <Badge variant="neutral" className="border-slate-300 bg-white/85 text-slate-700">
            What We Actually Do
          </Badge>
          <h2 className="mt-4 text-balance text-3xl font-semibold text-slate-950 md:text-5xl">
            A full proof-of-learning pipeline, not just a landing page concept.
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-slate-600 md:text-lg">
            We combine AI tutoring, verified assessment, and automated USDC disbursement into one measurable protocol for students
            and sponsors.
          </p>
        </motion.div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {pillars.map((pillar, index) => {
            const Icon = pillar.icon
            return (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.45, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -5 }}
              >
                <Card className="h-full">
                  <CardHeader>
                    <div className={["mb-2 flex h-10 w-10 items-center justify-center rounded-xl", pillar.tone].join(" ")}>
                      <Icon className="size-5" />
                    </div>
                    <CardTitle>{pillar.title}</CardTitle>
                    <CardDescription>{pillar.description}</CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            )
          })}
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white/88 p-5 shadow-[0_12px_38px_-24px_rgba(15,23,42,0.42)] md:p-6">
          <div className="grid gap-3 md:grid-cols-3">
            {flow.map((step, index) => {
              const Icon = step.icon
              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.4, delay: 0.12 + index * 0.08 }}
                  className="rounded-xl bg-slate-50 p-4"
                >
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-700">
                    <Icon className="size-4" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{step.detail}</p>
                </motion.div>
              )
            })}
          </div>
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.25 }}
            className="mt-4 h-1 origin-left rounded-full bg-linear-to-r from-blue-500 via-indigo-500 to-emerald-500"
          />
        </div>
      </div>
    </section>
  )
}
