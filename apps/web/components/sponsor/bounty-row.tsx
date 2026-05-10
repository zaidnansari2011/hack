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

export function BountyRow({ bounty }: { bounty: Bounty & { curriculum?: any } }) {
  const progress = bounty.maxStudents
    ? Math.min(100, Math.round((bounty.completed / bounty.maxStudents) * 100))
    : 0

  return (
    <article className="grid items-center gap-4 bg-surface px-5 py-4 md:grid-cols-[1.6fr_1fr_1fr_120px]">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-display text-[1rem] font-medium text-ink">
            {bounty.curriculum?.title || bounty.title}
          </h3>
          <Badge variant={STATUS_VARIANT[bounty.status]}>{bounty.status}</Badge>
        </div>
        <p className="mt-0.5 line-clamp-1 text-[0.8125rem] text-ink-muted">
          {bounty.description}
        </p>
        
        {bounty.curriculum?.topics && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {bounty.curriculum.topics.map((t: string) => (
              <span key={t} className="inline-flex rounded border border-rule px-1.5 py-[1px] font-mono text-[0.5625rem] uppercase tracking-wide text-ink-faint">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="eyebrow text-[0.625rem]">Reward Pill</div>
        <div className="mt-1 flex items-center">
          <span className="inline-flex items-center rounded-full border border-teal/30 bg-teal/5 px-2.5 py-0.5 font-display text-[1rem] font-medium tabular text-teal">
            ₹{bounty.rewardInr.toLocaleString("en-IN")}
            <span className="ml-1.5 font-mono text-[0.625rem] text-teal/70">
              ${bounty.rewardUsdc.toFixed(2)}
            </span>
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
