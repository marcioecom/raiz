import type { VariantProps } from "class-variance-authority"
import type { ComponentProps } from "react"

import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold leading-4 tracking-[0.02em] border",
  {
    variants: {
      variant: {
        gold: "rounded-full bg-gold-soft text-gold-text border-border",
        goldSolid: "rounded-full bg-gold text-ink border-gold",
        demo: "rounded-lg border-dashed bg-demo-soft text-demo border-demo-border",
        success: "rounded-full bg-success-soft text-success border-success/30",
        warning: "rounded-full bg-warning-soft text-warning border-border",
        error: "rounded-full bg-error-soft text-error border-error",
        neutral: "rounded-full bg-sand text-ink-muted border-border",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
)

export interface BadgeProps extends ComponentProps<"span">, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
