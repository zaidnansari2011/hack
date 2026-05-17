"use client"

import Link from "next/link"
import type { Bounty, Curriculum } from "@pol/shared"

import {
  CATEGORY_META,
  DIFFICULTY_META,
} from "@/lib/bounty-filters"

export function BountyCard({
  bounty,
}: {
  bounty: Bounty & { curriculum: Curriculum }
}) {
  const seatsLeft = Math.max(0, bounty.maxStudents - bounty.enrolled)

  const full = seatsLeft === 0
  const scarce = seatsLeft > 0 && seatsLeft <= 15
  const cat = CATEGORY_META[bounty.curriculum.category]
  const diff = DIFFICULTY_META[bounty.curriculum.difficulty]

  return (
    <Link
      href={full ? "#" : `/learn/${bounty.id}`}
      aria-disabled={full}
      className={`group flex flex-col rounded-xl border bg-surface p-6 transition-all duration-300 ease-out-quart
        ${full
          ? "pointer-events-none border-rule opacity-50"
          : "border-rule hover:border-ink/20 hover:shadow-[0_4px_24px_-8px_hsl(218_39%_12%_/_0.10)]"
        }`}
    >
      {/* Category + difficulty row */}
      <div className="mb-3 flex items-center gap-2 text-[0.8125rem] text-ink-muted">
        <span className="inline-flex items-center gap-1.5 font-medium text-ink-soft">
          <CategoryDot tone={cat.tone} />
          {cat.label}
        </span>
        <span aria-hidden className="text-ink-faint">·</span>
        <span>{diff.label}</span>
      </div>

      {/* Title + reward pill */}
      <div className="flex items-start justify-between gap-4">
        <h3 className="font-display text-[1.25rem] font-medium leading-snug tracking-tight text-ink">
          {bounty.curriculum.title}
        </h3>
        <span className="shrink-0 rounded-full border border-teal/30 bg-teal/5 px-3 py-1 font-display text-[1rem] font-medium tabular text-teal">
          ₹{bounty.rewardInr.toLocaleString("en-IN")}
        </span>
      </div>

      {/* Sponsor */}
      {bounty.sponsorName && (
        <p className="mt-1 text-[0.8125rem] text-ink-faint">
          {bounty.sponsorName}
        </p>
      )}

      {/* Short description */}
      <p className="mt-3 line-clamp-2 text-[0.875rem] leading-relaxed text-ink-muted">
        {bounty.description}
      </p>

      {/* Topic tags */}
      {bounty.curriculum.topics && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {bounty.curriculum.topics.slice(0, 4).map((t: string) => (
            <span
              key={t}
              className="inline-flex rounded border border-rule px-2 py-0.5 text-[0.6875rem] text-ink-muted"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Footer: seats · minutes · arrow */}
      <div className="mt-auto flex items-center justify-between pt-6">
        <div className="flex items-center gap-3 font-mono text-[0.6875rem] text-ink-faint">
          <span className={scarce ? "text-terracotta" : ""}>
            {full
              ? "Full"
              : scarce
                ? `${seatsLeft} seats left`
                : `${seatsLeft.toLocaleString("en-IN")} seats`}
          </span>
          <span>·</span>
          <span>~{bounty.curriculum.estimatedMinutes} min</span>
        </div>
        {!full && (
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-ink text-[0.875rem] text-paper transition-all duration-300 ease-out-quart group-hover:bg-ink/80 group-hover:translate-x-0.5">
            →
          </span>
        )}
      </div>
    </Link>
  )
}

function CategoryDot({ tone }: { tone: string }) {
  const bg =
    {
      ink: "bg-ink",
      teal: "bg-teal",
      amber: "bg-amber",
      terracotta: "bg-terracotta",
      forest: "bg-forest",
      mint: "bg-forest",
    }[tone] ?? "bg-ink"
  return (
    <span aria-hidden className={`inline-block h-1.5 w-1.5 rounded-full ${bg}`} />
  )
}
