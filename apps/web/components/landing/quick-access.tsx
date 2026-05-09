"use client"

import Link from "next/link"

/**
 * Three production-framed entry points above the hero. Each pill scopes
 * the visitor's first click to a role: students go to login (where the
 * sample-profile shortcut lives), sponsors do the same, recruiters land
 * directly on the public talent search.
 */
export function QuickAccess() {
  return (
    <section
      aria-label="Quick access by role"
      className="border-b border-rule bg-paper-deep/30"
    >
      <div className="mx-auto w-[min(1240px,94vw)] px-0 py-7 lg:py-9">
        <div className="flex flex-col items-start justify-between gap-5 lg:flex-row lg:items-center">
          <div className="max-w-md">
            <span className="font-mono text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-teal">
              Pick your view
            </span>
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-soft">
              Three roles, three flows — see the protocol from whichever side
              matters to you.
            </p>
          </div>
          <div className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-3 lg:w-auto lg:flex lg:gap-3">
            <RoleTile
              role="student"
              eyebrow="Earn"
              title="I want to learn"
              detail="Take a curriculum, pass the quiz, get paid in INR."
              href="/login?role=student"
            />
            <RoleTile
              role="sponsor"
              eyebrow="Fund"
              title="I want to sponsor"
              detail="Deposit USDC into bounties, watch verified completions."
              href="/login?role=sponsor"
              highlighted
            />
            <RoleTile
              role="recruit"
              eyebrow="Hire"
              title="I want to hire"
              detail="Search verified-on-chain talent. No login required."
              href="/recruit"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function RoleTile({
  role,
  eyebrow,
  title,
  detail,
  href,
  highlighted,
}: {
  role: "student" | "sponsor" | "recruit"
  eyebrow: string
  title: string
  detail: string
  href: string
  highlighted?: boolean
}) {
  return (
    <Link
      href={href}
      className={`group relative isolate flex flex-col justify-between overflow-hidden rounded-md border bg-surface px-4 py-3.5 transition-all duration-300 ease-out-quart hover:border-ink/30 lg:w-[18rem] ${
        highlighted ? "border-teal/40 bg-teal-soft/40" : "border-rule"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <RoleGlyph role={role} />
        <span className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-ink-faint">
          {eyebrow}
        </span>
      </div>
      <div className="mt-3.5">
        <div className="font-display text-[1.0625rem] font-medium tracking-tight text-ink">
          {title}
        </div>
        <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-muted">
          {detail}
        </p>
      </div>
      <div className="mt-3.5 inline-flex items-center gap-1 font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-ink-soft transition-colors group-hover:text-ink">
        Continue
        <span className="transition-transform duration-300 ease-out-quart group-hover:translate-x-0.5">
          →
        </span>
      </div>
    </Link>
  )
}

function RoleGlyph({ role }: { role: "student" | "sponsor" | "recruit" }) {
  const cls =
    "h-4 w-4 text-teal transition-transform duration-300 ease-out-quart group-hover:scale-110"
  if (role === "student") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden>
        <path d="M3 8l9-5 9 5-9 5-9-5z" />
        <path d="M7 10v5c2 1.5 8 1.5 10 0v-5" />
      </svg>
    )
  }
  if (role === "sponsor") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M9 8h5a2 2 0 0 1 0 4H9m0 0h6m-6 0v4h6" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden>
      <circle cx="11" cy="11" r="6" />
      <path d="M21 21l-5.5-5.5" />
    </svg>
  )
}
