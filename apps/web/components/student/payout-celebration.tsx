"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { useEffect, useRef, useState } from "react"
import type { OnchainProof, Payout, QuizSession } from "@pol/shared"

import { apiFetch } from "@/lib/api"
import { ease } from "@/lib/motion"
import { cn } from "@/lib/utils"

const STATUS_STEPS: Payout["status"][] = ["queued", "processing", "sent", "confirmed"]
const STATUS_COPY: Record<Payout["status"], string> = {
  queued: "Queued for the payout worker",
  processing: "Razorpay is processing the UPI transfer",
  sent: "Sent to the bank network",
  confirmed: "Confirmed. Landed in your UPI.",
  failed: "Payout failed",
}

export function PayoutCelebration({
  session,
  payoutId,
  proofId,
  bountyId,
}: {
  session: QuizSession
  payoutId: string | null
  proofId: string | null
  bountyId: string
}) {
  const [payout, setPayout] = useState<Payout | null>(null)
  const [proof, setProof] = useState<OnchainProof | null>(null)
  const [displayedAmount, setDisplayedAmount] = useState(0)

  useEffect(() => {
    if (!payoutId) return
    let cancelled = false
    const tick = async () => {
      try {
        const res = await apiFetch<{ payout: Payout }>(`/payouts/${payoutId}`)
        if (cancelled) return
        setPayout(res.payout)
        if (
          res.payout.status !== "confirmed" &&
          res.payout.status !== "failed"
        ) {
          window.setTimeout(tick, 700)
        }
      } catch {
        if (!cancelled) window.setTimeout(tick, 1500)
      }
    }
    tick()
    return () => {
      cancelled = true
    }
  }, [payoutId])

  useEffect(() => {
    if (!proofId) return
    let cancelled = false
    const tick = async () => {
      try {
        const res = await apiFetch<{ proof: OnchainProof }>(`/proofs/${proofId}`)
        if (cancelled) return
        setProof(res.proof)
        if (res.proof.status === "pending") {
          window.setTimeout(tick, 800)
        }
      } catch {
        if (!cancelled) window.setTimeout(tick, 1500)
      }
    }
    tick()
    return () => {
      cancelled = true
    }
  }, [proofId])

  const animationStarted = useRef(false)
  useEffect(() => {
    if (!payout || animationStarted.current) return
    if (payout.status !== "sent" && payout.status !== "confirmed") return
    animationStarted.current = true

    const duration = 1800
    const start = performance.now()
    const target = payout.amountInr

    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplayedAmount(Math.round(target * eased))
      if (t < 1) requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }, [payout])

  const stepIndex = payout
    ? Math.max(0, STATUS_STEPS.indexOf(payout.status))
    : 0

  return (
    <div className="relative space-y-10">
      <Confetti />

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.85, ease: ease.outQuart }}
        className="relative overflow-hidden rounded-md border border-rule bg-surface p-10 lg:p-14"
      >
        <div
          aria-hidden
          className="hatch pointer-events-none absolute inset-0 opacity-50"
        />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.28em] text-forest">
              Verified
            </span>
            <span className="h-px w-10 bg-forest/40" />
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-faint">
              {session.scorePct ?? 0}% pass
            </span>
          </div>

          <h1 className="display-xl mt-6 max-w-[16ch] text-balance text-ink">
            You earned{" "}
            <span className="display-italic tabular text-teal">
              ₹{displayedAmount.toLocaleString("en-IN")}
            </span>
          </h1>

          <p className="mt-5 max-w-md text-[1.0625rem] leading-relaxed text-ink-muted">
            {payout ? STATUS_COPY[payout.status] : "Preparing your payout…"}
          </p>

          <PayoutTrack stepIndex={stepIndex} status={payout?.status ?? "queued"} />
        </div>
      </motion.section>

      <div className="grid gap-px overflow-hidden rounded-md border border-rule bg-rule lg:grid-cols-2">
        <PayoutCard payout={payout} />
        <ProofCard proof={proof} />
      </div>

      {proof?.txHash && proof.status === "minted" && (
        <CredentialLiveBanner txHash={proof.txHash} />
      )}

      <div className="flex flex-wrap items-center gap-4 border-t border-rule pt-6">
        <Link
          href="/payouts"
          className="group inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-[0.875rem] font-medium text-paper transition-all duration-300 ease-out-quart hover:bg-ink/90"
        >
          View all earnings
          <span className="transition-transform duration-300 ease-out-quart group-hover:translate-x-0.5">
            →
          </span>
        </Link>
        <Link
          href="/learn"
          className="link-underline text-[0.875rem] font-medium text-ink-soft hover:text-ink"
        >
          Find another bounty →
        </Link>
        <Link
          href={`/learn/${bountyId}`}
          className="link-underline text-[0.875rem] font-medium text-ink-muted hover:text-ink"
        >
          Back to tutor
        </Link>
      </div>
    </div>
  )
}

