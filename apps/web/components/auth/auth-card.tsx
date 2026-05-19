import Link from "next/link"
import type { ReactNode } from "react"

/**
 * Editorial split-panel auth surface. Left column carries narrative weight
 * (a quote, fine-print proof points); right column is the form. On mobile
 * the form takes over and the narrative collapses to a small footer.
 */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
}) {
  return (
    <div className="relative isolate min-h-[calc(100vh-4rem)] overflow-hidden">
      <div className="mx-auto grid w-[min(1240px,94vw)] py-10 lg:grid-cols-[1fr_1fr] lg:gap-20 lg:py-20">
        <Narrative />
        <div className="relative">
          <div className="mx-auto w-full max-w-[440px] lg:ml-auto lg:mr-0">
            <div className="eyebrow eyebrow-tick">Access</div>
            <h1 className="display-md mt-4 text-balance text-ink">{title}</h1>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-muted">
              {subtitle}
            </p>

            <div className="mt-9">{children}</div>

            <div className="mt-8 border-t border-rule pt-5 text-[0.875rem] text-ink-muted">
              {footer}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Narrative() {
  return (
    <aside className="relative hidden flex-col justify-between lg:flex">
      <div>
        <Link href="/" className="font-display text-2xl font-medium text-ink">
          EduPay
        </Link>
        <div className="mt-12 max-w-md">
          <span className="font-mono text-[0.75rem] uppercase tracking-[0.22em] text-terracotta">
            Pull-quote
          </span>
          <blockquote className="mt-5 font-display text-[2.25rem] leading-[1.1] tracking-tight text-ink">
            "Learning should leave a mark. Not just a certificate. Every payout here is tied to something you
            <span className="display-italic text-teal">
              {" "}actually proved.{" "}
            </span>"
          </blockquote>
        </div>
      </div>

      <div className="hairline mt-16 grid gap-1 pt-8 text-[0.75rem] text-ink-muted">
        <Row label="Escrow on" value="Base Sepolia" />
        <Row label="Settlement" value="Razorpay UPI" />
        <Row label="Tutor LLM" value="Groq · Llama 3.1 70B" />
        <Row label="Vector store" value="pgvector + ts_rank" />
      </div>
    </aside>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3 border-b border-rule-soft py-1.5">
      <span className="w-32 font-mono uppercase tracking-[0.16em] text-ink-faint">
        {label}
      </span>
      <span className="text-ink-soft">{value}</span>
    </div>
  )
}
