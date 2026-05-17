import type {
  Bounty,
  Curriculum,
  CurriculumCategory,
  CurriculumDifficulty,
} from "@pol/shared"

export type BountyWithCurriculum = Bounty & { curriculum: Curriculum }

export type SortKey =
  | "newest"
  | "reward-desc"
  | "shortest"
  | "popular"
  | "scarce"

export type BountyFilterState = {
  query: string
  categories: CurriculumCategory[]
  difficulties: CurriculumDifficulty[]
  maxDuration: number
  sponsors: string[]
  rewardMin: number
  rewardMax: number
  openSeatsOnly: boolean
  sort: SortKey
}

export const REWARD_FLOOR = 0
export const REWARD_CEILING = 1000
export const MAX_DURATION_SLIDER = 180

export const EMPTY_FILTERS: BountyFilterState = {
  query: "",
  categories: [],
  difficulties: [],
  maxDuration: MAX_DURATION_SLIDER,
  sponsors: [],
  rewardMin: REWARD_FLOOR,
  rewardMax: REWARD_CEILING,
  openSeatsOnly: false,
  sort: "newest",
}

// ─── Category metadata ───────────────────────────────────────────────────────
// Single source of truth — used by filters, badges, and (optionally) labels
// elsewhere. Order matters: it's the order shown in the filter rail.
export const CATEGORY_META: Record<
  CurriculumCategory,
  { label: string; tone: string }
> = {
  engineering: { label: "Engineering", tone: "ink" },
  "data-ai": { label: "Data & AI", tone: "teal" },
  business: { label: "Business", tone: "amber" },
  design: { label: "Design", tone: "terracotta" },
  languages: { label: "Languages", tone: "forest" },
  health: { label: "Health", tone: "mint" },
  science: { label: "Science", tone: "teal" },
  "soft-skills": { label: "Soft skills", tone: "amber" },
  agriculture: { label: "Agriculture", tone: "forest" },
}

export const CATEGORY_ORDER: CurriculumCategory[] = [
  "engineering",
  "data-ai",
  "business",
  "design",
  "languages",
  "health",
  "science",
  "soft-skills",
  "agriculture",
]

export const DIFFICULTY_META: Record<
  CurriculumDifficulty,
  { label: string }
> = {
  beginner: { label: "Beginner" },
  intermediate: { label: "Intermediate" },
  advanced: { label: "Advanced" },
}

export const DIFFICULTY_ORDER: CurriculumDifficulty[] = [
  "beginner",
  "intermediate",
  "advanced",
]

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "reward-desc", label: "Highest reward" },
  { key: "shortest", label: "Shortest" },
  { key: "popular", label: "Most popular" },
  { key: "scarce", label: "Fewest seats left" },
]

// ─── URL <-> state ──────────────────────────────────────────────────────────
// We round-trip filter state through the URL so refresh and share work.
// Empty values are omitted to keep URLs clean.

const ARRAY_SEP = ","

export function filtersFromSearchParams(
  params: URLSearchParams,
): BountyFilterState {
  const parseList = <T extends string>(key: string, allowed: readonly T[]): T[] => {
    const raw = params.get(key)
    if (!raw) return []
    return raw
      .split(ARRAY_SEP)
      .map((s) => s.trim())
      .filter((s): s is T => (allowed as readonly string[]).includes(s))
  }

  const parseNum = (key: string, fallback: number): number => {
    const raw = params.get(key)
    if (raw === null) return fallback
    const n = Number(raw)
    return Number.isFinite(n) ? n : fallback
  }

  const sortRaw = params.get("sort")
  const sort: SortKey =
    sortRaw && SORT_OPTIONS.some((s) => s.key === sortRaw)
      ? (sortRaw as SortKey)
      : "newest"

  return {
    query: params.get("q") ?? "",
    categories: parseList<CurriculumCategory>("cat", CATEGORY_ORDER),
    difficulties: parseList<CurriculumDifficulty>("level", DIFFICULTY_ORDER),
    maxDuration: clamp(parseNum("maxdur", MAX_DURATION_SLIDER), 0, MAX_DURATION_SLIDER),
    sponsors: (params.get("sp") ?? "")
      .split(ARRAY_SEP)
      .map((s) => s.trim())
      .filter(Boolean),
    rewardMin: clamp(parseNum("rmin", REWARD_FLOOR), REWARD_FLOOR, REWARD_CEILING),
    rewardMax: clamp(parseNum("rmax", REWARD_CEILING), REWARD_FLOOR, REWARD_CEILING),
    openSeatsOnly: params.get("open") === "1",
    sort,
  }
}

export function filtersToSearchParams(
  state: BountyFilterState,
): URLSearchParams {
  const p = new URLSearchParams()
  if (state.query.trim()) p.set("q", state.query.trim())
  if (state.categories.length) p.set("cat", state.categories.join(ARRAY_SEP))
  if (state.difficulties.length)
    p.set("level", state.difficulties.join(ARRAY_SEP))
  if (state.maxDuration < MAX_DURATION_SLIDER) p.set("maxdur", String(state.maxDuration))
  if (state.sponsors.length) p.set("sp", state.sponsors.join(ARRAY_SEP))
  if (state.rewardMin > REWARD_FLOOR) p.set("rmin", String(state.rewardMin))
  if (state.rewardMax < REWARD_CEILING) p.set("rmax", String(state.rewardMax))
  if (state.openSeatsOnly) p.set("open", "1")
  if (state.sort !== "newest") p.set("sort", state.sort)
  return p
}

