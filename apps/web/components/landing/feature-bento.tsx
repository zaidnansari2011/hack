"use client"

import { motion } from "framer-motion"
import { BrainCircuit, CircleDollarSign, ShieldCheck, Bot, Sparkles, LineChart } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const features = [
  {
    title: "Adaptive AI Tutor",
    description: "Dify-powered tutoring adapts difficulty in real-time and keeps students moving forward with confidence.",
    icon: BrainCircuit,
    className: "md:col-span-2",
    tone: "text-violet-600 bg-violet-100",
  },
  {
    title: "Guaranteed USDC",
    description: "Milestones trigger queued, idempotent Circle payouts so rewards are dependable.",
    icon: CircleDollarSign,
    className: "md:col-span-1",
    tone: "text-emerald-600 bg-emerald-100",
  },
  {
    title: "On-chain Proof",
    description: "Completion events are indexed and auditable for sponsors and students.",
    icon: ShieldCheck,
    className: "md:col-span-1",
    tone: "text-blue-600 bg-blue-100",
  },
  {
    title: "Dynamic Quiz Defense",
    description: "Question randomization, timing constraints, and answer shuffling reduce cheating vectors.",
    icon: Bot,
    className: "md:col-span-1",
    tone: "text-amber-600 bg-amber-100",
  },
  {
    title: "Sponsor Analytics",
    description: "Track completion velocity, payout efficiency, and curriculum ROI from one clean dashboard.",
    icon: LineChart,
    className: "md:col-span-1",
    tone: "text-sky-600 bg-sky-100",
  },
]

export function FeatureBento() {
  return (
    <section id="features" className="px-4 py-16 md:px-8 md:py-22">
      <div className="mx-auto w-[min(1200px,92vw)]">
        <div className="mb-8 flex items-center gap-2 text-sm font-medium text-slate-500">
          <Sparkles className="size-4 text-blue-600" />
          Platform Highlights
        </div>

        <div className="grid auto-rows-[1fr] gap-4 md:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.45, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -5 }}
                className={feature.className}
              >
                <Card className="h-full">
                  <CardHeader>
                    <div className={["mb-2 flex h-10 w-10 items-center justify-center rounded-xl", feature.tone].join(" ")}>
                      <Icon className="size-5" />
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-1.5 w-full rounded-full bg-slate-100">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${70 + index * 5}%` }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 + index * 0.05, duration: 0.65 }}
                        className="h-full rounded-full bg-linear-to-r from-blue-500 to-indigo-400"
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
