"use client"

import { useEffect } from "react"
import Link from "next/link"

// Root-level error boundary. Catches anything thrown during client rendering
// of any route that doesn't have a closer error.tsx. We keep this surface
// minimal — a retry CTA and a way home is the goal.
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Send to your real error reporter here. Console is the placeholder.
    console.error("[root error boundary]", error)
  }, [error])

  return (
    <main className="min-h-[70vh] bg-paper">
      <div className="mx-auto flex w-[min(720px,92vw)] flex-col items-start py-32">
        <span className="font-mono text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-terracotta">
          Unexpected error
        </span>
        <h1 className="mt-6 font-display text-[3rem] font-medium leading-[1.05] tracking-tight text-ink lg:text-[3.5rem]">
          Something{" "}
          <span className="display-italic text-terracotta">slipped</span>.
        </h1>
        <p className="mt-6 max-w-xl text-[0.9375rem] leading-relaxed text-ink-soft">
          This usually clears with a retry. If it keeps happening, the
          digest below helps us track it down.
        </p>
        {error.digest && (
          <code className="mt-4 inline-block rounded border border-rule bg-surface-soft px-2 py-1 font-mono text-[0.6875rem] text-ink-muted">
            ref · {error.digest}
          </code>
        )}
        <div className="mt-9 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[0.875rem] font-medium text-paper transition-colors hover:bg-ink/90"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-rule bg-surface px-5 py-2.5 text-[0.875rem] font-medium text-ink-soft transition-colors hover:border-ink/30 hover:text-ink"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  )
}
