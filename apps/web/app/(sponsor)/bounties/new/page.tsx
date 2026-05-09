"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { useEffect, useMemo, useState } from "react"
import type { Bounty, Curriculum } from "@pol/shared"

import { ApiClientError, apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ease } from "@/lib/motion"
import { cn } from "@/lib/utils"

export default function NewBountyPage() {
  const [curricula, setCurricula] = useState<Curriculum[]>([])
  const [curriculumId, setCurriculumId] = useState<string>("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [rewardInr, setRewardInr] = useState<number>(250)
  const [maxStudents, setMaxStudents] = useState<number>(100)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<Bounty | null>(null)

  useEffect(() => {
    apiFetch<{ curricula: Curriculum[] }>("/curricula", { token: null })
      .then(({ curricula }) => {
        setCurricula(curricula)
        if (curricula.length > 0) setCurriculumId(curricula[0].id)
      })
      .catch(() => undefined)
  }, [])

  const totalInr = useMemo(
    () => Math.max(0, rewardInr) * Math.max(0, maxStudents),
    [rewardInr, maxStudents],
  )

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
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
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Could not create the bounty",
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (created) {
    return <SuccessPanel bounty={created} />
  }

  return (
    <div className="space-y-12">
      <header>
        <Link
          href="/dashboard"
          className="link-underline text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-ink-muted"
        >
          ← Dashboard
        </Link>
        <div className="mt-4 eyebrow eyebrow-tick">New bounty · draft</div>
        <h1 className="display-lg mt-3 text-balance text-ink">
          Open the escrow. <span className="display-italic text-teal">Set the rules.</span>
        </h1>
        <p className="mt-3 max-w-xl text-[0.9375rem] leading-relaxed text-ink-muted">
          Funds enter the ProofOfLearnEscrow contract on Base Sepolia. The
          contract releases one student-sized payout per verified completion
          and refunds any unused balance back to you on close.
        </p>
      </header>

      <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
        <form onSubmit={onSubmit} className="space-y-10">
          <Section index="01" title="What are you funding?">
            <Field>
              <Label htmlFor="title">Bounty title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Learn Rust, earn ₹250"
                required
                minLength={3}
              />
            </Field>
            <Field>
              <Label htmlFor="description">Pitch to students</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="One short paragraph that shows up on the student feed."
                required
                minLength={10}
              />
            </Field>
          </Section>

          <Section index="02" title="Curriculum">
            {curricula.length === 0 ? (
              <div className="border-l-2 border-rule pl-4 text-[0.875rem] text-ink-muted">
                Loading available curricula…
              </div>
            ) : (
              <div className="grid gap-px overflow-hidden rounded-md border border-rule bg-rule">
                {curricula.map((c) => {
                  const active = curriculumId === c.id
                  return (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => setCurriculumId(c.id)}
                      className={cn(
                        "group bg-surface p-5 text-left transition-all duration-300 ease-out-quart",
                        active ? "bg-teal-tint" : "hover:bg-surface-soft",
                      )}
                    >
                      <div className="flex items-baseline justify-between">
                        <span className="font-display text-[1.0625rem] font-medium text-ink">
                          {c.title}
                        </span>
                        <span className="font-mono text-[0.6875rem] text-ink-faint">
                          ~{c.estimatedMinutes} min
                        </span>
                      </div>
                      <div className="mt-2 text-[0.875rem] text-ink-muted">
                        {c.summary}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {c.topics.slice(0, 5).map((t) => (
                          <span
                            key={t}
                            className="rounded-full border border-rule bg-surface-soft px-2 py-0.5 text-[0.625rem] uppercase tracking-[0.18em] text-ink-muted"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </Section>

          <Section index="03" title="Reward & seats">
            <div className="grid grid-cols-2 gap-6">
              <Field>
                <Label htmlFor="reward">Reward per student (₹)</Label>
                <Input
                  id="reward"
                  type="number"
                  min={1}
                  value={rewardInr}
                  onChange={(e) => setRewardInr(Number(e.target.value))}
                  required
                />
              </Field>
              <Field>
                <Label htmlFor="seats">Max students</Label>
                <Input
                  id="seats"
                  type="number"
                  min={1}
                  value={maxStudents}
                  onChange={(e) => setMaxStudents(Number(e.target.value))}
                  required
                />
              </Field>
            </div>
          </Section>

          {error && (
            <div className="border-l-2 border-terracotta bg-terracotta/5 px-4 py-2.5 text-[0.8125rem] text-terracotta">
              {error}
            </div>
          )}

          <div className="flex items-center gap-5 border-t border-rule pt-8">
            <Button
              type="submit"
              size="lg"
              disabled={submitting || !curriculumId}
            >
              {submitting
                ? "Funding escrow…"
                : `Fund ₹${totalInr.toLocaleString("en-IN")} bounty →`}
            </Button>
            <Link
              href="/dashboard"
              className="link-underline text-[0.875rem] text-ink-muted hover:text-ink"
            >
              Cancel
            </Link>
          </div>
        </form>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:h-fit">
          <div className="surface-paper paper-grain rounded-md">
            <div className="border-b border-rule px-6 py-4">
              <span className="eyebrow eyebrow-tick text-[0.625rem]">
                Escrow summary
              </span>
            </div>
            <div className="space-y-3.5 px-6 py-5 text-[0.875rem]">
              <Row
                label="Per student"
                value={`₹${rewardInr.toLocaleString("en-IN")}`}
              />
              <Row
                label="Max students"
                value={maxStudents.toLocaleString("en-IN")}
              />
              <div className="border-t border-rule-soft pt-3.5">
                <div className="flex items-baseline justify-between">
                  <span className="eyebrow text-[0.625rem]">
                    Total committed
                  </span>
                  <span className="tabular font-display text-[1.5rem] font-medium text-ink">
                    ₹{totalInr.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="mt-1 text-right font-mono text-[0.6875rem] text-ink-faint">
                  ≈ ${(totalInr / 83).toFixed(2)} USDC equivalent
                </div>
              </div>
            </div>
          </div>

          <div className="surface-paper rounded-md">
            <div className="border-b border-rule px-6 py-4">
              <span className="eyebrow eyebrow-tick text-[0.625rem]">
                How payouts work
              </span>
            </div>
            <ol className="space-y-3 px-6 py-5 text-[0.8125rem] leading-relaxed text-ink-muted">
              <Step n="01">
                You fund the escrow once. Deployer signs the deposit on your
                behalf.
              </Step>
              <Step n="02">
                Student passes the AI-tutored quiz with anti-cheat
                fingerprinting.
              </Step>
              <Step n="03">
                Verifier calls{" "}
                <code className="rounded-sm bg-paper-deep px-1 py-0.5 font-mono text-[0.6875rem]">
                  releasePayout()
                </code>
                . Emits{" "}
                <code className="rounded-sm bg-paper-deep px-1 py-0.5 font-mono text-[0.6875rem]">
                  LearningVerified
                </code>
                .
              </Step>
              <Step n="04">
                Razorpay sends ₹ to the student's UPI in seconds.
              </Step>
            </ol>
          </div>
        </aside>
      </div>
    </div>
  )
}

function Section({
  index,
  title,
  children,
}: {
  index: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="border-t border-rule pt-8">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-ink-faint">
          {index}
        </span>
        <h2 className="font-display text-[1.5rem] font-medium tracking-tight text-ink">
          {title}
        </h2>
      </div>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  )
}

function Field({ children }: { children: React.ReactNode }) {
  return <div className="space-y-2">{children}</div>
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-[0.875rem]">
      <span className="eyebrow text-[0.625rem]">{label}</span>
      <span className="tabular font-medium text-ink">{value}</span>
    </div>
  )
}

function Step({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[auto_1fr] gap-3">
      <span className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-ink-faint">
        {n}
      </span>
      <span>{children}</span>
    </li>
  )
}

function SuccessPanel({ bounty }: { bounty: Bounty }) {
  const tx = bounty.escrowTxHash ?? ""
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: ease.outQuart }}
      className="space-y-6"
    >
      <div className="surface-paper paper-grain relative overflow-hidden rounded-md p-10">
        <div className="flex items-start gap-5">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-forest text-paper">
            ✓
          </div>
          <div className="flex-1">
            <div className="eyebrow eyebrow-tick text-[0.625rem] text-forest">
              Bounty funded
            </div>
            <h1 className="display-md mt-2 text-balance text-ink">
              Escrow holds{" "}
              <span className="tabular text-teal">
                ₹{(bounty.rewardInr * bounty.maxStudents).toLocaleString("en-IN")}
              </span>{" "}
              for up to {bounty.maxStudents.toLocaleString("en-IN")} verified completions.
            </h1>
          </div>
        </div>

        <dl className="mt-8 grid gap-px overflow-hidden rounded-md border border-rule bg-rule sm:grid-cols-2">
          <Field2 label="Bounty" value={bounty.title} />
          <Field2
            label="Per student"
            value={`₹${bounty.rewardInr} · $${bounty.rewardUsdc.toFixed(2)} USDC`}
          />
          <Field2
            label="Total escrow"
            value={`₹${(bounty.rewardInr * bounty.maxStudents).toLocaleString("en-IN")}`}
          />
          <Field2
            label="Escrow tx"
            value={
              tx ? (
                <a
                  className="font-mono text-[0.8125rem] text-teal hover:underline"
                  href={`https://sepolia.basescan.org/tx/${tx}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {tx.slice(0, 10)}…{tx.slice(-8)} ↗
                </a>
              ) : (
                "—"
              )
            }
          />
        </dl>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Link
          href="/dashboard"
          className="group inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-[0.875rem] font-medium text-paper transition-all duration-300 ease-out-quart hover:bg-ink/90"
        >
          View on dashboard
          <span className="transition-transform duration-300 ease-out-quart group-hover:translate-x-0.5">
            →
          </span>
        </Link>
        <Link
          href="/bounties/new"
          className="link-underline text-[0.875rem] font-medium text-ink-soft hover:text-ink"
        >
          Fund another →
        </Link>
      </div>
    </motion.div>
  )
}

function Field2({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="bg-surface px-5 py-4">
      <dt className="eyebrow text-[0.625rem]">{label}</dt>
      <dd className="mt-1.5 text-[0.9375rem] font-medium text-ink">{value}</dd>
    </div>
  )
}
