"use client"

import Link from "next/link"
import { useState } from "react"
import { useMotionValueEvent, useScroll } from "framer-motion"

const links = [
  { href: "#journey", label: "How It Flows" },
  { href: "#sides", label: "Both Sides" },
  { href: "#stack", label: "Stack" },
  { href: "#start", label: "Start" },
]

export function SiteHeader() {
  const { scrollY } = useScroll()
  const [isScrolled, setIsScrolled] = useState(false)

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 16)
  })

  return (
    <header className="sticky top-0 z-50">
      <div className="mx-auto w-[min(1200px,92vw)] py-2.5">
        <div className="relative flex min-h-12 items-center justify-center">
          <Link href="/" className="absolute left-0 shrink-0 text-base font-semibold tracking-wide text-slate-900 md:text-lg">
            Proof-of-Learn
          </Link>

          <nav
            className={[
              "flex w-fit items-center gap-1 rounded-full border px-2 py-1.5 text-sm font-medium transition-all md:text-base",
              isScrolled
                ? "border-slate-200 bg-white/95 shadow-[0_12px_26px_-18px_rgba(15,23,42,0.28)] backdrop-blur-xl"
                : "border-slate-200/75 bg-white/80 shadow-[0_7px_16px_-12px_rgba(15,23,42,0.16)] backdrop-blur-md",
            ].join(" ")}
          >
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-full px-4 py-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </header>
  )
}
