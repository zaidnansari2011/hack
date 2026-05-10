"use client"

import { useEffect, useMemo, useState } from "react"
import type { Bounty, Curriculum } from "@pol/shared"

import { ApiClientError, apiFetch } from "@/lib/api"
import { BountyCard } from "@/components/student/bounty-card"

type BountyWithCurriculum = Bounty & { curriculum: Curriculum }

export default function LearnIndexPage() {
  const [bounties, setBounties] = useState<BountyWithCurriculum[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")

  useEffect(() => {
    apiFetch<{ bounties: BountyWithCurriculum[] }>("/bounties")
      .then(({ bounties }) => setBounties(bounties))
      .catch((err) =>
        setError(
          err instanceof ApiClientError
            ? err.message
            : "Could not load bounties",
        ),
      )
  }, [])

  const filtered = useMemo(() => {
    if (!bounties) return null
    const q = query.trim().toLowerCase()
    if (!q) return bounties
    return bounties.filter(
      (b) =>
        b.curriculum.title.toLowerCase().includes(q) ||
        b.description?.toLowerCase().includes(q) ||
        b.curriculum.topics.some((t) => t.toLowerCase().includes(q)),
    )
  }, [bounties, query])

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-end lg:gap-16">
        <div>
          <div className="eyebrow eyebrow-tick">Open bounties</div>
          <h1 className="display-lg mt-3 max-w-[18ch] text-balance text-ink">
            Pick what to{" "}
            <span className="display-italic text-teal">learn next.</span>
          </h1>
        </div>
        <p className="text-[1rem] leading-relaxed text-ink-muted">
          Every bounty is sponsor-funded. Work through the curriculum with the
          AI tutor, pass the quiz, and get paid. Usually within seconds.
        </p>
      </header>

      {/* Search */}
      <div className="relative">
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
          aria-hidden
        >
          <circle cx="9" cy="9" r="5.5" />
          <path d="M16 16l-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search topics, skills…"
          className="w-full rounded-xl border border-rule bg-surface py-3 pl-11 pr-4 text-[0.9375rem] text-ink placeholder:text-ink-faint focus:border-ink/30 focus:outline-none focus:ring-2 focus:ring-ink/8 transition-colors duration-200"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink transition-colors"
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      {error && (
        <div className="border-l-2 border-terracotta bg-terracotta/5 px-4 py-2.5 text-[0.8125rem] text-terracotta">
          {error}
        </div>
      )}

      {/* Cards */}
      {filtered === null ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-56 animate-pulse rounded-xl border border-rule bg-surface"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-rule bg-surface px-6 py-16 text-center">
          <div className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-ink-faint">
            {query ? "No matches" : "Nothing live yet"}
          </div>
          <h3 className="display-md mt-4 text-ink">
            {query ? `Nothing for "${query}"` : "No bounties open right now."}
          </h3>
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="mt-4 text-[0.875rem] font-medium text-ink-soft underline-offset-4 hover:text-ink hover:underline"
            >
              Clear search
            </button>
          ) : (
            <p className="mt-3 max-w-sm text-[0.9375rem] leading-relaxed text-ink-muted">
              Sponsors are setting up new bounties. Check back soon.
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((b) => (
            <BountyCard key={b.id} bounty={b} />
          ))}
        </div>
      )}
    </div>
  )
}
