"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

import { AuthPill } from "./auth-pill"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/#manifesto", label: "Manifesto" },
  { href: "/#methodology", label: "Methodology" },
  { href: "/#live", label: "Live" },
  { href: "/#roles", label: "Roles" },
] as const

export function SiteHeader() {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const onLanding = pathname === "/"

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b border-transparent transition-all duration-500 ease-out-quart",
        scrolled
          ? "border-rule/60 bg-paper/85 backdrop-blur-md"
          : "border-transparent bg-paper/0",
      )}
    >
      <div className="mx-auto flex h-16 w-[min(1240px,94vw)] items-center justify-between gap-6">
        <Link href="/" className="group flex items-center gap-3">
          <Wordmark />
        </Link>

        {onLanding && (
          <nav className="hidden items-center gap-7 text-[0.875rem] text-ink-soft md:flex">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="link-underline transition-colors hover:text-ink"
              >
                {item.label}
              </a>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-ink-muted lg:inline-flex">
            <span className="live-dot" />
            Base Sepolia
          </span>
          <AuthPill />
        </div>
      </div>
    </header>
  )
}

function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6 text-ink"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {/* Editorial monogram: open book + orbiting node */}
        <path d="M3 5h6a3 3 0 0 1 3 3v11" />
        <path d="M21 5h-6a3 3 0 0 0-3 3v11" />
        <circle cx="20" cy="4" r="1.4" fill="currentColor" stroke="none" />
      </svg>
      <span className="flex items-baseline gap-1.5">
        <span className="font-display text-[1.0625rem] font-medium tracking-tight">
          Proof-of-Learn
        </span>
        <span className="hidden font-mono text-[0.625rem] uppercase tracking-[0.22em] text-ink-faint sm:inline">
          /v1
        </span>
      </span>
    </span>
  )
}
