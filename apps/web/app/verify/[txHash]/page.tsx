"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import type { VerifiedCredential } from "@pol/shared"

import { ApiClientError, apiFetch } from "@/lib/api"
import { CredentialShareCard } from "@/components/verify/credential-share-card"

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; cred: VerifiedCredential }

export default function VerifyPage() {
  const params = useParams<{ txHash: string }>()
  const txHash = params.txHash

  const [state, setState] = useState<State>({ status: "loading" })

  useEffect(() => {
    if (!txHash) return
    apiFetch<{ credential: VerifiedCredential }>(
      `/proofs/by-tx/${encodeURIComponent(txHash)}`,
      { token: null },
    )
      .then(({ credential }) =>
        setState({ status: "ready", cred: credential }),
      )
      .catch((err) =>
        setState({
          status: "error",
          message:
            err instanceof ApiClientError
              ? err.message
              : "Could not load credential",
        }),
      )
  }, [txHash])

  return (
    <main className="min-h-screen bg-paper">
      <Header />
      <div className="mx-auto w-[min(960px,92vw)] py-14">
        {state.status === "loading" && <Skeleton />}
        {state.status === "error" && <ErrorPanel message={state.message} />}
        {state.status === "ready" && <Credential cred={state.cred} />}
      </div>
    </main>
  )
}

function Header() {
  return (
    <header className="border-b border-rule bg-surface">
      <div className="mx-auto flex h-14 w-[min(960px,92vw)] items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-[0.9375rem] font-medium tracking-tight text-ink"
        >
          <span className="inline-block h-2 w-2 rounded-full bg-teal" />
          Proof-of-Learn
        </Link>
        <span className="font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-ink-faint">
          Public credential verification
        </span>
      </div>
    </header>
  )
}

function Skeleton() {
  return (
    <div className="space-y-6">
      <div className="h-6 w-48 animate-pulse rounded bg-rule/60" />
      <div className="h-32 w-full animate-pulse rounded-md bg-rule/40" />
      <div className="grid gap-px border border-rule bg-rule sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse bg-paper" />
        ))}
      </div>
    </div>
  )
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-terracotta/30 bg-terracotta/5 p-10">
      <div className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-terracotta">
        Verification failed
      </div>
      <h1 className="mt-4 font-display text-[1.75rem] font-medium tracking-tight text-ink">
        We couldn&rsquo;t find a credential for this transaction.
      </h1>
      <p className="mt-3 max-w-xl text-[0.9375rem] leading-relaxed text-ink-muted">
        {message}. The hash may be invalid, the transaction may belong to a
        different protocol, or the credential may not have been minted yet.
      </p>
    </div>
  )
}

