"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useMemo, useState } from "react"
import type { Bounty, Curriculum } from "@pol/shared"

import { ApiClientError, apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ease } from "@/lib/motion"
import { useScrollLock } from "@/lib/use-scroll-lock"
import { cn } from "@/lib/utils"

export function NewBountyModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [curricula, setCurricula] = useState<Curriculum[]>([])
  const [curriculumId, setCurriculumId] = useState("")
  const [curriculumQuery, setCurriculumQuery] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [rewardInr, setRewardInr] = useState(250)
  const [maxStudents, setMaxStudents] = useState(100)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<Bounty | null>(null)
  const [view, setView] = useState<"form" | "confirm">("form")

  useEffect(() => {
    if (!open || curricula.length > 0) return
    apiFetch<{ curricula: Curriculum[] }>("/curricula", { token: null })
      .then(({ curricula }) => {
        setCurricula(curricula)
        if (curricula.length > 0) setCurriculumId(curricula[0].id)
      })
      .catch(() => undefined)
  }, [open, curricula.length])

  useScrollLock(open)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !submitting) onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, submitting, onClose])

  const totalInr = useMemo(
    () => Math.max(0, rewardInr) * Math.max(0, maxStudents),
    [rewardInr, maxStudents],
  )

  const filteredCurricula = useMemo(() => {
    const q = curriculumQuery.trim().toLowerCase()
    if (!q) return curricula
    return curricula.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.summary.toLowerCase().includes(q) ||
        c.topics.some((t) => t.toLowerCase().includes(q)),
    )
  }, [curricula, curriculumQuery])

  // The form submit now advances to a confirm step instead of firing the
  // request directly. Real money (escrowed USDC) sits behind this call, so
  // a one-tap review prevents fat-finger mistakes on reward/seats.
  function onFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setView("confirm")
  }

  async function confirmFund() {
    setError(null)
    setSubmitting(true)
    try {
      const data = await apiFetch<{ bounty: Bounty }>("/bounties", {
        method: "POST",
        json: {
          title,
          description,
          curriculumId,
          rewardInr: Number(rewardInr),
          maxStudents: Number(maxStudents),
        },
      })
      setCreated(data.bounty)
      onCreated()
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : "Could not create the bounty",
      )
      setView("form")
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setCreated(null)
    setTitle("")
    setDescription("")
    setRewardInr(250)
    setMaxStudents(100)
    setError(null)
    setView("form")
  }

  const selectedCurriculum = curricula.find((c) => c.id === curriculumId)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={() => !submitting && onClose()}
        >
          <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" />
          <motion.div
            className="relative z-10 flex max-h-[90svh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-rule bg-surface shadow-[0_32px_80px_-20px_hsl(218_45%_10%_/_0.4)]"
            initial={{ opacity: 0, y: 22, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.26, ease: ease.outQuart }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-rule px-6 py-4">
              <div>
                <div className="eyebrow eyebrow-tick text-[0.625rem]">New bounty</div>
                <h2 className="mt-1 font-display text-[1.25rem] font-medium text-ink">
                  {created
                    ? "Bounty funded"
                    : view === "confirm"
                      ? "Confirm escrow"
                      : "Open an escrow"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => !submitting && onClose()}
                aria-label="Close"
                className="grid h-7 w-7 place-items-center rounded-full border border-rule text-ink-faint transition-colors hover:border-ink/30 hover:text-ink"
              >
                ×
              </button>
            </div>

            {created ? (
              <div className="space-y-5 p-6">
                <div className="flex items-start gap-4 rounded-xl border border-forest/30 bg-forest/5 p-5">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-forest text-paper">
                    ✓
                  </div>
                  <div>
                    <p className="font-display text-[1rem] font-medium text-ink">
                      Escrow holds ₹
                      {(created.rewardInr * created.maxStudents).toLocaleString("en-IN")}
                    </p>
                    <p className="mt-1 text-[0.875rem] text-ink-muted">
                      Up to {created.maxStudents.toLocaleString("en-IN")} verified
                      completions at ₹{created.rewardInr.toLocaleString("en-IN")} each.
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={reset}
                    className="text-[0.875rem] text-ink-faint transition-colors hover:text-ink"
                  >
                    Fund another
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full bg-ink px-5 py-2 text-[0.875rem] font-medium text-paper transition-colors hover:bg-ink/85"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : view === "confirm" ? (
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
                <div className="rounded-xl border border-rule bg-paper-deep/40 p-5">
                  <div className="eyebrow eyebrow-tick text-[0.625rem]">
                    Review
                  </div>
                  <h3 className="mt-1 font-display text-[1.0625rem] font-medium text-ink">
                    {title}
                  </h3>
                  <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-muted">
                    {description}
                  </p>
                  <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-rule pt-4 text-[0.8125rem]">
                    <dt className="text-ink-faint">Curriculum</dt>
                    <dd className="truncate text-right text-ink">
                      {selectedCurriculum?.title ?? "—"}
                    </dd>
                    <dt className="text-ink-faint">Reward / student</dt>
                    <dd className="text-right text-ink">
                      ₹{Number(rewardInr).toLocaleString("en-IN")}
                    </dd>
                    <dt className="text-ink-faint">Max students</dt>
                    <dd className="text-right text-ink">
                      {Number(maxStudents).toLocaleString("en-IN")}
                    </dd>
                  </dl>
                </div>
                <div className="rounded-xl border border-teal/30 bg-teal-soft/40 p-5">
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-teal">
                      Escrow charge
                    </span>
                    <span className="tabular font-display text-[1.5rem] font-medium text-ink">
                      ₹{totalInr.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-muted">
                    Held on Base in USDC. Refundable for any seats that don't get claimed.
                  </p>
                </div>

                {error && (
                  <div className="border-l-2 border-terracotta bg-terracotta/5 px-4 py-2 text-[0.8125rem] text-terracotta">
                    {error}
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 border-t border-rule pt-5">
                  <button
                    type="button"
                    onClick={() => setView("form")}
                    disabled={submitting}
                    className="text-[0.875rem] text-ink-faint transition-colors hover:text-ink disabled:opacity-50"
                  >
                    ← Edit
                  </button>
                  <Button
                    type="button"
                    onClick={confirmFund}
                    disabled={submitting}
                  >
                    {submitting
                      ? "Funding escrow…"
                      : `Confirm · ₹${totalInr.toLocaleString("en-IN")}`}
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={onFormSubmit} className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
                <div className="space-y-2">
                  <Label htmlFor="nb-title">Bounty title</Label>
                  <Input
                    id="nb-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Learn Rust, earn ₹250"
                    required
                    minLength={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nb-desc">Pitch to students</Label>
                  <Textarea
                    id="nb-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="One short paragraph that shows up on the student feed."
                    required
                    minLength={10}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Curriculum</Label>
                  {curricula.length === 0 ? (
                    <div className="text-[0.8125rem] text-ink-muted">
                      Loading available curricula…
                    </div>
                  ) : (
                    <>
                      <Input
                        type="search"
                        value={curriculumQuery}
                        onChange={(e) => setCurriculumQuery(e.target.value)}
                        placeholder="Search curricula by name, summary, or topic…"
                      />
                      <div className="max-h-44 space-y-px overflow-y-auto rounded-md border border-rule">
                        {filteredCurricula.length === 0 ? (
                          <div className="px-4 py-3 text-[0.8125rem] text-ink-faint">
                            No curricula match “{curriculumQuery}”.
                          </div>
                        ) : (
                          filteredCurricula.map((c) => {
                            const active = curriculumId === c.id
                            return (
                              <button
                                type="button"
                                key={c.id}
                                onClick={() => setCurriculumId(c.id)}
                                className={cn(
                                  "flex w-full items-baseline justify-between gap-3 px-4 py-2.5 text-left transition-colors",
                                  active ? "bg-teal-tint" : "bg-surface hover:bg-surface-soft",
                                )}
                              >
                                <span className="truncate text-[0.875rem] font-medium text-ink">
                                  {c.title}
                                </span>
                                <span className="shrink-0 font-mono text-[0.625rem] text-ink-faint">
                                  ~{c.estimatedMinutes}m
                                </span>
                              </button>
                            )
                          })
                        )}
                      </div>
                    </>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nb-reward">Reward / student (₹)</Label>
                    <Input
                      id="nb-reward"
                      type="number"
                      min={1}
                      value={rewardInr}
                      onChange={(e) => setRewardInr(Number(e.target.value))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nb-seats">Max students</Label>
                    <Input
                      id="nb-seats"
                      type="number"
                      min={1}
                      value={maxStudents}
                      onChange={(e) => setMaxStudents(Number(e.target.value))}
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="border-l-2 border-terracotta bg-terracotta/5 px-4 py-2 text-[0.8125rem] text-terracotta">
                    {error}
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 border-t border-rule pt-5">
                  <span className="text-[0.8125rem] text-ink-muted">
                    Total escrow{" "}
                    <span className="tabular font-display text-[1.125rem] font-medium text-ink">
                      ₹{totalInr.toLocaleString("en-IN")}
                    </span>
                  </span>
                  <Button type="submit" disabled={submitting || !curriculumId}>
                    Review →
                  </Button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
