import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.71875rem] font-medium uppercase tracking-[0.1em] transition-colors",
  {
    variants: {
      variant: {
        default: "border-rule bg-surface text-ink-soft",
        neutral: "border-rule bg-surface text-ink-soft",
        ink: "border-ink/20 bg-ink text-paper",
        teal: "border-teal/25 bg-teal-tint text-teal",
        amber: "border-amber/25 bg-amber/10 text-amber",
        forest: "border-forest/25 bg-forest-soft text-forest",
        terracotta: "border-terracotta/25 bg-terracotta/10 text-terracotta",
        mint: "border-forest/25 bg-forest-soft text-forest",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
