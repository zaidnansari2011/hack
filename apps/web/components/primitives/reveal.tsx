"use client"

import { motion, useInView, type Variants } from "framer-motion"
import { useRef, type ReactNode } from "react"

import { rise, stagger, transitions } from "@/lib/motion"

type RevealProps = {
  children: ReactNode
  variants?: Variants
  className?: string
  /** Delay before the animation starts (seconds). */
  delay?: number
  /** Trigger only the first time the element enters the viewport. */
  once?: boolean
  amount?: number
  as?: "div" | "section" | "header" | "article" | "li" | "h1" | "h2" | "h3" | "p"
}

/**
 * Animates its children once they scroll into view. Defaults to a vertical
 * "rise" — pass a different `variants` value (or `stagger` + per-child rises)
 * for more elaborate reveals.
 */
export function Reveal({
  children,
  variants = rise,
  className,
  delay = 0,
  once = true,
  amount = 0.2,
  as = "div",
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null)
  const inView = useInView(ref, { once, amount })

  const Tag = motion[as]
  return (
    <Tag
      // @ts-expect-error — motion has wide ref typing per element variant
      ref={ref}
      className={className}
      variants={variants}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
      transition={{ ...transitions.base, delay }}
    >
      {children}
    </Tag>
  )
}

/** Stagger group — children should each define their own variants. */
export function RevealGroup({
  children,
  className,
  amount = 0.15,
  as = "div",
}: {
  children: ReactNode
  className?: string
  amount?: number
  as?: RevealProps["as"]
}) {
  const ref = useRef<HTMLElement | null>(null)
  const inView = useInView(ref, { once: true, amount })

  const Tag = motion[as ?? "div"]
  return (
    <Tag
      // @ts-expect-error — see Reveal
      ref={ref}
      className={className}
      variants={stagger}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
    >
      {children}
    </Tag>
  )
}
