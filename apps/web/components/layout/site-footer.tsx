import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="mt-32 border-t border-rule">
      <div className="mx-auto w-[min(1240px,94vw)] py-14">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link
              href="/"
              className="font-display text-[1.75rem] font-medium tracking-tight text-ink"
            >
              Proof-of-Learn
            </Link>
            <p className="mt-3 max-w-md text-[0.9375rem] leading-relaxed text-ink-muted">
              An editorial-grade proof-of-learning protocol. Sponsors fund
              outcomes; the chain proves them; UPI settles them.
            </p>
            <div className="mt-6 flex items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-ink-muted">
              <span className="live-dot" />
              Operating on Base Sepolia
            </div>
          </div>

          <FooterColumn
            heading="Surfaces"
            links={[
              { label: "Sponsor portal", href: "/dashboard" },
              { label: "Bounty index", href: "/learn" },
              { label: "Earnings ledger", href: "/payouts" },
            ]}
          />

          <FooterColumn
            heading="The protocol"
            links={[
              { label: "Manifesto", href: "/#manifesto" },
              { label: "Methodology", href: "/#methodology" },
              { label: "Live activity", href: "/#live" },
            ]}
          />

          <FooterColumn
            heading="Resources"
            links={[
              { label: "Sign in", href: "/login" },
              { label: "Create account", href: "/signup" },
              { label: "Demo runbook", href: "/" },
            ]}
          />
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-rule-soft pt-6 text-[0.75rem] text-ink-faint md:flex-row md:items-center md:justify-between">
          <p className="font-mono uppercase tracking-[0.18em]">
            © 2026 — Proof-of-Learn protocol · v0.1
          </p>
          <p className="font-mono">
            Built with Next.js · Framer Motion · Foundry · Prisma
          </p>
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({
  heading,
  links,
}: {
  heading: string
  links: { label: string; href: string }[]
}) {
  return (
    <div>
      <div className="eyebrow eyebrow-tick">{heading}</div>
      <ul className="mt-4 space-y-2.5 text-[0.9375rem]">
        {links.map((l) => (
          <li key={`${heading}-${l.label}`}>
            <Link
              href={l.href}
              className="link-underline text-ink-soft transition-colors hover:text-ink"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
