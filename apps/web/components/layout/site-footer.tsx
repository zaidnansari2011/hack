import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="mt-32 border-t border-rule text-[0.875rem]">
      <div className="mx-auto flex w-[min(1240px,94vw)] flex-col items-center justify-between gap-6 py-10 md:flex-row md:gap-0">
        <div>
          <Link
            href="/"
            className="font-display text-lg font-medium tracking-tight text-ink"
          >
            Proof-of-Learn
          </Link>
          <p className="mt-1 text-ink-muted">
            Real money for real learning.
          </p>
        </div>

        <nav className="flex items-center gap-6 text-ink-soft md:gap-8">
          <Link href="/about" className="transition-colors hover:text-ink">About</Link>
          <Link href="/api-docs" className="transition-colors hover:text-ink">API</Link>
          <Link href="/login" className="transition-colors hover:text-ink">Sign in</Link>
        </nav>
      </div>
    </footer>
  )
}

