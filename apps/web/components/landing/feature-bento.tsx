"use client"

import { motion } from "framer-motion"
import { BrainCircuit, ShieldCheck, Coins, Hash } from "lucide-react"

const layers = [
  {
    icon: BrainCircuit,
    name: "Tutoring Layer",
    detail:
      "Dify workflows orchestrate lesson delivery; RAGFlow anchors every response to the sponsor's curriculum so tutors stay on-topic and on-spec.",
    stack: ["Dify", "RAGFlow", "LLM"],
  },
  {
    icon: ShieldCheck,
    name: "Verification Layer",
    detail:
      "Postgres-backed quiz sessions enforce timing budgets, question rotation, answer shuffling, and per-attempt fingerprinting rules.",
    stack: ["Postgres", "Prisma", "Redis"],
  },
  {
    icon: Coins,
    name: "Payout Layer",
    detail:
      "BullMQ workers process Circle Programmable Wallet transfers with idempotency keys, bounded retries, and end-to-end webhooks.",
    stack: ["BullMQ", "Circle", "USDC"],
  },
  {
    icon: Hash,
    name: "Proof Layer",
    detail:
      "A Solidity escrow on Base emits completion events. The indexer reconciles on-chain proof with off-chain settlement for a single receipt.",
    stack: ["Foundry", "Base", "Solidity"],
  },
]

export function FeatureBento() {
  return (
    <section
      id="stack"
      className="border-y border-slate-200 bg-slate-50 px-4 py-24 md:px-8 md:py-32"
    >
      <div className="mx-auto w-[min(1200px,92vw)]">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              The Proof Stack
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              Four layers. One auditable receipt.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600 md:text-lg">
              Every completion is produced by a pipeline of distinct, verifiable components — so
              sponsors can trust the outcome and students can trust the payout.
            </p>
          </div>
          <p className="hidden text-xs font-medium uppercase tracking-[0.18em] text-slate-400 md:block">
            Architecture
          </p>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-2">
          {layers.map((layer, i) => {
            const Icon = layer.icon
            return (
              <motion.div
                key={layer.name}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 transition-colors hover:border-slate-300"
              >
                <div className="flex items-start justify-between">
                  <div className="flex size-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-900">
                    <Icon className="size-5" />
                  </div>
                  <span className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                    L/0{i + 1}
                  </span>
                </div>
                <h3 className="mt-7 text-xl font-semibold tracking-tight text-slate-950">
                  {layer.name}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{layer.detail}</p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {layer.stack.map((s) => (
                    <span
                      key={s}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-mono text-[11px] font-medium text-slate-600"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
