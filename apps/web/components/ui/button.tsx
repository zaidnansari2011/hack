import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Editorial buttons. The default ("ink") is a near-black pill with a white
 * sliver underline that reveals on hover — feels like a magazine CTA, not a
 * SaaS button. Secondary is a hairline-bordered ghost. Tonal variants pull
 * from the warmer accents in the palette.
 */
const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium tracking-tight transition-all duration-300 ease-out-quart focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:cursor-not-allowed disabled:opacity-40",
  {
    variants: {
      variant: {
        ink:
          "bg-ink text-paper hover:bg-ink/90 shadow-[0_8px_24px_-12px_hsl(var(--ink)/0.55)]",
        teal:
          "bg-teal text-white hover:bg-teal/90 shadow-[0_10px_24px_-12px_hsl(var(--teal)/0.55)]",
        outline:
          "bg-transparent text-ink border border-ink/15 hover:border-ink/40 hover:bg-ink/5",
        ghost:
          "bg-transparent text-ink-soft hover:bg-ink/5 hover:text-ink",
        terracotta:
          "bg-terracotta text-white hover:bg-terracotta/90 shadow-[0_10px_24px_-12px_hsl(var(--terracotta)/0.5)]",
        link:
          "bg-transparent text-ink underline-offset-4 hover:underline px-1 py-0 h-auto rounded-none",
      },
      size: {
        default: "h-11 px-6 text-[0.875rem]",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-7 text-[0.9375rem]",
        icon: "h-10 w-10 rounded-full p-0",
      },
    },
    defaultVariants: {
      variant: "ink",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

// Backwards-compat: existing call sites use variant="default" / "secondary".
// Map those onto the new vocabulary so we don't have to touch every file.
const compatVariants: Record<string, ButtonProps["variant"]> = {
  default: "ink",
  secondary: "outline",
}

const ButtonShim = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, ...props }, ref) => {
    const mapped =
      typeof variant === "string" && variant in compatVariants
        ? compatVariants[variant as keyof typeof compatVariants]
        : variant
    return <Button ref={ref} variant={mapped ?? "ink"} {...props} />
  },
)
ButtonShim.displayName = "Button"

export { ButtonShim as Button, buttonVariants }
