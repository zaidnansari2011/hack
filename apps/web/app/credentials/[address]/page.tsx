"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import type { WalletProfile } from "@pol/shared"

import { ApiClientError, apiFetch } from "@/lib/api"
import { ReachOutModal } from "@/components/recruit/reach-out-modal"

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; profile: WalletProfile }

export default function WalletProfilePage() {
  const params = useParams<{ address: string }>()
  const address = params.address

  const [state, setState] = useState<State>({ status: "loading" })

  useEffect(() => {
    if (!address) return
    apiFetch<{ profile: WalletProfile }>(
      `/credentials/by-address/${encodeURIComponent(address)}`,
      { token: null },
    )
      .then(({ profile }) => setState({ status: "ready", profile }))
      .catch((err) =>
        setState({
          status: "error",
          message:
            err instanceof ApiClientError
              ? err.message
              : "Could not load wallet profile",
        }),
      )
  }, [address])

  return (
    <div className="mx-auto w-[min(1100px,94vw)] py-10">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[0.875rem] text-ink-faint transition-colors hover:text-ink-soft"
        >
          ← Home
        </Link>
        <span className="font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-ink-faint">
          Learner profile
        </span>
      </div>
      <div className="mt-8">
        {state.status === "loading" && <Skeleton />}
        {state.status === "error" && <ErrorPanel message={state.message} address={address} />}
        {state.status === "ready" && <Profile profile={state.profile} />}
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-72 animate-pulse rounded bg-rule/60" />
      <div className="grid gap-px border border-rule bg-rule sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse bg-paper" />
        ))}
      </div>
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-md bg-rule/40" />
        ))}
      </div>
    </div>
  )
}

function ErrorPanel({ message, address }: { message: string; address: string }) {
  return (
    <div className="rounded-md border border-terracotta/30 bg-terracotta/5 p-10">
      <div className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-terracotta">
        Profile not found
      </div>
      <h1 className="mt-4 font-display text-[1.75rem] font-medium tracking-tight text-ink">
        No credentials minted to this address yet.
      </h1>
      <p className="mt-3 max-w-xl text-[0.9375rem] leading-relaxed text-ink-muted">
        {message}. Address checked:{" "}
        <span className="font-mono text-[0.8125rem] text-ink-soft">{address}</span>
      </p>
      <Link
        href="/recruit"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[0.875rem] font-medium text-paper transition-colors hover:bg-ink/90"
      >
        Search verified talent →
      </Link>
    </div>
  )
}

