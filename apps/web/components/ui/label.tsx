import * as React from "react"

import { cn } from "@/lib/utils"

const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-ink-muted",
      className,
    )}
    {...props}
  />
))
Label.displayName = "Label"

export { Label }
