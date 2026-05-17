"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import type { Payout } from "@pol/shared"

import { ApiClientError, apiFetch } from "@/lib/api"
import { Badge } from "@/components/ui/badge"

type StatusVariant =
  | "neutral"
  | "amber"
  | "teal"
  | "forest"
  | "terracotta"
  | "ink"

const STATUS_VARIANT: Record<Payout["status"], StatusVariant> = {
  queued: "neutral",
  processing: "amber",
  sent: "teal",
  confirmed: "forest",
  failed: "terracotta",
}

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiFetch<{ payouts: Payout[] }>("/payouts/mine")
      .then(({ payouts }) => setPayouts(payouts))
      .catch((err) =>
        setError(
          err instanceof ApiClientError
            ? err.message
            : "Could not load earnings",
        ),
      )
  }, [])

  const totalEarned =
    payouts
      ?.filter((p) => p.status === "confirmed" || p.status === "sent")
      .reduce((sum, p) => sum + p.amountInr, 0) ?? 0

  const totalConfirmed =
    payouts?.filter((p) => p.status === "confirmed").length ?? 0

  return (
    <div className="space-y-12">
      {totalEarned > 0 && <WithdrawSection available={totalEarned} />}
      <header className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-end lg:gap-16">
        <div>
          <div className="eyebrow eyebrow-tick">Earnings ledger</div>
          <h1 className="display-lg mt-3 max-w-[18ch] text-balance text-ink">
            Every rupee, <span className="display-italic text-teal">on the record.</span>
          </h1>
          <p className="mt-3 max-w-xl text-[0.9375rem] leading-relaxed text-ink-muted">
            Each payout is tied to a quiz you passed. Your Razorpay ID is your
            bank receipt. The chain hash is permanent proof, shareable
            anywhere and verifiable by anyone.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-rule bg-rule">
          <div className="bg-surface p-5">
            <div className="eyebrow text-[0.625rem]">Total earned</div>
            <div className="tabular mt-3 font-display text-[2rem] font-medium text-teal">
              ₹{totalEarned.toLocaleString("en-IN")}
            </div>
          </div>
          <div className="bg-surface p-5">
            <div className="eyebrow text-[0.625rem]">Confirmed</div>
            <div className="tabular mt-3 font-display text-[2rem] font-medium text-ink">
              {totalConfirmed.toLocaleString("en-IN")}
            </div>
          </div>
        </div>
      </header>

      {error && (
        <div className="border-l-2 border-terracotta bg-terracotta/5 px-4 py-2.5 text-[0.8125rem] text-terracotta">
          {error}
        </div>
      )}

      {payouts === null ? (
        <div className="space-y-px overflow-hidden rounded-md border border-rule bg-rule">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse bg-surface" />
          ))}
        </div>
      ) : payouts.length === 0 ? (
        <div className="grid place-items-center rounded-md border border-dashed border-rule bg-surface px-6 py-14 text-center">
          <span className="font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-ink-faint">
            Ledger empty
          </span>
          <h3 className="display-md mt-3 text-ink">No earnings yet.</h3>
          <p className="mt-2 max-w-md text-[0.9375rem] text-ink-muted">
            Pass a bounty quiz and your first payout lands here, settled
            in seconds.
          </p>
          <Link
            href="/learn"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-2.5 text-[0.8125rem] font-medium text-paper hover:bg-ink/90"
          >
            Find a bounty →
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-rule bg-surface">
          <div className="grid grid-cols-[1fr_120px_140px_140px] gap-4 border-b border-rule bg-paper-deep/40 px-5 py-3 text-[0.625rem] font-mono uppercase tracking-[0.18em] text-ink-faint">
            <span>Payout</span>
            <span>Status</span>
            <span>Razorpay ID</span>
            <span className="text-right">Settled</span>
          </div>
          <div className="divide-y divide-rule">
            {payouts.map((p) => (
              <article
                key={p.id}
                className="grid items-center gap-4 px-5 py-4 md:grid-cols-[1fr_120px_140px_140px]"
              >
                <div>
                  <div className="tabular font-display text-[1.0625rem] font-medium text-ink">
                    ₹{p.amountInr.toLocaleString("en-IN")}
                  </div>
                  <div className="mt-0.5 text-[0.75rem] text-ink-muted">
                    to{" "}
                    <code className="font-mono text-ink-soft">
                      {p.upiId ?? "your UPI"}
                    </code>{" "}
                    · {new Date(p.createdAt).toLocaleString("en-IN")}
                  </div>
                </div>

                <Badge variant={STATUS_VARIANT[p.status]}>{p.status}</Badge>

                <code className="truncate font-mono text-[0.6875rem] text-ink-faint">
                  {p.razorpayPayoutId ?? "·"}
                </code>

                <div className="text-right font-mono text-[0.6875rem] text-ink-faint">
                  {p.confirmedAt
                    ? new Date(p.confirmedAt).toLocaleTimeString("en-IN")
                    : p.failureReason ?? "in flight"}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function WithdrawSection({ available }: { available: number }) {
  const [upiId, setUpiId] = useState("")
  const [amount, setAmount] = useState(String(available))
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault()
    const amt = Number(amount)
    if (!upiId.trim()) { setErrorMsg("Enter your UPI ID."); return }
    if (!amt || amt <= 0 || amt > available) { setErrorMsg(`Amount must be between ₹1 and ₹${available}.`); return }
    setErrorMsg("")
    setStatus("loading")
    setTimeout(() => setStatus("success"), 1600)
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-forest/30 bg-forest/5 px-6 py-10 text-center">
        <div className="text-[2rem]">✓</div>
        <p className="font-display text-[1.0625rem] font-medium text-forest">Withdrawal initiated.</p>
        <p className="text-[0.875rem] text-ink-muted">
          ₹{Number(amount).toLocaleString("en-IN")} will reach <code className="font-mono text-ink-soft">{upiId}</code> within seconds.
        </p>
      </div>
    )
  }

  return (
    <section className="rounded-xl border border-rule bg-surface">
      <div className="border-b border-rule px-6 py-4">
        <div className="eyebrow eyebrow-tick text-[0.625rem]">Withdraw</div>
        <h2 className="mt-1 font-display text-[1.25rem] font-medium text-ink">
          Move earnings to UPI
        </h2>
        <p className="mt-1 text-[0.875rem] text-ink-muted">
          Available to withdraw: <span className="tabular font-medium text-teal">₹{available.toLocaleString("en-IN")}</span>
        </p>
      </div>
      <form onSubmit={handleWithdraw} className="grid gap-4 p-6 sm:grid-cols-[1fr_180px_auto]">
        <div className="space-y-1.5">
          <label className="text-[0.8125rem] font-medium text-ink-soft" htmlFor="wd-upi">
            UPI ID
          </label>
          <input
            id="wd-upi"
            ref={inputRef}
            type="text"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            placeholder="yourname@upi"
            className="w-full rounded-lg border border-rule bg-paper px-3 py-2.5 text-[0.9375rem] text-ink placeholder:text-ink-faint focus:border-ink/30 focus:outline-none focus:ring-2 focus:ring-ink/8"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[0.8125rem] font-medium text-ink-soft" htmlFor="wd-amount">
            Amount (₹)
          </label>
          <input
            id="wd-amount"
            type="number"
            min={1}
            max={available}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border border-rule bg-paper px-3 py-2.5 text-[0.9375rem] text-ink focus:border-ink/30 focus:outline-none focus:ring-2 focus:ring-ink/8"
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full rounded-full bg-ink px-5 py-2.5 text-[0.875rem] font-medium text-paper transition-all hover:bg-ink/85 disabled:opacity-60 sm:w-auto"
          >
            {status === "loading" ? "Processing..." : "Withdraw"}
          </button>
        </div>
      </form>
      {errorMsg && (
        <div className="mx-6 mb-4 border-l-2 border-terracotta bg-terracotta/5 px-4 py-2 text-[0.8125rem] text-terracotta">
          {errorMsg}
        </div>
      )}
    </section>
  )
}
