import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type Accent = "default" | "primary" | "success" | "amber" | "terracotta"

const ACCENT: Record<
  Accent,
  { value: string; bar: string; tint: string; chip: string }
> = {
  default: {
    value: "text-ink",
    bar: "bg-ink/30",
    tint: "from-ink/[0.04]",
    chip: "bg-ink/5 text-ink-soft",
  },
  primary: {
    value: "text-teal",
    bar: "bg-teal",
    tint: "from-teal/[0.08]",
    chip: "bg-teal/10 text-teal",
  },
  success: {
    value: "text-forest",
    bar: "bg-forest",
    tint: "from-forest/[0.09]",
    chip: "bg-forest/10 text-forest",
  },
  amber: {
    value: "text-amber",
    bar: "bg-amber",
    tint: "from-amber/[0.10]",
    chip: "bg-amber/10 text-amber",
  },
  terracotta: {
    value: "text-terracotta",
    bar: "bg-terracotta",
    tint: "from-terracotta/[0.09]",
    chip: "bg-terracotta/10 text-terracotta",
  },
}

export function StatCard({
  label,
  value,
  hint,
  accent = "default",
  pulse,
  icon,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  accent?: Accent
  pulse?: boolean
  icon?: ReactNode
}) {
  const a = ACCENT[accent]
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-surface p-6 transition-all duration-500 ease-out-quart",
        pulse && "ring-2 ring-forest/60 ring-offset-2 ring-offset-paper",
      )}
    >
      {/* Accent wash + left bar so colour carries the hierarchy */}
      <div
        className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent", a.tint)}
      />
      <span className={cn("absolute inset-y-0 left-0 w-1", a.bar)} />

      <div className="relative">
        <div className="flex items-center justify-between gap-2">
          <div className="eyebrow text-[0.625rem]">{label}</div>
          {icon && (
            <span className={cn("grid h-7 w-7 place-items-center rounded-full", a.chip)}>
              {icon}
            </span>
          )}
        </div>
        <div
          className={cn(
            "tabular mt-3 font-display text-[2.25rem] font-medium leading-none tracking-tight",
            a.value,
          )}
        >
          {value}
        </div>
        {hint && <div className="mt-2 text-[0.75rem] text-ink-muted">{hint}</div>}
      </div>
    </div>
  )
}
