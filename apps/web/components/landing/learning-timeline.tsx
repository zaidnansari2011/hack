"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"

gsap.registerPlugin(ScrollTrigger, useGSAP)

const steps = [
  {
    num: "01",
    eyebrow: "Learn",
    icon: GraduationCap,
    title: "Guided AI tutoring, grounded on real curriculum.",
    description:
      "Students progress through sponsor-funded curriculum with a Dify tutor anchored on a RAGFlow knowledge base. Adaptive hints, worked examples, and transcripts keep momentum high without spoon-feeding answers.",
    meta: [
      { label: "Runtime", value: "Dify + RAGFlow" },
      { label: "Session avg.", value: "24 min" },
      { label: "Unblock rate", value: "96%" },
    ],
  },
  {
    num: "02",
    eyebrow: "Verify",
    icon: CircleCheckBig,
    title: "An anti-cheat quiz gate that rewards real understanding.",
    description:
      "Each milestone triggers a timed quiz session with rotating question banks, randomized answers, and session fingerprinting. Memorized answers and shared screens don't pass — real learning does.",
    meta: [
      { label: "Question pool", value: "120+ / module" },
      { label: "Per-question", value: "90s budget" },
      { label: "False pass", value: "< 0.4%" },
    ],
  },
  {
    num: "03",
    eyebrow: "Reward",
    icon: HandCoins,
    title: "On-chain proof plus a guaranteed USDC payout.",
    description:
      "A passing run emits a completion event to the escrow contract on Base and enqueues an idempotent Circle transfer. USDC lands in the student's programmable wallet in seconds — retries stay safe, duplicates never ship.",
    meta: [
      { label: "Chain", value: "Base" },
      { label: "Settlement", value: "~2.4s" },
      { label: "Guarantee", value: "Idempotent" },
    ],
  },
  {
    n: "04",
    label: "Settle",
    title: "₹ to UPI, proof to chain.",
    body:
      "On pass, the verifier triggers releasePayout() and mints a soulbound LearnCredential. In parallel, Razorpay X UPI sends the rupees to the student's bank in seconds.",
    detail: "LearningVerified · CredentialMinted · Razorpay payout",
  },
] as const

