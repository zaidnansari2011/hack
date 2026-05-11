"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { ApiClientError, apiFetch } from "@/lib/api"
import { BountyCard } from "@/components/student/bounty-card"
import { BountyFilters } from "@/components/student/bounty-filters"
import { BountyToolbar } from "@/components/student/bounty-toolbar"
import {
  EMPTY_FILTERS,
  activeFilterCount,
  applyFilters,
  filtersFromSearchParams,
  filtersToSearchParams,
  isDefaultFilters,
  type BountyFilterState,
  type BountyWithCurriculum,
} from "@/lib/bounty-filters"

export default function LearnIndexPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [bounties, setBounties] = useState<BountyWithCurriculum[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<BountyFilterState>(() =>
    filtersFromSearchParams(searchParams),
  )
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  // Fetch once on mount.
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

  // Reflect filter state into the URL (replace, not push — back button shouldn't
  // accumulate one entry per keystroke).
  const skipFirstUrlWrite = useRef(true)
  useEffect(() => {
    if (skipFirstUrlWrite.current) {
      skipFirstUrlWrite.current = false
      return
    }
    const params = filtersToSearchParams(filters)
    const qs = params.toString()
    router.replace(qs ? `/learn?${qs}` : "/learn", { scroll: false })
  }, [filters, router])

  const filtered = useMemo(
    () => (bounties ? applyFilters(bounties, filters) : null),
    [bounties, filters],
  )

  const onClear = () => setFilters({ ...EMPTY_FILTERS })

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

      {/* Search bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
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
            value={filters.query}
            onChange={(e) =>
              setFilters({ ...filters, query: e.target.value })
            }
            placeholder="Search titles, sponsors, topics, syllabus…"
            className="w-full rounded-xl border border-rule bg-surface py-3 pl-11 pr-4 text-[0.9375rem] text-ink placeholder:text-ink-faint focus:border-ink/30 focus:outline-none focus:ring-2 focus:ring-ink/8 transition-colors duration-200"
          />
          {filters.query && (
            <button
              type="button"
              onClick={() => setFilters({ ...filters, query: "" })}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink transition-colors"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        {/* Mobile-only filter button */}
        <button
          type="button"
          onClick={() => setMobileFiltersOpen(true)}
          className="lg:hidden inline-flex items-center gap-2 rounded-xl border border-rule bg-surface px-4 text-[0.875rem] font-medium text-ink hover:border-ink/30"
        >
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden
          >
            <path d="M3 5h14M5 10h10M8 15h4" />
          </svg>
          Filters
          {activeFilterCount(filters) > 0 && (
            <span className="rounded-full bg-ink px-1.5 py-0.5 font-mono text-[0.625rem] text-paper">
              {activeFilterCount(filters)}
            </span>
          )}
        </button>
      </div>

      {error && (
        <div className="border-l-2 border-terracotta bg-terracotta/5 px-4 py-2.5 text-[0.8125rem] text-terracotta">
          {error}
        </div>
      )}

      {/* Two-pane layout */}
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* Filter rail — desktop */}
        <div className="hidden lg:block">
          {bounties && (
            <BountyFilters
              bounties={bounties}
              state={filters}
              onChange={setFilters}
              onClear={onClear}
            />
          )}
        </div>

        {/* Results column */}
        <div className="space-y-5">
          {bounties && filtered && (
            <BountyToolbar
              state={filters}
              bounties={bounties}
              resultCount={filtered.length}
              totalCount={bounties.length}
              onChange={setFilters}
              onClear={onClear}
            />
          )}

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
            <EmptyState filters={filters} onClear={onClear} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filtered.map((b) => (
                <BountyCard key={b.id} bounty={b} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {mobileFiltersOpen && bounties && (
        <MobileFilterDrawer
          onClose={() => setMobileFiltersOpen(false)}
          activeCount={activeFilterCount(filters)}
        >
          <BountyFilters
            bounties={bounties}
            state={filters}
            onChange={setFilters}
            onClear={onClear}
          />
        </MobileFilterDrawer>
      )}
    </div>
  )
}

function EmptyState({
  filters,
  onClear,
}: {
  filters: BountyFilterState
  onClear: () => void
}) {
  const hasFilters = !isDefaultFilters(filters)
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-rule bg-surface px-6 py-16 text-center">
      <div className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-ink-faint">
        {hasFilters ? "No matches" : "Nothing live yet"}
      </div>
      <h3 className="display-md mt-4 text-ink">
        {hasFilters
          ? "Nothing matches your filters."
          : "No bounties open right now."}
      </h3>
      {hasFilters ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-4 text-[0.875rem] font-medium text-ink-soft underline-offset-4 hover:text-ink hover:underline"
        >
          Clear all filters
        </button>
      ) : (
        <p className="mt-3 max-w-sm text-[0.9375rem] leading-relaxed text-ink-muted">
          Sponsors are setting up new bounties. Check back soon.
        </p>
      )}
    </div>
  )
}

function MobileFilterDrawer({
  children,
  activeCount,
  onClose,
}: {
  children: React.ReactNode
  activeCount: number
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex lg:hidden">
      <button
        type="button"
        aria-label="Close filters"
        onClick={onClose}
        className="flex-1 bg-ink/40"
      />
      <div className="w-[88%] max-w-sm overflow-y-auto bg-paper p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div className="font-display text-[1.125rem] font-medium text-ink">
            Filters{" "}
            {activeCount > 0 && (
              <span className="ml-1 rounded-full bg-ink px-1.5 py-0.5 font-mono text-[0.625rem] text-paper">
                {activeCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-faint hover:text-ink"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        {children}
        <button
          type="button"
          onClick={onClose}
          className="mt-8 w-full rounded-xl bg-ink py-3 text-[0.875rem] font-medium text-paper hover:bg-ink/90"
        >
          Show results
        </button>
      </div>
    </div>
  )
}
