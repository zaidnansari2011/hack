import type { Bounty } from "@pol/shared"

import { Badge } from "@/components/ui/badge"

type StatusVariant =
  | "neutral"
  | "amber"
  | "forest"
  | "teal"
  | "ink"
  | "terracotta"

const STATUS_VARIANT: Record<Bounty["status"], StatusVariant> = {
  draft: "neutral",
  funding: "amber",
  active: "forest",
  paused: "neutral",
  depleted: "teal",
  closed: "neutral",
}

export function BountyRow({ bounty }: { bounty: Bounty }) {
  const progress = bounty.maxStudents
    ? Math.min(100, Math.round((bounty.completed / bounty.maxStudents) * 100))
    : 0

  return (
    <article className="grid items-center gap-4 bg-surface px-5 py-4 md:grid-cols-[1.6fr_1fr_1fr_120px]">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-display text-[1rem] font-medium text-ink">
            {bounty.title}
          </h3>
          <Badge variant={STATUS_VARIANT[bounty.status]}>{bounty.status}</Badge>
        </div>
        <p className="mt-0.5 line-clamp-1 text-[0.8125rem] text-ink-muted">
          {bounty.description}
        </p>
      </div>

      <div>
        <div className="eyebrow text-[0.625rem]">Per completion</div>
        <div className="tabular mt-1 font-display text-[1.125rem] font-medium text-ink">
          ₹{bounty.rewardInr.toLocaleString("en-IN")}
          <span className="ml-1 font-mono text-[0.6875rem] font-normal text-ink-faint">
            ${bounty.rewardUsdc.toFixed(2)}
          </span>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-[0.625rem] uppercase tracking-[0.16em] text-ink-faint">
          <span>Progress</span>
          <span className="tabular text-ink-soft">
            {bounty.completed} / {bounty.maxStudents}
          </span>
        </div>
        <div className="mt-1.5 h-px overflow-hidden bg-rule">
          <div
            className="h-full bg-teal transition-[width] duration-700 ease-out-quart"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="text-right">
        {bounty.escrowTxHash ? (
          <a
            href={`https://sepolia.basescan.org/tx/${bounty.escrowTxHash}`}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[0.6875rem] text-teal transition-colors hover:underline"
          >
            tx ↗
          </a>
        ) : (
          <span className="font-mono text-[0.6875rem] text-ink-faint">no tx</span>
        )}
      </div>
    </article>
  )
}
