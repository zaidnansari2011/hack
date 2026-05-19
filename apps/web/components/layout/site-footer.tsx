"use client"

import Link from "next/link"

import { useAuth } from "@/lib/use-auth"

// Three editorial link columns, plus a hero rail above and a meta strip
// below. Public-only — never links into a gated dashboard from the
// public chrome, so anonymous visitors never see a "Sign in to continue"
// redirect after clicking a footer link.
type FooterLink = { href: string; label: string; external?: boolean }
type FooterColumn = { eyebrow: string; title: string; links: FooterLink[] }

const COLUMNS: FooterColumn[] = [
  {
    eyebrow: "01",
    title: "Platform",
    links: [
      { href: "/about", label: "Manifesto" },
      { href: "/recruit", label: "Verified talent" },
    ],
  },
  {
    eyebrow: "02",
    title: "For learners",
    links: [
      { href: "/login?role=student", label: "Start learning" },
      { href: "/signup", label: "Create account" },
      { href: "/login", label: "Sign in" },
    ],
  },
  {
    eyebrow: "03",
    title: "For sponsors",
    links: [
      { href: "/login?role=sponsor", label: "Open a bounty" },
      { href: "/recruit", label: "Search talent" },
    ],
  },
]

export function SiteFooter() {
  const { user, hydrated } = useAuth()

  return (
    <footer className="mt-32 border-t border-rule">
      <div className="mx-auto w-[min(1240px,94vw)]">
        {/* ── Top rail: brand statement + CTAs ─────────────────────────── */}
        <section className="grid gap-10 py-16 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:py-20">
          <div>
            <Link href="/" className="inline-block">
              <img
                src="/edupaylogonew.svg"
                alt="EduPay"
                loading="lazy"
                className="h-14 w-auto"
              />
            </Link>
            <h2 className="mt-8 max-w-[18ch] font-display text-[2.25rem] font-medium leading-[1.05] tracking-tight text-ink lg:text-[2.75rem]">
              Resumes lie.{" "}
              <span className="display-italic text-teal">Receipts don&rsquo;t.</span>
            </h2>
            <p className="mt-5 max-w-md text-[0.9375rem] leading-relaxed text-ink-soft">
              Sponsor-funded learning, settled in INR over UPI in seconds.
              Every completion is committed on-chain so every receipt is
              independently verifiable.
            </p>
          </div>

          <div className="flex flex-col items-start gap-4 self-end lg:items-end">
            {hydrated && !user ? (
              <>
                <Link
                  href="/signup"
                  className="group inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[0.875rem] font-medium text-paper transition-all duration-300 ease-out-quart hover:bg-ink/85"
                >
                  Create an account
                  <span className="transition-transform duration-300 ease-out-quart group-hover:translate-x-0.5">
                    ↗
                  </span>
                </Link>
                <Link
                  href="/recruit"
                  className="link-underline text-[0.875rem] font-medium text-ink-soft transition-colors hover:text-ink"
                >
                  Or browse verified talent →
                </Link>
              </>
            ) : (
              <Link
                href="/recruit"
                className="link-underline text-[0.875rem] font-medium text-ink-soft transition-colors hover:text-ink"
              >
                Browse verified talent →
              </Link>
            )}
          </div>
        </section>

        <div className="h-px w-full bg-rule" />

        {/* ── Middle: link columns ─────────────────────────────────────── */}
        <section className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-3 lg:gap-16">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-ink-faint">
                  {col.eyebrow}
                </span>
                <h3 className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-ink-soft">
                  {col.title}
                </h3>
              </div>
              <ul className="mt-5 space-y-3">
                {col.links.map((l) => (
                  <li key={`${col.title}-${l.href}-${l.label}`}>
                    {l.external ? (
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noreferrer"
                        className="link-underline text-[0.9375rem] text-ink-soft transition-colors hover:text-ink"
                      >
                        {l.label}
                      </a>
                    ) : (
                      <Link
                        href={l.href}
                        className="link-underline text-[0.9375rem] text-ink-soft transition-colors hover:text-ink"
                      >
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <div className="h-px w-full bg-rule" />

        {/* ── Meta strip ───────────────────────────────────────────────── */}
        <section className="flex flex-col gap-5 py-7 text-[0.8125rem] text-ink-muted lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-ink-faint">
              © 2026 EduPay
            </span>
            <span className="hidden h-3 w-px bg-rule lg:inline-block" />
            <MetaPill dotClass="bg-teal" label="Escrow on Base" />
            <MetaPill dotClass="bg-amber" label="Paid via UPI" />
            <MetaPill dotClass="bg-terracotta" label="Soulbound credentials" />
          </div>

          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.scrollTo({ top: 0, behavior: "smooth" })
              }
            }}
            className="group inline-flex items-center gap-2 self-start font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-ink-faint transition-colors hover:text-ink lg:self-auto"
          >
            <span>Back to top</span>
            <span className="transition-transform duration-300 ease-out-quart group-hover:-translate-y-0.5">
              ↑
            </span>
          </button>
        </section>
      </div>
    </footer>
  )
}

function MetaPill({ dotClass, label }: { dotClass: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-faint">
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotClass}`} />
      {label}
    </span>
  )
}
