"use client"

import { useMemo, useRef, useState } from "react"

import {
  CATEGORY_META,
  CATEGORY_ORDER,
  DIFFICULTY_META,
  DIFFICULTY_ORDER,
  MAX_DURATION_SLIDER,
  REWARD_CEILING,
  REWARD_FLOOR,
  type BountyFilterState,
  type BountyWithCurriculum,
  categoryCounts,
  difficultyCounts,
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
                className={`rounded-full border px-3 py-1 text-[0.8125rem] font-medium transition-colors
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
        <DurationSlider
          value={state.maxDuration}
          onChange={(v) => onChange({ ...state, maxDuration: v })}
        />
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

      {sponsorOptions.length > 1 && (
        <FilterGroup label="Sponsor">
          <SponsorDropdown
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

function DurationSlider({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  const isMax = value >= MAX_DURATION_SLIDER
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[0.8125rem]">
        <span className="text-ink-soft">Up to</span>
        <span className={`tabular font-medium ${isMax ? "text-ink-faint" : "text-ink"}`}>
          {isMax ? "Any length" : `${value} min`}
        </span>
      </div>
      <input
        type="range"
        min={30}
        max={MAX_DURATION_SLIDER}
        step={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full appearance-none accent-ink [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-rule [&::-webkit-slider-thumb]:mt-[-6px] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-ink/30 [&::-webkit-slider-thumb]:bg-surface [&::-webkit-slider-thumb]:shadow-sm"
      />
      <div className="mt-1.5 flex justify-between font-mono text-[0.625rem] text-ink-faint">
        <span>30m</span>
        <span>Any</span>
      </div>
    </div>
  )
}

function SponsorDropdown({
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
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const wrapRef = useRef<HTMLDivElement>(null)

  const filtered = options.filter(
    ([id, label]) =>
      (counts[id] ?? 0) > 0 ||
      selected.includes(id) ||
      label.toLowerCase().includes(query.toLowerCase()),
  )

  const visible = query
    ? filtered.filter(([, label]) => label.toLowerCase().includes(query.toLowerCase()))
    : filtered

  const selectedCount = selected.length

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-md border border-rule bg-surface px-3 py-2 text-[0.8125rem] text-ink-soft transition-colors hover:border-ink/30 hover:text-ink"
      >
        <span>
          {selectedCount > 0 ? `${selectedCount} selected` : "All sponsors"}
        </span>
        <span className="text-[0.625rem] text-ink-faint">{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 overflow-hidden rounded-md border border-rule bg-surface shadow-[0_8px_24px_-8px_hsl(218_45%_10%_/_0.15)]">
          <div className="border-b border-rule p-2">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search sponsors..."
              className="w-full rounded border border-rule bg-paper px-2.5 py-1.5 text-[0.8125rem] text-ink placeholder:text-ink-faint focus:border-ink/30 focus:outline-none"
            />
          </div>
          <ul className="max-h-48 overflow-y-auto py-1">
            {visible.length === 0 ? (
              <li className="px-3 py-2 text-[0.8125rem] text-ink-faint">No sponsors found</li>
            ) : visible.map(([id, label]) => {
              const active = selected.includes(id)
              const count = counts[id] ?? 0
              return (
                <li key={id}>
                  <label className="flex cursor-pointer items-center justify-between gap-2 px-3 py-1.5 text-[0.8125rem] hover:bg-paper-deep">
                    <span className="flex items-center gap-2 text-ink-soft">
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => onToggle(id)}
                        className="h-3.5 w-3.5 rounded border-rule accent-ink"
                      />
                      <span className="truncate">{label}</span>
                    </span>
                    <span className="font-mono text-[0.625rem] tabular text-ink-faint">{count}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

