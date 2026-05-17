"use client"

import {
  CATEGORY_META,
  DIFFICULTY_META,
  MAX_DURATION_SLIDER,
  REWARD_CEILING,
  REWARD_FLOOR,
  SORT_OPTIONS,
  type BountyFilterState,
  type BountyWithCurriculum,
  type SortKey,
} from "@/lib/bounty-filters"

type Props = {
  state: BountyFilterState
  bounties: BountyWithCurriculum[]
  resultCount: number
  totalCount: number
  onChange: (next: BountyFilterState) => void
  onClear: () => void
}

export function BountyToolbar({
  state,
  bounties,
  resultCount,
  totalCount,
  onChange,
  onClear,
}: Props) {
  const chips = activeChips(state, bounties)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-faint">
          {resultCount === totalCount
            ? `${totalCount} bounties`
            : `${resultCount} of ${totalCount} bounties`}
        </div>
        <div className="flex items-center gap-2">
          <label className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-ink-faint">
            Sort
          </label>
          <select
            value={state.sort}
            onChange={(e) =>
              onChange({ ...state, sort: e.target.value as SortKey })
            }
            className="rounded-md border border-rule bg-surface px-3 py-1.5 text-[0.8125rem] text-ink focus:border-ink/30 focus:outline-none focus:ring-2 focus:ring-ink/8"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => c.remove(state, onChange)}
              className="group inline-flex items-center gap-1.5 rounded-full border border-rule bg-surface px-2.5 py-1 font-mono text-[0.6875rem] uppercase tracking-wide text-ink-soft hover:border-ink/30 hover:text-ink"
            >
              {c.label}
              <span aria-hidden className="text-ink-faint group-hover:text-ink">
                ×
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={onClear}
            className="ml-1 font-mono text-[0.625rem] uppercase tracking-[0.22em] text-ink-faint underline-offset-4 hover:text-ink hover:underline"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  )
}

type Chip = {
  key: string
  label: string
  remove: (
    s: BountyFilterState,
    onChange: (next: BountyFilterState) => void,
  ) => void
}

function activeChips(
  s: BountyFilterState,
  bounties: BountyWithCurriculum[],
): Chip[] {
  const out: Chip[] = []
  if (s.query.trim()) {
    out.push({
      key: "query",
      label: `"${s.query.trim()}"`,
      remove: (st, onChange) => onChange({ ...st, query: "" }),
    })
  }
  for (const c of s.categories) {
    out.push({
      key: `cat:${c}`,
      label: CATEGORY_META[c].label,
      remove: (st, onChange) =>
        onChange({
          ...st,
          categories: st.categories.filter((x) => x !== c),
        }),
    })
  }
  for (const d of s.difficulties) {
    out.push({
      key: `diff:${d}`,
      label: DIFFICULTY_META[d].label,
      remove: (st, onChange) =>
        onChange({
          ...st,
          difficulties: st.difficulties.filter((x) => x !== d),
        }),
    })
  }
  if (s.maxDuration < MAX_DURATION_SLIDER) {
    out.push({
      key: "dur",
      label: `Up to ${s.maxDuration} min`,
      remove: (st, onChange) => onChange({ ...st, maxDuration: MAX_DURATION_SLIDER }),
    })
  }
  if (s.rewardMin > REWARD_FLOOR || s.rewardMax < REWARD_CEILING) {
    const maxLabel = s.rewardMax >= REWARD_CEILING
      ? `₹${s.rewardMax}+`
      : `₹${s.rewardMax}`
    out.push({
      key: "reward",
      label: `₹${s.rewardMin}–${maxLabel}`,
      remove: (st, onChange) =>
        onChange({
          ...st,
          rewardMin: REWARD_FLOOR,
          rewardMax: REWARD_CEILING,
        }),
    })
  }
  if (s.openSeatsOnly) {
    out.push({
      key: "open",
      label: "Open seats",
      remove: (st, onChange) => onChange({ ...st, openSeatsOnly: false }),
    })
  }
  for (const sponsorId of s.sponsors) {
    const name = bounties.find((b) => b.sponsorId === sponsorId)?.sponsorName
    out.push({
      key: `sp:${sponsorId}`,
      label: name ?? "Sponsor",
      remove: (st, onChange) =>
        onChange({
          ...st,
          sponsors: st.sponsors.filter((x) => x !== sponsorId),
        }),
    })
  }
  return out
}
