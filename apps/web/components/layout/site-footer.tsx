"use client"

import Link from "next/link"

import { useAuth } from "@/lib/use-auth"

type FooterLink = { href: string; label: string; external?: boolean }

const LINKS: FooterLink[] = [
  { href: "/about", label: "Manifesto" },
  { href: "/recruit", label: "Talents" },
  { href: "/login?role=student", label: "For learners" },
  { href: "/login?role=sponsor", label: "For sponsors" },
]

export function SiteFooter() {
  const { user, hydrated } = useAuth()
  const homeHref = user
    ? user.role === "sponsor"
      ? "/dashboard"
      : "/learn"
    : "/"

  return (
    <footer className="mt-20 border-t border-rule">
      <div className="mx-auto w-[min(1240px,94vw)]">
        <section className="flex flex-col gap-4 py-6 text-[0.8125rem] text-ink-muted lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href={homeHref} className="inline-block">
              <img
                src="/edupaylogonew.svg"
                alt="EduPay"
                loading="lazy"
                className="h-6 w-auto"
              />
            </Link>
            <span className="hidden h-3 w-px bg-rule lg:inline-block" />
            {LINKS.map((l) =>
              l.external ? (
                <a
                  key={l.href}
                  href={l.href}
                  target="_blank"
                  rel="noreferrer"
                  className="link-underline text-[0.8125rem] text-ink-soft transition-colors hover:text-ink"
                >
                  {l.label}
                </a>
              ) : (
                <Link
                  key={l.href}
                  href={l.href}
                  className="link-underline text-[0.8125rem] text-ink-soft transition-colors hover:text-ink"
                >
                  {l.label}
                </Link>
              ),
            )}
            {hydrated && !user ? (
              <Link
                href="/signup"
                className="link-underline text-[0.8125rem] font-medium text-ink transition-colors hover:text-ink"
              >
                Create account →
              </Link>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-ink-faint">
              © 2026 EduPay
            </span>
            <span className="hidden h-3 w-px bg-rule lg:inline-block" />
            <MetaPill dotClass="bg-teal" label="Base" />
            <MetaPill dotClass="bg-amber" label="UPI" />
            <MetaPill dotClass="bg-terracotta" label="Soulbound" />
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.scrollTo({ top: 0, behavior: "smooth" })
                }
              }}
              className="group inline-flex items-center gap-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-ink-faint transition-colors hover:text-ink"
            >
              <span>Top</span>
              <span className="transition-transform duration-300 ease-out-quart group-hover:-translate-y-0.5">
                ↑
              </span>
            </button>
          </div>
        </section>
      </div>
    </footer>
  )
}

function MetaPill({ dotClass, label }: { dotClass: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-faint">
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotClass}`} />
      {label}
    </span>
  )
}
