import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export function StatCard({
  label,
  value,
  hint,
  accent = "default",
  pulse,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  accent?: "default" | "primary" | "success"
  pulse?: boolean
}) {
  const accentText =
    accent === "primary"
      ? "text-teal"
      : accent === "success"
        ? "text-forest"
        : "text-ink"

  return (
    <div
      className={cn(
        "relative bg-surface p-6 transition-all duration-500 ease-out-quart",
        pulse && "ring-2 ring-forest/60 ring-offset-2 ring-offset-paper",
      )}
    >
      <div className="eyebrow text-[0.625rem]">{label}</div>
      <div
        className={cn(
          "tabular mt-3 font-display text-[2.25rem] font-medium tracking-tight leading-none",
          accentText,
        )}
      >
        {value}
      </div>
      {hint && (
        <div className="mt-2 text-[0.75rem] text-ink-muted">{hint}</div>
      )}
    </div>
  )
}
