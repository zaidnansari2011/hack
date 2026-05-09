"use client"

import { useEffect, useState } from "react"
import type { Bounty, Curriculum } from "@pol/shared"

import { ApiClientError, apiFetch } from "@/lib/api"
import { BountyCard } from "@/components/student/bounty-card"

type BountyWithCurriculum = Bounty & { curriculum: Curriculum }

export default function LearnIndexPage() {
  const [bounties, setBounties] = useState<BountyWithCurriculum[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Send the student's token so the API hides bounties they've already
    // completed — those move to the History page instead.
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

  return (
    <div className="space-y-12">
      <header className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-end lg:gap-16">
        <div>
          <div className="eyebrow eyebrow-tick">Bounty index</div>
          <h1 className="display-lg mt-3 max-w-[18ch] text-balance text-ink">
            Open bounties.{" "}
            <span className="display-italic text-teal">Pick one.</span>
          </h1>
        </div>
        <p className="text-balance text-[1.0625rem] leading-relaxed text-ink-muted">
          Each bounty is sponsor-funded, escrowed on Base, and pays out in INR
          via UPI within seconds of you passing its quiz. Pick a curriculum
          you'd like to learn — the tutor will walk you through it.
        </p>
      </header>

      {error && (
        <div className="border-l-2 border-terracotta bg-terracotta/5 px-4 py-2.5 text-[0.8125rem] text-terracotta">
          {error}
        </div>
      )}

      {bounties === null ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-80 animate-pulse rounded-md border border-rule bg-surface"
            />
          ))}
        </div>
      ) : bounties.length === 0 ? (
        <div className="grid place-items-center rounded-md border border-dashed border-rule bg-surface px-6 py-14 text-center">
          <div className="font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-ink-faint">
            Index empty
          </div>
          <h3 className="display-md mt-3 text-ink">
            No bounties active yet.
          </h3>
          <p className="mt-2 max-w-md text-[0.9375rem] text-ink-muted">
            Sponsors are funding new bounties — check back soon.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {bounties.map((b) => (
            <BountyCard key={b.id} bounty={b} />
          ))}
        </div>
      )}
    </div>
  )
}