function Credential({ cred }: { cred: VerifiedCredential }) {
  const minted = cred.status === "minted"
  return (
    <div className="space-y-10">
      <div>
        <div className="flex items-center gap-3">
          <span
            className={`font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.22em] ${
              minted ? "text-forest" : "text-amber-700"
            }`}
          >
            {minted ? "Verified · on-chain" : `Status · ${cred.status}`}
          </span>
          <span className="h-px w-10 bg-rule" />
          <span className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-faint">
            {cred.chain.network}
          </span>
        </div>
        <h1 className="mt-5 max-w-[24ch] font-display text-[2.5rem] font-medium leading-[1.1] tracking-tight text-ink">
          {cred.studentInitials || "Anon"} passed{" "}
          <span className="text-teal">{cred.curriculum.title}</span>
        </h1>
        <p className="mt-4 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-muted">
          {cred.curriculum.summary}
        </p>
      </div>

      <div className="grid gap-px overflow-hidden rounded-md border border-rule bg-rule sm:grid-cols-3">
        <Stat label="Score" value={`${cred.scorePct}%`} accent />
        <Stat
          label="Reward paid"
          value={`₹${cred.bounty.rewardInr.toLocaleString("en-IN")}`}
        />
        <Stat
          label="Verified at"
          value={
            cred.passedAt
              ? new Date(cred.passedAt).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })
              : "—"
          }
        />
      </div>

      <CredentialShareCard cred={cred} />

      <Section title="On-chain receipts">
        <FieldRow label="Release tx">
          <a
            href={cred.chain.basescanTxUrl}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[0.8125rem] text-teal underline-offset-4 hover:underline"
          >
            {short(cred.txHash)} ↗
          </a>
        </FieldRow>
        {cred.studentAddress && cred.chain.basescanAddressUrl && (
          <FieldRow label="Student address">
            <Link
              href={`/credentials/${cred.studentAddress}`}
              className="font-mono text-[0.8125rem] text-teal underline-offset-4 hover:underline"
            >
              {short(cred.studentAddress)}
            </Link>
            <a
              href={cred.chain.basescanAddressUrl}
              target="_blank"
              rel="noreferrer"
              className="ml-3 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-faint hover:text-ink"
            >
              BaseScan ↗
            </a>
          </FieldRow>
        )}
        {cred.tokenId && (
          <FieldRow label="Soulbound token">
            <span className="font-mono text-[0.8125rem] text-ink">
              #{cred.tokenId}
            </span>
            <span className="ml-3 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-faint">
              non-transferable
            </span>
          </FieldRow>
        )}
      </Section>

      <Section title="Cryptographic commitments">
        <p className="mb-4 max-w-xl text-[0.875rem] leading-relaxed text-ink-muted">
          These hashes bind the credential to the student, curriculum, and
          score. Anyone holding the original inputs can recompute and audit
          them against the on-chain record.
        </p>
        <FieldRow label="Score hash">
          <span className="font-mono text-[0.75rem] text-ink-soft">
            {cred.scoreHash}
          </span>
        </FieldRow>
        <FieldRow label="Pass commitment">
          <span className="font-mono text-[0.75rem] text-ink-soft">
            {cred.commitment}
          </span>
          <span className="ml-3 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-faint">
            keccak(addr · slug · passed)
          </span>
        </FieldRow>
      </Section>

      <Section title="Bounty">
        <FieldRow label="Sponsor">
          <span className="text-[0.9375rem] text-ink">
            {cred.bounty.sponsorName}
          </span>
        </FieldRow>
        <FieldRow label="Title">
          <span className="text-[0.9375rem] text-ink">{cred.bounty.title}</span>
        </FieldRow>
        <FieldRow label="Curriculum">
          <span className="font-mono text-[0.8125rem] text-ink-soft">
            {cred.curriculum.slug}
          </span>
        </FieldRow>
      </Section>

      <div className="flex flex-wrap gap-3 border-t border-rule pt-8">
        <a
          href={cred.chain.basescanTxUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[0.875rem] font-medium text-paper transition-colors hover:bg-ink/90"
        >
          View on BaseScan ↗
        </a>
        {cred.studentAddress && (
          <Link
            href={`/credentials/${cred.studentAddress}`}
            className="inline-flex items-center gap-2 rounded-full border border-rule bg-surface px-5 py-2.5 text-[0.875rem] font-medium text-ink-soft transition-colors hover:border-ink/30 hover:text-ink"
          >
            See full transcript →
          </Link>
        )}
        <Link
          href={`/recruit?curriculum=${cred.curriculum.slug}`}
          className="inline-flex items-center gap-2 rounded-full border border-rule bg-surface px-5 py-2.5 text-[0.875rem] font-medium text-ink-soft transition-colors hover:border-ink/30 hover:text-ink"
        >
          Find others who passed →
        </Link>
      </div>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="eyebrow eyebrow-tick mb-4 text-[0.625rem]">{title}</div>
      <div className="rounded-md border border-rule bg-surface p-6 lg:p-8">
        {children}
      </div>
    </section>
  )
}

function FieldRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 border-b border-rule/60 py-3 last:border-b-0 last:pb-0 first:pt-0">
      <div className="w-44 shrink-0 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-faint">
        {label}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="bg-paper p-6">
      <div className="font-mono text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-ink-faint">
        {label}
      </div>
      <div
        className={`tabular mt-3 font-display text-[2rem] font-medium tracking-tight leading-none ${
          accent ? "text-teal" : "text-ink"
        }`}
      >
        {value}
      </div>
    </div>
  )
}

function short(hash: string): string {
  if (hash.length < 14) return hash
  return `${hash.slice(0, 10)}…${hash.slice(-8)}`
}