export function isDefaultFilters(state: BountyFilterState): boolean {
  return (
    !state.query &&
    state.categories.length === 0 &&
    state.difficulties.length === 0 &&
    state.maxDuration === MAX_DURATION_SLIDER &&
    state.sponsors.length === 0 &&
    state.rewardMin === REWARD_FLOOR &&
    state.rewardMax === REWARD_CEILING &&
    !state.openSeatsOnly &&
    state.sort === "newest"
  )
}

export function activeFilterCount(state: BountyFilterState): number {
  let n = 0
  if (state.query.trim()) n++
  n += state.categories.length
  n += state.difficulties.length
  if (state.maxDuration < MAX_DURATION_SLIDER) n++
  n += state.sponsors.length
  if (state.rewardMin > REWARD_FLOOR || state.rewardMax < REWARD_CEILING) n++
  if (state.openSeatsOnly) n++
  return n
}

// ─── Filter + sort logic ────────────────────────────────────────────────────

function matchesQuery(b: BountyWithCurriculum, q: string): boolean {
  if (!q) return true
  const needle = q.toLowerCase()
  const hay = [
    b.title,
    b.description,
    b.curriculum.title,
    b.curriculum.summary,
    ...b.curriculum.topics,
    ...b.curriculum.syllabus.map((s) => `${s.module} ${s.summary}`),
  ]
    .join(" ")
    .toLowerCase()
  return hay.includes(needle)
}

export function applyFilters(
  bounties: BountyWithCurriculum[],
  state: BountyFilterState,
): BountyWithCurriculum[] {
  const filtered = bounties.filter((b) => {
    if (!matchesQuery(b, state.query)) return false
    if (
      state.categories.length &&
      !state.categories.includes(b.curriculum.category)
    )
      return false
    if (
      state.difficulties.length &&
      !state.difficulties.includes(b.curriculum.difficulty)
    )
      return false
    if (state.maxDuration < MAX_DURATION_SLIDER && b.curriculum.estimatedMinutes > state.maxDuration)
      return false
    if (state.sponsors.length && !state.sponsors.includes(b.sponsorId))
      return false
    if (b.rewardInr < state.rewardMin || b.rewardInr > state.rewardMax)
      return false
    if (state.openSeatsOnly) {
      const seatsLeft = Math.max(0, b.maxStudents - b.enrolled)
      if (seatsLeft === 0) return false
    }
    return true
  })

  return [...filtered].sort(compareBy(state.sort))
}

function compareBy(sort: SortKey) {
  return (a: BountyWithCurriculum, b: BountyWithCurriculum): number => {
    switch (sort) {
      case "reward-desc":
        return b.rewardInr - a.rewardInr
      case "shortest":
        return (
          a.curriculum.estimatedMinutes - b.curriculum.estimatedMinutes ||
          a.rewardInr - b.rewardInr
        )
      case "popular":
        return b.enrolled - a.enrolled
      case "scarce": {
        // "Open" bounties first (closed ones go last), then fewest seats remaining first.
        const seatsA = Math.max(0, a.maxStudents - a.enrolled)
        const seatsB = Math.max(0, b.maxStudents - b.enrolled)
        if ((seatsA === 0) !== (seatsB === 0)) return seatsA === 0 ? 1 : -1
        return seatsA - seatsB
      }
      case "newest":
      default:
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
    }
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi)
}

// ─── Counts for filter rail ─────────────────────────────────────────────────
// Counts ignore the filter being counted ("OR within facet, AND across facets"),
// which is how every good faceted search behaves.

export function categoryCounts(
  bounties: BountyWithCurriculum[],
  state: BountyFilterState,
): Record<string, number> {
  return countByFacet(bounties, state, "categories", (b) => [
    b.curriculum.category,
  ])
}

export function difficultyCounts(
  bounties: BountyWithCurriculum[],
  state: BountyFilterState,
): Record<string, number> {
  return countByFacet(bounties, state, "difficulties", (b) => [
    b.curriculum.difficulty,
  ])
}

export function sponsorCounts(
  bounties: BountyWithCurriculum[],
  state: BountyFilterState,
): Record<string, number> {
  return countByFacet(bounties, state, "sponsors", (b) => [b.sponsorId])
}

function countByFacet(
  bounties: BountyWithCurriculum[],
  state: BountyFilterState,
  facet: "categories" | "difficulties" | "sponsors",
  keysOf: (b: BountyWithCurriculum) => string[],
): Record<string, number> {
  const cleared: BountyFilterState = { ...state, [facet]: [] }
  const visible = applyFilters(bounties, cleared)
  const counts: Record<string, number> = {}
  for (const b of visible) {
    for (const k of keysOf(b)) counts[k] = (counts[k] ?? 0) + 1
  }
  return counts
}
