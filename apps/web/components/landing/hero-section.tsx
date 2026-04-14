"use client"

import { useRef } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import Balancer from "react-wrap-balancer"
import { ArrowRight, BrainCircuit, CircleCheckBig, Coins } from "lucide-react"

import { MagicBackground } from "@/components/landing/magic-background"
import { Button } from "@/components/ui/button"

gsap.registerPlugin(ScrollTrigger, useGSAP)

const headlineLines = [
  ["Prove", "learning", "outcomes."],
  ["Reward", "students", "instantly."],
]

const domePillars = [
  { label: "AI Tutor", icon: BrainCircuit },
  { label: "Quiz Verified", icon: CircleCheckBig },
  { label: "USDC Reward", icon: Coins },
]

export function HeroSection() {
  const rootRef = useRef<HTMLElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement | null>(null)
  const ctaRef = useRef<HTMLDivElement | null>(null)
  const wordRefs = useRef<Array<HTMLSpanElement | null>>([])
  const domeRef = useRef<HTMLDivElement | null>(null)
  const domeShadowRef = useRef<HTMLDivElement | null>(null)
  const domeEdgeRef = useRef<SVGPathElement | null>(null)
  const domeGlowRef = useRef<SVGPathElement | null>(null)
  const domeContentRef = useRef<HTMLDivElement | null>(null)

  useGSAP(
    () => {
      const words = wordRefs.current.filter((node): node is HTMLSpanElement => node !== null)
      const domeChildren = domeContentRef.current ? Array.from(domeContentRef.current.children) : []

      const timeline = gsap.timeline({ defaults: { ease: "power3.out" } })
      timeline
        .from(words, { yPercent: 120, opacity: 0, duration: 0.88, stagger: 0.065 })
        .from(subtitleRef.current, { y: 26, opacity: 0, duration: 0.65 }, "-=0.48")
        .from(ctaRef.current, { y: 20, opacity: 0, duration: 0.55 }, "-=0.35")
        .from(domeRef.current, { y: 160, opacity: 0, duration: 0.88, ease: "power4.out" }, "-=0.36")
        .to(domeRef.current, { y: -10, duration: 0.18, ease: "power2.out" })
        .to(domeRef.current, { y: 0, duration: 0.64, ease: "elastic.out(1,0.7)" })
        .from(domeChildren, { y: 14, opacity: 0, duration: 0.42, stagger: 0.075 }, "-=0.35")

      if (domeRef.current && domeContentRef.current && domeShadowRef.current && domeEdgeRef.current && domeGlowRef.current) {
        gsap.set(domeRef.current, {
          clipPath: "ellipse(88% 100% at 50% 100%)",
        })
        gsap.set(domeShadowRef.current, { opacity: 0.78, scaleX: 1, y: 0 })
        gsap.set([domeEdgeRef.current, domeGlowRef.current], { opacity: 1 })

        const collapseTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: rootRef.current,
            start: "top top",
            end: "bottom top",
            scrub: 0.72,
          },
        })

        collapseTimeline
          .to(
            domeShadowRef.current,
            {
              opacity: 0.34,
              scaleX: 0.93,
              y: 8,
              duration: 0.45,
              ease: "none",
            },
            0,
          )
          .to(
            [domeEdgeRef.current, domeGlowRef.current],
            {
              opacity: 0.4,
              duration: 0.45,
              ease: "none",
            },
            0,
          )
          .to(
            domeRef.current,
            {
              clipPath: "ellipse(88% 0% at 50% 100%)",
              yPercent: 12,
              opacity: 0.1,
              duration: 1,
              ease: "none",
            },
            0,
          )
          .to(
            domeContentRef.current,
            {
              y: 42,
              opacity: 0,
              filter: "blur(1px)",
              duration: 0.85,
              ease: "none",
            },
            0.1,
          )
          .to(
            domeShadowRef.current,
            {
              opacity: 0,
              scaleX: 0.8,
              y: 16,
              duration: 0.55,
              ease: "none",
            },
            0.45,
          )
          .to(
            [domeEdgeRef.current, domeGlowRef.current],
            {
              opacity: 0,
              duration: 0.55,
              ease: "none",
            },
            0.45,
          )
      }
    },
    { scope: rootRef },
  )

  return (
    <section ref={rootRef} className="relative h-[calc(100svh-4.3rem)] overflow-hidden px-4 md:px-8">
      <MagicBackground />

      <div className="relative mx-auto h-full w-[min(1200px,92vw)]">
        <div className="relative z-20 mx-auto flex h-full w-full max-w-5xl flex-col items-center justify-center pb-50 pt-8 text-center md:pb-56">
          <h1 className="mt-2 font-(family-name:--font-heading) text-5xl font-semibold leading-[1.02] text-slate-950 md:text-7xl">
            {headlineLines.map((line, lineIndex) => (
              <span key={lineIndex} className="block">
                {line.map((word, wordIndex) => {
                  const index = lineIndex * 10 + wordIndex
                  return (
                    <span key={`${lineIndex}-${word}`} className="inline-block overflow-hidden pr-2 align-top md:pr-3">
                      <span ref={(element) => (wordRefs.current[index] = element)} className="inline-block">
                        {word}
                      </span>
                    </span>
                  )
                })}
              </span>
            ))}
          </h1>

          <p ref={subtitleRef} className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-slate-600">
            <Balancer>
              Students complete AI-guided curricula, sponsors fund outcomes through escrow, and each verified completion triggers
              transparent on-chain proof plus guaranteed USDC rewards.
            </Balancer>
          </p>

          <div ref={ctaRef} className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" className="group">
              Start Learning
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button variant="secondary" size="lg">
              Become a Sponsor
            </Button>
          </div>
        </div>

        <div
          ref={domeRef}
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 mx-auto w-full"
        >
          <div
            ref={domeShadowRef}
            className="absolute inset-x-0 bottom-18 mx-auto h-24 w-5/6 rounded-[999px] bg-[radial-gradient(ellipse_at_center,rgba(51,65,85,0.34)_0%,rgba(100,116,139,0.16)_42%,rgba(148,163,184,0)_78%)] blur-2xl"
          />

          <svg viewBox="0 0 980 320" className="h-[33.35rem] w-full md:h-[39.1rem]" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="domeFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(255,255,255,0.98)" />
                <stop offset="100%" stopColor="rgba(247,250,252,0.98)" />
              </linearGradient>
              <filter id="domeEdgeShadow" x="-20%" y="-120%" width="140%" height="260%" filterUnits="objectBoundingBox">
                <feDropShadow dx="0" dy="-2" stdDeviation="3.6" floodColor="rgba(30,41,59,0.32)" />
                <feDropShadow dx="0" dy="-10" stdDeviation="12" floodColor="rgba(100,116,139,0.24)" />
              </filter>
            </defs>
            <path d="M0 320 Q 490 -78 980 320 L980 320 L0 320 Z" fill="url(#domeFill)" />
            <path
              ref={domeGlowRef}
              d="M0 320 Q 490 -62 980 320"
              fill="none"
              stroke="rgba(255,255,255,0.72)"
              strokeWidth="1.4"
            />
            <path
              ref={domeEdgeRef}
              d="M0 320 Q 490 -62 980 320"
              fill="none"
              stroke="rgba(100,116,139,0.62)"
              strokeWidth="2.4"
              filter="url(#domeEdgeShadow)"
            />
          </svg>

          <div
            ref={domeContentRef}
            className="absolute inset-x-0 bottom-14 mx-auto flex max-w-xl flex-col items-center text-center md:bottom-20"
          >
            <p className="text-lg font-semibold text-slate-800 md:text-xl">Learn. Verify. Earn USDC.</p>

            <div className="mt-3 grid w-full max-w-md grid-cols-3 gap-2">
              {domePillars.map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="rounded-full border border-slate-200 bg-white/75 px-3 py-2 text-slate-700">
                    <div className="mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100">
                      <Icon className="size-3.5" />
                    </div>
                    <p className="text-[11px] font-medium leading-none">{item.label}</p>
                  </div>
                )
              })}
            </div>

            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              AI tutoring, anti-cheat verification, and guaranteed micro-rewards
              <br className="hidden sm:block" />
              for every verified learning milestone.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
