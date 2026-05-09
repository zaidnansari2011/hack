"use client"

import Link from "next/link"
import type { Bounty, Curriculum } from "@pol/shared"

export function BountyCard({
  bounty,
}: {
  bounty: Bounty & { curriculum: Curriculum }
}) {
  const seatsLeft = Math.max(0, bounty.maxStudents - bounty.enrolled)
  const seatPct = Math.min(
    100,
    Math.round((bounty.enrolled / Math.max(1, bounty.maxStudents)) * 100),
  )

  return (
    <Link
      href={`/learn/${bounty.id}`}
      className="group relative flex flex-col gap-5 rounded-md border border-rule bg-surface p-7 transition-all duration-300 ease-out-quart hover:border-ink/30"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-ink-faint">
            {bounty.curriculum.title} · ~{bounty.curriculum.estimatedMinutes} min
          </div>
          <h3 className="mt-2 font-display text-[1.25rem] font-medium leading-tight tracking-tight text-ink">
            {bounty.title}
          </h3>
        </div>
        <div className="text-right">
          <div className="tabular font-display text-[1.875rem] font-medium text-ink">
            ₹{bounty.rewardInr.toLocaleString("en-IN")}
          </div>
          <div className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-ink-faint">
            per completion
          </div>
        </div>
      </div>

      <p className="line-clamp-2 text-[0.875rem] leading-relaxed text-ink-muted">
        {bounty.description}
      </p>

      {bounty.curriculum.syllabus.length > 0 ? (
        <div className="space-y-1.5 border-l border-rule-soft pl-3">
          <div className="flex items-baseline justify-between text-[0.625rem] uppercase tracking-[0.22em] text-ink-faint">
            <span>Syllabus</span>
            <span className="tabular text-ink-soft">
              {bounty.curriculum.syllabus.length} modules
            </span>
          </div>
          <ul className="space-y-1 text-[0.8125rem] leading-snug text-ink-muted">
            {bounty.curriculum.syllabus.slice(0, 3).map((m, i) => (
              <li key={m.module} className="flex items-baseline gap-2">
                <span className="font-mono text-[0.625rem] text-ink-faint">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-ink-soft">{m.module}</span>
              </li>
            ))}
            {bounty.curriculum.syllabus.length > 3 && (
              <li className="pl-6 text-[0.6875rem] text-ink-faint">
                + {bounty.curriculum.syllabus.length - 3} more
              </li>
            )}
          </ul>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {bounty.curriculum.topics.slice(0, 4).map((t) => (
            <span
              key={t}
              className="rounded-full border border-rule bg-surface-soft px-2 py-0.5 text-[0.625rem] uppercase tracking-[0.18em] text-ink-muted"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto pt-3">
        <div className="flex items-center justify-between text-[0.625rem] uppercase tracking-[0.18em] text-ink-faint">
          <span>Seats</span>
          <span className="tabular text-ink-soft">
            {seatsLeft.toLocaleString("en-IN")} / {bounty.maxStudents.toLocaleString("en-IN")} open
          </span>
        </div>
        <div className="mt-1.5 h-px overflow-hidden bg-rule">
          <div
            className="h-full bg-teal transition-[width] duration-700 ease-out-quart"
            style={{ width: `${seatPct}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-rule-soft pt-4 text-[0.875rem] font-medium text-ink">
        <span className="link-underline">Start learning</span>
        <span className="text-ink-faint transition-transform duration-300 ease-out-quart group-hover:translate-x-1 group-hover:text-ink">
          →
        </span>
      </div>
    </Link>
  )
}
