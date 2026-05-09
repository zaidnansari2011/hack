"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
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
      <header className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-end lg:gap-16">
        <div>
          <div className="eyebrow eyebrow-tick">Earnings ledger</div>
          <h1 className="display-lg mt-3 max-w-[18ch] text-balance text-ink">
            Every rupee, <span className="display-italic text-teal">on the record.</span>
          </h1>
          <p className="mt-3 max-w-xl text-[0.9375rem] leading-relaxed text-ink-muted">
            Every payout corresponds to a verified, on-chain completion event.
            The Razorpay reference is your bank-side receipt; the BaseScan tx
            hash is your portable, shareable proof.
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
            Pass a bounty quiz and your first INR payout lands here — settled
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
                      {p.upiId ?? "demo@upi"}
                    </code>{" "}
                    · {new Date(p.createdAt).toLocaleString("en-IN")}
                  </div>
                </div>

                <Badge variant={STATUS_VARIANT[p.status]}>{p.status}</Badge>

                <code className="truncate font-mono text-[0.6875rem] text-ink-faint">
                  {p.razorpayPayoutId ?? "—"}
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
