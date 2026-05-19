"use client"

import { useEffect } from "react"
import Link from "next/link"

export default function SponsorError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[sponsor error boundary]", error)
  }, [error])

  return (
    <div className="mx-auto max-w-xl space-y-5 py-16">
      <div className="eyebrow eyebrow-tick text-[0.625rem] text-terracotta">
        Something went wrong
      </div>
      <h1 className="font-display text-[1.75rem] font-medium tracking-tight text-ink">
        We couldn't load the dashboard.
      </h1>
      <p className="text-[0.9375rem] leading-relaxed text-ink-muted">
        {error.message || "An unexpected error occurred."}
      </p>
      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[0.875rem] font-medium text-paper transition-colors hover:bg-ink/90"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-full border border-rule bg-surface px-5 py-2.5 text-[0.875rem] font-medium text-ink-soft transition-colors hover:border-ink/30 hover:text-ink"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
