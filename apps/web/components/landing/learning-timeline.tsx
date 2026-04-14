"use client"

import { useRef } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { GraduationCap, CircleCheckBig, HandCoins } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

gsap.registerPlugin(ScrollTrigger, useGSAP)

const steps = [
  {
    icon: GraduationCap,
    title: "Learn with AI tutor",
    text: "Students receive guided explanations, examples, and follow-up exercises tailored to the curriculum.",
  },
  {
    icon: CircleCheckBig,
    title: "Pass anti-cheat quiz",
    text: "Session fingerprinting and question randomization verify real understanding, not memorization.",
  },
  {
    icon: HandCoins,
    title: "Receive USDC payout",
    text: "The payout worker executes idempotent Circle transfers while on-chain logs prove completion.",
  },
]

export function LearningTimeline() {
  const sectionRef = useRef<HTMLElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const panels = gsap.utils.toArray<HTMLElement>(".journey-stage")
      if (!panels.length) return

      const mm = gsap.matchMedia()

      mm.add("(min-width: 768px)", () => {
        gsap.set(panels, { autoAlpha: 0, y: 32 })
        gsap.set(panels[0], { autoAlpha: 1, y: 0 })

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: "+=1800",
            scrub: 1,
            pin: true,
            anticipatePin: 1,
          },
        })

        tl.to(progressRef.current, { scaleX: 1, ease: "none" }, 0)
        tl.to(panels[0], { autoAlpha: 0, y: -28, duration: 1 }, 0.8)
        tl.to(panels[1], { autoAlpha: 1, y: 0, duration: 1.1 }, 1.1)
        tl.to(panels[1], { autoAlpha: 0, y: -28, duration: 1 }, 2)
        tl.to(panels[2], { autoAlpha: 1, y: 0, duration: 1.1 }, 2.3)
      })

      gsap.from(".journey-mobile", {
        opacity: 0,
        y: 24,
        stagger: 0.14,
        duration: 0.55,
        ease: "power3.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 70%",
          once: true,
        },
      })

      return () => mm.revert()
    },
    { scope: sectionRef },
  )

  return (
    <section id="journey" ref={sectionRef} className="px-4 py-18 md:px-8 md:py-24">
      <div className="mx-auto w-[min(1200px,92vw)]">
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-slate-500">How It Flows</p>
        <h2 className="mt-3 max-w-2xl font-[family-name:var(--font-heading)] text-4xl font-semibold text-slate-950 md:text-5xl">
          A trusted loop from learning to payout.
        </h2>
      </div>

      <div className="mx-auto mt-10 hidden h-[72vh] w-[min(1200px,92vw)] md:block">
        <div className="mb-6 h-1.5 w-full rounded-full bg-slate-200">
          <div ref={progressRef} className="h-full origin-left scale-x-0 rounded-full bg-gradient-to-r from-blue-500 to-emerald-400" />
        </div>
        <div className="relative h-[calc(72vh-2rem)]">
          {steps.map((step) => {
            const Icon = step.icon
            return (
              <Card key={step.title} className="journey-stage absolute inset-0 flex items-center bg-white/90">
                <CardContent className="grid h-full w-full place-items-center p-10">
                  <div className="max-w-2xl text-center">
                    <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-800">
                      <Icon className="size-7" />
                    </div>
                    <h3 className="font-[family-name:var(--font-heading)] text-3xl font-semibold text-slate-950">{step.title}</h3>
                    <p className="mt-4 text-lg leading-relaxed text-slate-600">{step.text}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      <div className="mx-auto mt-10 grid w-[min(1200px,92vw)] gap-4 md:hidden">
        {steps.map((step) => {
          const Icon = step.icon
          return (
            <Card key={step.title} className="journey-mobile">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-800">
                  <Icon className="size-5" />
                </div>
                <CardTitle>{step.title}</CardTitle>
                <CardDescription>{step.text}</CardDescription>
              </CardHeader>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