function PayoutTrack({
  stepIndex,
  status,
}: {
  stepIndex: number
  status: Payout["status"]
}) {
  return (
    <div className="mt-12">
      <div className="grid grid-cols-4 gap-3">
        {STATUS_STEPS.map((step, i) => {
          const reached = i <= stepIndex && status !== "failed"
          const active =
            i === stepIndex && status !== "failed" && status !== "confirmed"
          return (
            <div key={step} className="flex flex-col items-start gap-2.5">
              <div
                className={cn(
                  "h-px w-full transition-all duration-700 ease-out-quart",
                  reached ? "bg-forest" : "bg-rule",
                )}
              >
                {reached && (
                  <div
                    className={cn(
                      "h-full w-full bg-forest",
                      active && "animate-pulse",
                    )}
                  />
                )}
              </div>
              <div className="font-mono text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-ink-soft">
                {String(i + 1).padStart(2, "0")} · {step}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PayoutCard({ payout }: { payout: Payout | null }) {
  return (
    <div className="bg-surface p-7">
      <span className="eyebrow eyebrow-tick text-[0.625rem]">UPI payout</span>
      <h3 className="mt-2 font-display text-[1.5rem] font-medium tracking-tight text-ink">
        Razorpay X
      </h3>
      <dl className="mt-6 space-y-3 text-[0.875rem]">
        <Row label="Amount" value={payout ? `₹${payout.amountInr.toLocaleString("en-IN")}` : "…"} />
        <Row label="UPI" value={payout?.upiId ?? "demo@upi"} mono />
        <Row
          label="Razorpay ID"
          value={payout?.razorpayPayoutId ?? "…"}
          mono
        />
        <Row
          label="Status"
          value={
            payout ? (
              <StatusPill status={payout.status} />
            ) : (
              <span className="text-ink-faint">queued</span>
            )
          }
        />
      </dl>
    </div>
  )
}

function ProofCard({ proof }: { proof: OnchainProof | null }) {
  return (
    <div className="bg-surface p-7">
      <span className="eyebrow eyebrow-tick text-[0.625rem]">
        On-chain proof · Base Sepolia
      </span>
      <h3 className="mt-2 font-display text-[1.5rem] font-medium tracking-tight text-ink">
        Soulbound credential
      </h3>
      <dl className="mt-6 space-y-3 text-[0.875rem]">
        <Row
          label="Status"
          value={
            proof ? (
              <ProofStatusPill status={proof.status} />
            ) : (
              <span className="text-ink-faint">pending</span>
            )
          }
        />
        <Row
          label="Wallet"
          value={
            proof?.studentAddress
              ? `${proof.studentAddress.slice(0, 8)}…${proof.studentAddress.slice(-6)}`
              : "deriving…"
          }
          mono
        />
        <Row label="Token ID" value={proof?.tokenId ? `#${proof.tokenId}` : "…"} mono />
        <Row
          label="Tx hash"
          value={
            proof?.txHash ? (
              <a
                href={`https://sepolia.basescan.org/tx/${proof.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[0.8125rem] text-teal hover:underline"
              >
                {`${proof.txHash.slice(0, 10)}…${proof.txHash.slice(-6)} ↗`}
              </a>
            ) : (
              "…"
            )
          }
        />
      </dl>
    </div>
  )
}

function CredentialLiveBanner({ txHash }: { txHash: string }) {
  const [copied, setCopied] = useState(false)
  const verifyPath = `/verify/${txHash}`
  const fullUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${verifyPath}`
      : verifyPath

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: ease.outQuart }}
      className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-teal/40 bg-teal-soft/50 p-5"
    >
      <div className="min-w-0">
        <span className="font-mono text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-teal">
          Credential is live
        </span>
        <p className="mt-1.5 max-w-xl text-[0.875rem] leading-relaxed text-ink-soft">
          Anyone with this link can verify your score and on-chain receipt.
          No login needed. Open the verify page for the QR code and PDF
          certificate.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(fullUrl)
              setCopied(true)
              window.setTimeout(() => setCopied(false), 2000)
            } catch {
              // ignore
            }
          }}
          className="inline-flex items-center gap-2 rounded-full border border-rule bg-paper px-4 py-2 text-[0.8125rem] font-medium text-ink-soft transition-colors hover:border-ink/40 hover:text-ink"
        >
          {copied ? "Copied" : "Copy link"}
        </button>
        <Link
          href={verifyPath}
          className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-[0.8125rem] font-medium text-paper transition-colors hover:bg-ink/90"
        >
          Open verify page →
        </Link>
      </div>
    </motion.div>
  )
}

function Row({
  label,
  value,
  mono,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-rule-soft py-1.5">
      <dt className="eyebrow text-[0.625rem]">{label}</dt>
      <dd
        className={cn(
          "text-right font-medium text-ink",
          mono && "font-mono text-[0.8125rem]",
        )}
      >
        {value}
      </dd>
    </div>
  )
}

function StatusPill({ status }: { status: Payout["status"] }) {
  const variant =
    status === "confirmed"
      ? "border-forest/40 bg-forest-soft text-forest"
      : status === "failed"
        ? "border-terracotta/40 bg-terracotta/10 text-terracotta"
        : "border-amber/40 bg-amber/10 text-amber"
  return (
    <span className={cn("pill", variant)}>
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "confirmed"
            ? "bg-forest"
            : status === "failed"
              ? "bg-terracotta"
              : "bg-amber",
          (status !== "confirmed" && status !== "failed") && "animate-pulse",
        )}
      />
      {status}
    </span>
  )
}

function ProofStatusPill({ status }: { status: OnchainProof["status"] }) {
  const variant =
    status === "minted"
      ? "border-forest/40 bg-forest-soft text-forest"
      : status === "failed"
        ? "border-terracotta/40 bg-terracotta/10 text-terracotta"
        : "border-amber/40 bg-amber/10 text-amber"
  return (
    <span className={cn("pill", variant)}>
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "minted"
            ? "bg-forest"
            : status === "failed"
              ? "bg-terracotta"
              : "bg-amber animate-pulse",
        )}
      />
      {status}
    </span>
  )
}

function Confetti() {
  const pieces = Array.from({ length: 32 }, (_, i) => i)
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 -top-2 z-10 h-40 overflow-hidden"
    >
      {pieces.map((i) => {
        const left = (i * 3.1) % 100
        const delay = (i % 9) * 60
        const palette = i % 4
        const color =
          palette === 0
            ? "bg-teal"
            : palette === 1
              ? "bg-terracotta"
              : palette === 2
                ? "bg-amber"
                : "bg-forest"
        return (
          <span
            key={i}
            className={cn("absolute top-0 h-2 w-1 rounded-[1px] opacity-90", color)}
            style={{
              left: `${left}%`,
              animation: `pol-confetti 1.7s ${delay}ms cubic-bezier(0.21, 0.84, 0.41, 0.94) forwards`,
            }}
          />
        )
      })}
      <style jsx>{`
        @keyframes pol-confetti {
          0% {
            transform: translateY(-20px) rotate(0deg);
            opacity: 0;
          }
          12% {
            opacity: 1;
          }
          100% {
            transform: translateY(220px) rotate(540deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}
