"use client"

import { useMemo } from "react"

import {
  CATEGORY_META,
  CATEGORY_ORDER,
  DIFFICULTY_META,
  DIFFICULTY_ORDER,
  DURATION_META,
  DURATION_ORDER,
  REWARD_CEILING,
  REWARD_FLOOR,
  type BountyFilterState,
  type BountyWithCurriculum,
  type DurationBucket,
  categoryCounts,
  difficultyCounts,
  durationCounts,
  sponsorCounts,
} from "@/lib/bounty-filters"
import type {
  CurriculumCategory,
  CurriculumDifficulty,
} from "@pol/shared"

type Props = {
  bounties: BountyWithCurriculum[]
  state: BountyFilterState
  onChange: (next: BountyFilterState) => void
  onClear: () => void
}

export function BountyFilters({ bounties, state, onChange, onClear }: Props) {
  const catCounts = useMemo(
    () => categoryCounts(bounties, state),
    [bounties, state],
  )
  const diffCounts = useMemo(
    () => difficultyCounts(bounties, state),
    [bounties, state],
  )
  const durCounts = useMemo(
    () => durationCounts(bounties, state),
    [bounties, state],
  )
  const spCounts = useMemo(
    () => sponsorCounts(bounties, state),
    [bounties, state],
  )

  // Sponsor list derived from the data so we don't hardcode IDs.
  const sponsorOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const b of bounties) {
      if (!map.has(b.sponsorId)) {
        map.set(b.sponsorId, b.sponsorName ?? "Sponsor")
      }
    }
    return Array.from(map.entries()).sort((a, b) =>
      a[1].localeCompare(b[1]),
    )
  }, [bounties])

  const toggleArray = <T extends string>(
    facet: keyof BountyFilterState,
    value: T,
  ) => {
    const list = state[facet] as T[]
    const next = list.includes(value)
      ? list.filter((v) => v !== value)
      : [...list, value]
    onChange({ ...state, [facet]: next })
  }

  return (
    <aside className="space-y-7 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-2">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-ink-faint">
          Filters
        </div>
        <button
          type="button"
          onClick={onClear}
          className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-ink-faint hover:text-ink"
        >
          Clear all
        </button>
      </div>

      {/* Category */}
      <FilterGroup label="Category">
        <ul className="space-y-2">
          {CATEGORY_ORDER.map((c) => {
            const meta = CATEGORY_META[c]
            const count = catCounts[c] ?? 0
            const active = state.categories.includes(c)
            return (
              <li key={c}>
                <button
                  type="button"
                  onClick={() => toggleArray<CurriculumCategory>("categories", c)}
                  disabled={count === 0 && !active}
                  className={`group flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left text-[0.8125rem] transition-colors
                    ${active
                      ? "border-ink/30 bg-ink text-paper"
                      : "border-transparent text-ink-soft hover:bg-surface"
                    }
                    ${count === 0 && !active ? "opacity-40" : ""}
                  `}
                >
                  <span className="flex items-center gap-2">
                    <Dot tone={meta.tone} active={active} />
                    {meta.label}
                  </span>
                  <span
                    className={`font-mono text-[0.625rem] tabular ${
                      active ? "text-paper/70" : "text-ink-faint"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </FilterGroup>

      {/* Difficulty */}
      <FilterGroup label="Difficulty">
        <div className="flex flex-wrap gap-1.5">
          {DIFFICULTY_ORDER.map((d) => {
            const active = state.difficulties.includes(d)
            const count = diffCounts[d] ?? 0
            return (
              <button
                key={d}
                type="button"
                onClick={() => toggleArray<CurriculumDifficulty>("difficulties", d)}
                disabled={count === 0 && !active}
                className={`rounded-full border px-3 py-1 font-mono text-[0.6875rem] uppercase tracking-wide transition-colors
                  ${active
                    ? "border-ink bg-ink text-paper"
                    : "border-rule bg-surface text-ink-soft hover:border-ink/30"
                  }
                  ${count === 0 && !active ? "opacity-40" : ""}
                `}
              >
                {DIFFICULTY_META[d].label}
                <span className={`ml-2 ${active ? "text-paper/60" : "text-ink-faint"}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </FilterGroup>

      {/* Duration */}
      <FilterGroup label="Duration">
        <div className="flex flex-wrap gap-1.5">
          {DURATION_ORDER.map((d) => {
            const active = state.durations.includes(d)
            const count = durCounts[d] ?? 0
            return (
              <button
                key={d}
                type="button"
                onClick={() => toggleArray<DurationBucket>("durations", d)}
                disabled={count === 0 && !active}
                className={`rounded-full border px-3 py-1 font-mono text-[0.6875rem] uppercase tracking-wide transition-colors
                  ${active
                    ? "border-ink bg-ink text-paper"
                    : "border-rule bg-surface text-ink-soft hover:border-ink/30"
                  }
                  ${count === 0 && !active ? "opacity-40" : ""}
                `}
              >
                {DURATION_META[d].label}
                <span className={`ml-2 ${active ? "text-paper/60" : "text-ink-faint"}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </FilterGroup>

      {/* Reward range */}
      <FilterGroup label="Reward (₹)">
        <RewardRange
          min={state.rewardMin}
          max={state.rewardMax}
          onChange={(rmin, rmax) =>
            onChange({ ...state, rewardMin: rmin, rewardMax: rmax })
          }
        />
      </FilterGroup>

      {/* Availability */}
      <FilterGroup label="Availability">
        <label className="flex cursor-pointer items-center gap-2 text-[0.8125rem] text-ink-soft hover:text-ink">
          <input
            type="checkbox"
            checked={state.openSeatsOnly}
            onChange={(e) =>
              onChange({ ...state, openSeatsOnly: e.target.checked })
            }
            className="h-3.5 w-3.5 rounded border-rule accent-ink"
          />
          Open seats only
        </label>
      </FilterGroup>

      {/* Sponsors — collapsible by being limited to first 6 by default */}
      {sponsorOptions.length > 1 && (
        <FilterGroup label="Sponsor">
          <SponsorList
            options={sponsorOptions}
            counts={spCounts}
            selected={state.sponsors}
            onToggle={(id) => toggleArray<string>("sponsors", id)}
          />
        </FilterGroup>
      )}
    </aside>
  )
}

function FilterGroup({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-2 font-mono text-[0.625rem] uppercase tracking-[0.22em] text-ink-faint">
        {label}
      </div>
      {children}
    </div>
  )
}

function Dot({ tone, active }: { tone: string; active: boolean }) {
  const bg =
    {
      ink: "bg-ink",
      teal: "bg-teal",
      amber: "bg-amber",
      terracotta: "bg-terracotta",
      forest: "bg-forest",
      mint: "bg-forest",
    }[tone] ?? "bg-ink"
  return (
    <span
      aria-hidden
      className={`inline-block h-1.5 w-1.5 rounded-full ${bg} ${
        active ? "ring-2 ring-paper/40" : ""
      }`}
    />
  )
}

function RewardRange({
  min,
  max,
  onChange,
}: {
  min: number
  max: number
  onChange: (min: number, max: number) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between font-mono text-[0.6875rem] text-ink-soft tabular">
        <span>₹{min.toLocaleString("en-IN")}</span>
        <span>
          ₹{max.toLocaleString("en-IN")}
          {max >= REWARD_CEILING ? "+" : ""}
        </span>
      </div>
      <div className="relative mt-2 h-5">
        <input
          type="range"
          min={REWARD_FLOOR}
          max={REWARD_CEILING}
          step={50}
          value={min}
          onChange={(e) => {
            const v = Math.min(Number(e.target.value), max - 50)
            onChange(v, max)
          }}
          className="pointer-events-none absolute inset-0 h-5 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-ink [&::-webkit-slider-thumb]:bg-paper [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-ink [&::-moz-range-thumb]:bg-paper"
        />
        <input
          type="range"
          min={REWARD_FLOOR}
          max={REWARD_CEILING}
          step={50}
          value={max}
          onChange={(e) => {
            const v = Math.max(Number(e.target.value), min + 50)
            onChange(min, v)
          }}
          className="pointer-events-none absolute inset-0 h-5 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-ink [&::-webkit-slider-thumb]:bg-paper [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-ink [&::-moz-range-thumb]:bg-paper"
        />
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2">
          <div className="h-px w-full bg-rule" />
          <div
            className="absolute top-0 h-px bg-ink"
            style={{
              left: `${(min / REWARD_CEILING) * 100}%`,
              right: `${100 - (max / REWARD_CEILING) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  )
}

function SponsorList({
  options,
  counts,
  selected,
  onToggle,
}: {
  options: [string, string][]
  counts: Record<string, number>
  selected: string[]
  onToggle: (id: string) => void
}) {
  return (
    <ul className="space-y-1.5">
      {options.map(([id, label]) => {
        const active = selected.includes(id)
        const count = counts[id] ?? 0
        if (count === 0 && !active) return null
        return (
          <li key={id}>
            <label className="flex cursor-pointer items-center justify-between gap-2 rounded px-1 py-1 text-[0.8125rem] text-ink-soft hover:text-ink">
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => onToggle(id)}
                  className="h-3.5 w-3.5 rounded border-rule accent-ink"
                />
                <span className="truncate">{label}</span>
              </span>
              <span className="font-mono text-[0.625rem] tabular text-ink-faint">
                {count}
              </span>
            </label>
          </li>
        )
      })}
    </ul>
  )
}

