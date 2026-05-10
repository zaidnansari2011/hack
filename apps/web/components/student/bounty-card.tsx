"use client"

import Link from "next/link"
import type { Bounty, Curriculum } from "@pol/shared"

export function BountyCard({
  bounty,
}: {
  bounty: Bounty & { curriculum: Curriculum }
}) {
  const seatsLeft = Math.max(0, bounty.maxStudents - bounty.enrolled)

  const full = seatsLeft === 0
  const scarce = seatsLeft > 0 && seatsLeft <= 15

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
      {/* Title + reward pill */}
      <div className="flex items-start justify-between gap-4">
        <h3 className="font-display text-[1.25rem] font-medium leading-snug tracking-tight text-ink">
          {bounty.curriculum.title}
        </h3>
        <span className="shrink-0 rounded-full border border-teal/30 bg-teal/5 px-3 py-1 font-display text-[1rem] font-medium tabular text-teal">
          ₹{bounty.rewardInr.toLocaleString("en-IN")}
        </span>
      </div>

      {/* Short description */}
      <p className="mt-3 line-clamp-2 text-[0.875rem] leading-relaxed text-ink-muted">
        {bounty.description}
      </p>

      {/* Curriculum Topics */}
      {bounty.curriculum.topics && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {bounty.curriculum.topics.map((t: string) => (
            <span key={t} className="inline-flex rounded border border-rule px-1.5 py-[1px] font-mono text-[0.5625rem] uppercase tracking-wide text-ink-faint">
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
