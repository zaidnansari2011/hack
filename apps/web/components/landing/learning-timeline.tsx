"use client"

import { useRef } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { GraduationCap, CircleCheckBig, HandCoins } from "lucide-react"

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
]

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