export function LearningTimeline() {
  const sectionRef = useRef<HTMLElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const stageRefs = useRef<Array<HTMLDivElement | null>>([])
  const indicatorRefs = useRef<Array<HTMLDivElement | null>>([])

  useGSAP(
    () => {
      const stages = stageRefs.current.filter((n): n is HTMLDivElement => !!n)
      const indicators = indicatorRefs.current.filter((n): n is HTMLDivElement => !!n)
      if (!stages.length) return

      const mm = gsap.matchMedia()

      mm.add("(min-width: 768px)", () => {
        gsap.set(stages, { autoAlpha: 0, y: 18 })
        gsap.set(stages[0], { autoAlpha: 1, y: 0 })
        indicators.forEach((el, i) => el.setAttribute("data-active", i === 0 ? "true" : "false"))

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: "+=2000",
            scrub: 0.8,
            pin: true,
            anticipatePin: 1,
            onUpdate: (self) => {
              const p = self.progress
              const idx = p < 0.36 ? 0 : p < 0.7 ? 1 : 2
              indicators.forEach((el, j) =>
                el.setAttribute("data-active", j === idx ? "true" : "false"),
              )
            },
          },
        })

        tl.to(progressRef.current, { scaleX: 1, ease: "none" }, 0)
        tl.to(stages[0], { autoAlpha: 0, y: -18, duration: 0.55 }, 0.9)
        tl.to(stages[1], { autoAlpha: 1, y: 0, duration: 0.55 }, 1.1)
        tl.to(stages[1], { autoAlpha: 0, y: -18, duration: 0.55 }, 2.0)
        tl.to(stages[2], { autoAlpha: 1, y: 0, duration: 0.55 }, 2.2)
      })

      gsap.from(".journey-mobile", {
        opacity: 0,
        y: 20,
        stagger: 0.12,
        duration: 0.5,
        ease: "power3.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 72%",
          once: true,
        },
      })

      return () => mm.revert()
    },
    { scope: sectionRef },
  )

  return (
    <section
      id="journey"
      ref={sectionRef}
      className="border-y border-slate-200 bg-slate-50 px-4 py-24 md:px-8 md:py-32"
    >
      <div className="mx-auto w-[min(1200px,92vw)]">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
            How It Flows
          </p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
            A trusted loop from learning to payout.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600 md:text-lg">
            Three coordinated layers — tutoring, verification, and settlement — turn every completed
            lesson into a signed, auditable, paid event.
          </p>
        </div>

        <div className="mt-14 hidden md:block">
          <div className="grid grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <div
                key={step.num}
                ref={(el) => (indicatorRefs.current[i] = el)}
                data-active="false"
                className="group flex items-center gap-4 border-l-2 border-slate-200 pl-5 transition-colors data-[active=true]:border-slate-900"
              >
                <div className="flex size-10 items-center justify-center rounded-full border border-slate-300 bg-white text-sm font-semibold text-slate-500 transition-all group-data-[active=true]:border-slate-900 group-data-[active=true]:bg-slate-900 group-data-[active=true]:text-white">
                  {step.num}
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 group-data-[active=true]:text-slate-900">
                    {step.eyebrow}
                  </p>
                  <p className="text-sm font-semibold text-slate-500 group-data-[active=true]:text-slate-900">
                    {step.num === "01" ? "Guided tutoring" : step.num === "02" ? "Quiz verification" : "Proof & payout"}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 h-[2px] w-full rounded-full bg-slate-200">
            <div
              ref={progressRef}
              className="h-full origin-left scale-x-0 rounded-full bg-slate-900"
            />
          </div>

          <div className="relative mt-14 h-[440px]">
            {steps.map((step, i) => {
              const Icon = step.icon
              return (
                <div
                  key={step.num}
                  ref={(el) => (stageRefs.current[i] = el)}
                  className="absolute inset-0 grid grid-cols-[1.15fr_0.85fr] gap-12"
                >
                  <div className="flex flex-col justify-center">
                    <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-slate-900 text-white">
                      <Icon className="size-6" />
                    </div>
                    <h3 className="max-w-xl text-3xl font-semibold tracking-tight text-slate-950 md:text-[2.4rem] md:leading-[1.1]">
                      {step.title}
                    </h3>
                    <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600">
                      {step.description}
                    </p>
                  </div>

                  <div className="flex flex-col justify-center">
                    <div className="rounded-2xl border border-slate-200 bg-white p-8">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                          Signals
                        </p>
                        <span className="text-xs font-medium text-slate-400">{step.num} / 03</span>
                      </div>
                      <dl className="mt-5 divide-y divide-slate-100">
                        {step.meta.map((m) => (
                          <div
                            key={m.label}
                            className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                          >
                            <dt className="text-sm text-slate-600">{m.label}</dt>
                            <dd className="font-mono text-sm font-semibold text-slate-950">
                              {m.value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-12 grid gap-4 md:hidden">
          {steps.map((step) => {
            const Icon = step.icon
            return (
              <div
                key={step.num}
                className="journey-mobile rounded-2xl border border-slate-200 bg-white p-6"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                      {step.num} · {step.eyebrow}
                    </p>
                    <p className="text-base font-semibold text-slate-950">
                      {step.num === "01"
                        ? "Guided tutoring"
                        : step.num === "02"
                          ? "Quiz verification"
                          : "Proof & payout"}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-slate-600">{step.description}</p>
                <dl className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
                  {step.meta.map((m) => (
                    <div
                      key={m.label}
                      className="flex items-center justify-between py-3"
                    >
                      <dt className="text-sm text-slate-600">{m.label}</dt>
                      <dd className="font-mono text-sm font-semibold text-slate-950">
                        {m.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )
          })}
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
      initial={{ opacity: 0, y: 22 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, ease: ease.outQuart }}
    >
      <div className="eyebrow eyebrow-tick">Methodology</div>
      <h2 className="display-lg mt-5 max-w-[20ch] text-balance text-ink">
        From an empty bounty to a verified rupee —{" "}
        <span className="display-italic text-teal">in four steps.</span>
      </h2>
    </motion.div>
  )
}

function Step({
  step,
  index,
}: {
  step: (typeof STEPS)[number]
  index: number
}) {
  const ref = useRef<HTMLLIElement | null>(null)
  const inView = useInView(ref, { once: true, amount: 0.5 })

  return (
    <motion.li
      ref={ref}
      initial={{ opacity: 0, y: 22 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.75, ease: ease.outQuart, delay: index * 0.05 }}
      className="group relative grid gap-4 border-l border-rule pl-7 lg:grid-cols-[auto_1fr] lg:gap-8 lg:border-l-0 lg:pl-0"
    >
      <div className="flex items-baseline gap-3 lg:flex-col lg:items-start lg:gap-1.5">
        <span className="font-mono text-[0.75rem] font-semibold uppercase tracking-[0.22em] text-ink-faint">
          {step.n}
        </span>
        <span className="font-display text-[1.5rem] font-medium tracking-tight text-teal">
          {step.label}
        </span>
      </div>
      <div>
        <h3 className="display-md text-balance text-ink">{step.title}</h3>
        <p className="mt-3 max-w-[58ch] text-[0.9375rem] leading-relaxed text-ink-muted">
          {step.body}
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-sm border border-rule bg-surface-soft px-3 py-1.5 font-mono text-[0.75rem] text-ink-muted">
          <span className="text-ink-faint">›</span>
          {step.detail}
        </div>
      </div>
    </motion.li>
  )
}

/**
 * A small SVG diagram that animates a flow from the sponsor → escrow →
 * student → chain. Hand-drawn lines, register marks at corners.
 */
function Diagram() {
  const ref = useRef<HTMLDivElement | null>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 1, ease: ease.outQuart }}
      className="surface-paper paper-grain sticky top-24 hidden h-fit overflow-hidden rounded-md p-6 lg:block"
    >
      <div className="flex items-center justify-between border-b border-rule pb-3">
        <span className="eyebrow eyebrow-tick text-[0.625rem]">Schematic</span>
        <span className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-ink-faint">
          fig. 01
        </span>
      </div>
      <svg viewBox="0 0 336 380" className="mt-4 h-auto w-full">
        <defs>
          <marker
            id="arrowhead"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M0,0 L0,10 L10,5 z" fill="hsl(var(--ink))" />
          </marker>
        </defs>

        {/* Sponsor box */}
        <DiagramNode x={20} y={20} w={120} label="Sponsor" sub="sign once" />
        {/* Escrow */}
        <DiagramNode
          x={180}
          y={20}
          w={120}
          label="Escrow"
          sub="ETH / USDC"
          accent
        />
        {/* Student */}
        <DiagramNode x={20} y={150} w={120} label="Student" sub="enrolls + learns" />
        {/* Quiz */}
        <DiagramNode
          x={180}
          y={150}
          w={120}
          label="Quiz"
          sub="anti-cheat"
        />
        {/* Chain proof */}
        <DiagramNode
          x={20}
          y={280}
          w={120}
          label="Chain proof"
          sub="LearningVerified"
          accent
        />
        {/* UPI payout */}
        <DiagramNode
          x={180}
          y={280}
          w={120}
          label="UPI"
          sub="₹ in seconds"
        />

        {/* Arrows */}
        {/* Sponsor → Escrow */}
        <Arrow d="M 140 50 L 180 50" inView={inView} delay={0.3} />
        {/* Sponsor → Student */}
        <Arrow d="M 80 80 L 80 150" inView={inView} delay={0.5} />
        {/* Student → Quiz */}
        <Arrow d="M 140 180 L 180 180" inView={inView} delay={0.7} />
        {/* Escrow → below-Quiz row (routed outside right edge, avoiding Quiz box) */}
        <Arrow d="M 300 50 L 316 50 L 316 250 L 240 250" inView={inView} delay={0.5} />
        {/* Quiz bottom → gap between rows → Chain proof (routes below Quiz, not through it) */}
        <Arrow d="M 240 210 L 240 250 L 80 250 L 80 280" inView={inView} delay={0.9} />
        {/* Chain proof → UPI */}
        <Arrow d="M 140 310 L 180 310" inView={inView} delay={1.1} />
      </svg>

      <div className="mt-4 border-t border-rule pt-4 text-[0.6875rem] uppercase tracking-[0.18em] text-ink-faint">
        <p>Read top-to-bottom · Two parallel settlements</p>
      </div>
    </motion.div>
  )
}

function DiagramNode({
  x,
  y,
  w,
  label,
  sub,
  accent,
}: {
  x: number
  y: number
  w: number
  label: string
  sub: string
  accent?: boolean
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={60}
        rx={4}
        fill={accent ? "hsl(var(--teal-tint))" : "hsl(var(--surface))"}
        stroke="hsl(var(--rule))"
        strokeWidth="1"
      />
      <text
        x={x + 12}
        y={y + 24}
        fontFamily="var(--font-display)"
        fontSize="14"
        fontWeight="500"
        fill={accent ? "hsl(var(--teal))" : "hsl(var(--ink))"}
      >
        {label}
      </text>
      <text
        x={x + 12}
        y={y + 44}
        fontFamily="var(--font-mono)"
        fontSize="9"
        letterSpacing="0.5"
        fill="hsl(var(--ink-faint))"
      >
        {sub.toUpperCase()}
      </text>
    </g>
  )
}

function Arrow({
  d,
  inView,
  delay,
}: {
  d: string
  inView: boolean
  delay: number
}) {
  return (
    <motion.path
      d={d}
      fill="none"
      stroke="hsl(var(--ink))"
      strokeWidth="1"
      strokeDasharray="3 3"
      markerEnd="url(#arrowhead)"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={inView ? { pathLength: 1, opacity: 1 } : {}}
      transition={{ duration: 0.9, ease: ease.outQuart, delay }}
    />
  )
}
