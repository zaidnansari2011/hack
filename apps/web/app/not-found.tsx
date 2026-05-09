import Link from "next/link"

export default function NotFound() {
  return (
    <main className="min-h-[70vh] bg-paper">
      <div className="mx-auto flex w-[min(720px,92vw)] flex-col items-start py-32">
        <span className="font-mono text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-teal">
          404 · not on the ledger
        </span>
        <h1 className="mt-6 font-display text-[3rem] font-medium leading-[1.05] tracking-tight text-ink lg:text-[3.5rem]">
          That page is{" "}
          <span className="display-italic text-teal">not in the chain</span>.
        </h1>
        <p className="mt-6 max-w-xl text-[0.9375rem] leading-relaxed text-ink-soft">
          You may have followed a stale link, or the credential you&rsquo;re
          looking for hasn&rsquo;t been minted yet. Try one of these surfaces.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[0.875rem] font-medium text-paper transition-colors hover:bg-ink/90"
          >
            Back to home
          </Link>
          <Link
            href="/recruit"
            className="inline-flex items-center gap-2 rounded-full border border-rule bg-surface px-5 py-2.5 text-[0.875rem] font-medium text-ink-soft transition-colors hover:border-ink/30 hover:text-ink"
          >
            Browse verified talent
          </Link>
          <Link
            href="/about"
            className="inline-flex items-center gap-2 rounded-full border border-rule bg-surface px-5 py-2.5 text-[0.875rem] font-medium text-ink-soft transition-colors hover:border-ink/30 hover:text-ink"
          >
            What is this?
          </Link>
        </div>
      </div>
    </main>
  )
}