function Profile({ profile }: { profile: WalletProfile }) {
  const displayName = profile.studentName || profile.studentInitials || "Anon"
  const [outreachOpen, setOutreachOpen] = useState(false)
  const topCurriculum = profile.curricula[0]?.title
  return (
    <div className="space-y-10">
      {/* Header strip */}
      <div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-teal">
            Verified · on-chain
          </span>
          <span className="h-px w-10 bg-rule" />
          <a
            href={profile.basescanAddressUrl}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-faint hover:text-ink"
          >
            BaseScan ↗
          </a>
        </div>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-5">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-ink text-[1rem] font-semibold tracking-wider text-paper">
              {profile.studentInitials || "?"}
            </div>
            <div>
              <div className="font-mono text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-ink-faint">
                Learner profile
              </div>
              <h1 className="mt-1 max-w-[24ch] font-display text-[2.25rem] font-medium leading-[1.1] tracking-tight text-ink">
                {displayName}
              </h1>
              <div className="mt-2 font-mono text-[0.75rem] text-ink-muted">
                {short(profile.address)}
                <button
                  onClick={() => navigator.clipboard.writeText(profile.address)}
                  className="ml-2 rounded border border-rule bg-paper px-1.5 py-0.5 text-[0.625rem] uppercase tracking-[0.18em] text-ink-faint transition-colors hover:border-ink/40 hover:text-ink"
                >
                  copy
                </button>
              </div>
            </div>
          </div>
          <p className="max-w-md text-[0.875rem] leading-relaxed text-ink-muted">
            Every credential below was minted on-chain after a proctored,
            time-locked quiz. Click any row to verify the receipt.
          </p>
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid gap-px overflow-hidden rounded-md border border-rule bg-rule sm:grid-cols-3">
        <Stat
          label="Verified credentials"
          value={profile.totalCredentials.toLocaleString("en-IN")}
          accent
        />
        <Stat
          label="Total earned"
          value={`₹${profile.totalEarnedInr.toLocaleString("en-IN")}`}
        />
        <Stat
          label="On the chain since"
          value={
            profile.firstPassedAt
              ? new Date(profile.firstPassedAt).toLocaleDateString("en-IN", {
                  month: "short",
                  year: "numeric",
                })
              : "·"
          }
        />
      </div>

      {/* Curriculum chips */}
      {profile.curricula.length > 0 && (
        <div>
          <div className="eyebrow eyebrow-tick mb-3 text-[0.625rem]">
            Curricula passed
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.curricula.map((c) => (
              <span
                key={c.slug}
                className="rounded-full border border-rule bg-surface-soft px-3 py-1 text-[0.8125rem] text-ink-soft"
              >
                {c.title}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Credentials list */}
      <section>
        <div className="eyebrow eyebrow-tick mb-4 text-[0.625rem]">
          Credentials ({profile.totalCredentials})
        </div>
        <ul className="divide-y divide-rule overflow-hidden rounded-md border border-rule bg-surface">
          {profile.credentials.map((c, i) => (
            <li key={c.txHash || i}>
              <Link
                href={`/verify/${c.txHash}`}
                className="group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-surface-soft"
              >
                <div className="min-w-0">
                  <div className="text-[0.9375rem] font-medium text-ink">
                    {c.curriculumTitle}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.75rem] text-ink-muted">
                    <span>by {c.sponsorName}</span>
                    <span className="h-1 w-1 rounded-full bg-rule" />
                    <span>{c.bountyTitle}</span>
                    {c.tokenId && (
                      <>
                        <span className="h-1 w-1 rounded-full bg-rule" />
                        <span className="font-mono text-[0.6875rem] text-ink-faint">
                          SBT #{c.tokenId}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="tabular font-display text-[1.25rem] font-medium leading-none text-teal">
                      {c.scorePct}%
                    </div>
                    <div className="mt-1 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-ink-faint">
                      ₹{c.rewardInr.toLocaleString("en-IN")}
                    </div>
                  </div>
                  <span className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-faint group-hover:text-ink">
                    verify →
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap gap-3 border-t border-rule pt-8">
        <button
          type="button"
          onClick={() => setOutreachOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[0.875rem] font-medium text-paper transition-colors hover:bg-ink/90"
        >
          Reach out to {displayName.split(" ")[0]} →
        </button>
        <a
          href={profile.basescanAddressUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-rule bg-surface px-5 py-2.5 text-[0.875rem] font-medium text-ink-soft transition-colors hover:border-ink/30 hover:text-ink"
        >
          View address on BaseScan ↗
        </a>
        <Link
          href="/recruit"
          className="inline-flex items-center gap-2 rounded-full border border-rule bg-surface px-5 py-2.5 text-[0.875rem] font-medium text-ink-soft transition-colors hover:border-ink/30 hover:text-ink"
        >
          Find similar candidates →
        </Link>
      </div>

      <ReachOutModal
        open={outreachOpen}
        onClose={() => setOutreachOpen(false)}
        recipientAddress={profile.address}
        recipientLabel={displayName}
        contextHint={topCurriculum}
      />
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
        className={`tabular mt-3 font-display text-[1.75rem] font-medium tracking-tight leading-none ${
          accent ? "text-teal" : "text-ink"
        }`}
      >
        {value}
      </div>
    </div>
  )
}

function short(addr: string): string {
  if (addr.length < 14) return addr
  return `${addr.slice(0, 10)}…${addr.slice(-8)}`
}
