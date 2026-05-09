import type { Transition, Variants } from "framer-motion"

// Shared easings — keep these in lockstep with the CSS variables in globals.css.
export const ease = {
  outQuart: [0.22, 1, 0.36, 1] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
  spring: [0.34, 1.36, 0.5, 1] as const,
}

export const transitions = {
  base: { duration: 0.6, ease: ease.outQuart } satisfies Transition,
  slow: { duration: 0.9, ease: ease.outQuart } satisfies Transition,
  brisk: { duration: 0.35, ease: ease.outQuart } satisfies Transition,
}

/** Stagger reveal — used on hero clusters, feature grids, etc. */
export const stagger: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
}

/** Vertical rise — pairs with `stagger` at the parent level. */
export const rise: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: transitions.base,
  },
}

export const riseSlow: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: transitions.slow,
  },
}

export const fade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: transitions.base },
}

/** Letter-by-letter reveal — split text into spans before applying. */
export const letter: Variants = {
  hidden: { opacity: 0, y: "0.65em" },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: ease.outQuart },
  },
}

/** A subtle hint of weight when a number ticks up. */
export const numberPop: Variants = {
  rest: { scale: 1 },
  bump: {
    scale: [1, 1.06, 1],
    transition: { duration: 0.55, ease: ease.outQuart },
  },
}
