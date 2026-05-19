"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import type { VerifiedCredential, WalletProfile } from "@pol/shared"

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
  const [profile, setProfile] = useState<WalletProfile | null>(null)

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

  // Fetch the public profile alongside the credential so the hero can show
  // real stats (credentials count, total earned) and curricula chips. Best
  // effort — a missing profile still leaves the verify view usable.
  useEffect(() => {
    if (state.status !== "ready") return
    const addr = state.cred.studentAddress
    if (!addr) {
      setProfile(null)
      return
    }
    let cancelled = false
    apiFetch<{ profile: WalletProfile }>(
      `/credentials/by-address/${encodeURIComponent(addr)}`,
      { token: null },
    )
      .then(({ profile }) => {
        if (!cancelled) setProfile(profile)
      })
      .catch(() => {
        if (!cancelled) setProfile(null)
      })
    return () => {
      cancelled = true
    }
  }, [state])

  return (
    <div className="mx-auto w-[min(960px,92vw)] py-10">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[0.875rem] text-ink-faint transition-colors hover:text-ink-soft"
        >
          ← Home
        </Link>
        <span className="font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-ink-faint">
          Public credential verification
        </span>
      </div>
      <div className="mt-8">
        {state.status === "loading" && <Skeleton />}
        {state.status === "error" && <ErrorPanel message={state.message} />}
        {state.status === "ready" && (
          <Credential cred={state.cred} profile={profile} />
        )}
      </div>
    </div>
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

function Credential({
  cred,
  profile,
}: {
  cred: VerifiedCredential
  profile: WalletProfile | null
}) {
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
        <PersonCard cred={cred} profile={profile} />
        <p className="mt-6 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-muted">
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
              : "·"
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

      <div className="flex flex-wrap gap-3 border-t border-rule pt-8">
        <a
          href={cred.chain.basescanTxUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[0.875rem] font-medium text-paper transition-colors hover:bg-ink/90"
        >
          View on BaseScan ↗
        </a>
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

function PersonCard({
  cred,
  profile,
}: {
  cred: VerifiedCredential
  profile: WalletProfile | null
}) {
  const displayName =
    cred.studentName || profile?.studentName || cred.studentInitials || "Anon"
  const profileHref = cred.studentAddress
    ? `/credentials/${cred.studentAddress}`
    : null
  const sinceLabel = profile?.firstPassedAt
    ? new Date(profile.firstPassedAt).toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
      })
    : null

  return (
    <div className="mt-5 rounded-2xl border border-rule bg-surface p-6 lg:p-8">
      <div className="flex flex-wrap items-start gap-5">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-ink text-[0.9375rem] font-semibold tracking-wider text-paper">
          {cred.studentInitials || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="max-w-[24ch] font-display text-[2.25rem] font-medium leading-[1.1] tracking-tight text-ink">
            {displayName}
          </h1>
          {cred.studentAddress && (
            <div className="mt-2 font-mono text-[0.75rem] text-ink-muted">
              {short(cred.studentAddress)}
            </div>
          )}
          <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-soft">
            Passed{" "}
            <span className="font-medium text-ink">
              {cred.curriculum.title}
            </span>{" "}
            with{" "}
            <span className="font-medium text-teal">{cred.scorePct}%</span>
            {cred.bounty.sponsorName && (
              <>
                , sponsored by{" "}
                <span className="text-ink">{cred.bounty.sponsorName}</span>
              </>
            )}
            .
          </p>
        </div>
        {profileHref && (
          <Link
            href={profileHref}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[0.875rem] font-medium text-paper transition-colors hover:bg-ink/90"
          >
            View profile →
          </Link>
        )}
      </div>

      {profile && (profile.totalCredentials > 1 || profile.totalEarnedInr > 0 || sinceLabel) && (
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-rule pt-5 text-[0.8125rem] text-ink-soft">
          <span className="inline-flex items-center gap-1.5">
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-faint">
              Credentials
            </span>
            <span className="tabular font-medium text-ink">
              {profile.totalCredentials.toLocaleString("en-IN")}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-faint">
              Earned
            </span>
            <span className="tabular font-medium text-ink">
              ₹{profile.totalEarnedInr.toLocaleString("en-IN")}
            </span>
          </span>
          {sinceLabel && (
            <span className="inline-flex items-center gap-1.5">
              <span className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-faint">
                On-chain since
              </span>
              <span className="font-medium text-ink">{sinceLabel}</span>
            </span>
          )}
        </div>
      )}

      {profile && profile.curricula.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {profile.curricula.map((c) => (
            <span
              key={c.slug}
              className={`rounded-full border px-3 py-1 text-[0.8125rem] ${
                c.slug === cred.curriculum.slug
                  ? "border-teal/40 bg-teal/10 text-teal"
                  : "border-rule bg-surface-soft text-ink-soft"
              }`}
            >
              {c.title}
            </span>
          ))}
        </div>
      )}
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
