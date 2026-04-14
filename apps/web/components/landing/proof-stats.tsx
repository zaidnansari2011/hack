"use client"

import { useRef } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

import { Card, CardContent } from "@/components/ui/card"

gsap.registerPlugin(ScrollTrigger, useGSAP)

type Stat = {
  label: string
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
}

const stats: Stat[] = [
  { label: "Learners rewarded", value: 10000, suffix: "+" },
  { label: "Avg payout latency", value: 2.4, suffix: "s", decimals: 1 },
  { label: "Sponsor completion rate", value: 97.8, suffix: "%", decimals: 1 },
]

function formatValue(value: number, stat: Stat) {
  const decimals = stat.decimals ?? 0
  const display = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toLocaleString()
  return `${stat.prefix ?? ""}${display}${stat.suffix ?? ""}`
}

export function ProofStats() {
  const rootRef = useRef<HTMLDivElement>(null)
  const valueRefs = useRef<Array<HTMLParagraphElement | null>>([])

  useGSAP(
    () => {
      valueRefs.current.forEach((node, index) => {
        if (!node) return

        const stat = stats[index]
        const state = { current: 0 }

        gsap.to(state, {
          current: stat.value,
          duration: 1.5,
          ease: "power3.out",
          scrollTrigger: {
            trigger: node,
            start: "top 88%",
            once: true,
          },
          onUpdate: () => {
            node.textContent = formatValue(state.current, stat)
          },
        })
      })
    },
    { scope: rootRef },
  )

  return (
    <section className="px-4 py-8 md:px-8 md:py-10">
      <div ref={rootRef} className="mx-auto grid w-[min(1200px,92vw)] gap-4 md:grid-cols-3">
        {stats.map((stat, index) => (
          <Card key={stat.label} className="bg-gradient-to-b from-white to-slate-50">
            <CardContent className="p-6">
              <p className="text-sm text-slate-500">{stat.label}</p>
              <p ref={(el) => (valueRefs.current[index] = el)} className="mt-3 text-4xl font-semibold text-slate-900">
                {formatValue(0, stat)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
