"use client"

import Link from "next/link"
import { useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import type { Bounty, Curriculum } from "@pol/shared"

import { CATEGORY_META, DIFFICULTY_META } from "@/lib/bounty-filters"
import { useScrollLock } from "@/lib/use-scroll-lock"

type BountyWithCurriculum = Bounty & { curriculum: Curriculum }

export function BountyModal({
  bounty,
  onClose,
}: {
  bounty: BountyWithCurriculum | null
  onClose: () => void
}) {
  useScrollLock(Boolean(bounty))

  useEffect(() => {
    if (!bounty) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [bounty, onClose])

  const cat = bounty ? CATEGORY_META[bounty.curriculum.category] : null
  const diff = bounty ? DIFFICULTY_META[bounty.curriculum.difficulty] : null

  return (
    <AnimatePresence>
      {bounty && cat && diff && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" />

          {/* Sheet */}
          <motion.div
            className="relative z-10 flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-rule bg-surface shadow-[0_32px_80px_-20px_hsl(218_45%_10%_/_0.4)]"
            style={{ maxHeight: "90svh" }}
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex-none border-b border-rule p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-2 flex items-center gap-2 text-[0.8125rem] text-ink-muted">
                    <CategoryDot tone={cat.tone} />
                    <span className="font-medium text-ink-soft">{cat.label}</span>
                    <span className="text-ink-faint">·</span>
                    <span>{diff.label}</span>
                  </div>
                  <h2 className="font-display text-[1.5rem] font-medium leading-snug tracking-tight text-ink">
                    {bounty.curriculum.title}
                  </h2>
                  {bounty.sponsorName && (
                    <p className="mt-1 text-[0.8125rem] text-ink-faint">{bounty.sponsorName}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="shrink-0 grid h-8 w-8 place-items-center rounded-full border border-rule text-[1.125rem] leading-none text-ink-faint transition-colors hover:border-ink/30 hover:text-ink"
                >
                  ×
                </button>
              </div>

              <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-muted">
                {bounty.description}
              </p>

              {/* Info pills */}
              <div className="mt-4 flex flex-wrap gap-2">
                {bounty.curriculum.estimatedMinutes > 0 && (
                  <span className="inline-flex items-center rounded-full border border-rule bg-paper px-3 py-1 text-[0.8125rem] text-ink-faint">
                    ~{bounty.curriculum.estimatedMinutes} min
                  </span>
                )}
                <span className="inline-flex items-center rounded-full border border-rule bg-paper px-3 py-1 text-[0.8125rem] text-ink-faint">
                  {bounty.curriculum.syllabus.length} modules
                </span>
                <span className="inline-flex items-center rounded-full border border-teal/30 bg-teal/5 px-3 py-1 font-display text-[0.9375rem] font-medium text-teal">
                  ₹{bounty.rewardInr.toLocaleString("en-IN")} on pass
                </span>
              </div>
            </div>

            {/* Module list — scrollable */}
            {bounty.curriculum.syllabus.length > 0 && (
              <div className="min-h-0 flex-1 overflow-y-auto p-6">
                <p className="mb-3 text-[0.75rem] text-ink-faint">
                  {bounty.curriculum.syllabus.length} modules in this course
                </p>
                <ol className="space-y-2">
                  {bounty.curriculum.syllabus.map((m, i) => (
                    <li
                      key={m.module}
                      className="flex gap-4 rounded-xl border border-rule bg-paper p-4"
                    >
                      <span className="shrink-0 pt-0.5 font-mono text-[0.625rem] text-ink-faint">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-display text-[0.9375rem] font-medium leading-snug text-ink">
                          {m.module}
                        </div>
                        {m.summary && (
                          <div className="mt-1 text-[0.8125rem] leading-relaxed text-ink-muted">
                            {m.summary}
                          </div>
                        )}
                      </div>
                      <span className="shrink-0 pt-0.5 font-mono text-[0.625rem] text-ink-faint">
                        {m.durationMinutes}m
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Sticky footer CTA */}
            <div className="flex-none border-t border-rule bg-surface px-6 py-4">
              <div className="flex items-center gap-3">
                <Link
                  href={`/learn/${bounty.slug}`}
                  className="group inline-flex items-center gap-2 rounded-full bg-ink px-6 py-2.5 text-[0.875rem] font-medium text-paper transition-all duration-300 hover:bg-ink/85 hover:shadow-[0_6px_20px_-8px_hsl(218_45%_10%_/_0.35)]"
                >
                  Start learning
                  <span className="transition-transform duration-300 group-hover:translate-x-0.5">
                    →
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-[0.875rem] text-ink-faint transition-colors hover:text-ink"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function CategoryDot({ tone }: { tone: string }) {
  const bg =
    ({
      ink: "bg-ink",
      teal: "bg-teal",
      amber: "bg-amber",
      terracotta: "bg-terracotta",
      forest: "bg-forest",
      mint: "bg-forest",
    } as Record<string, string>)[tone] ?? "bg-ink"
  return <span aria-hidden className={`inline-block h-1.5 w-1.5 rounded-full ${bg}`} />
}
