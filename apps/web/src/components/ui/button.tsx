import type { VariantProps } from "class-variance-authority"
import type { ComponentProps } from "react"

import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed disabled:bg-sand disabled:text-ink-muted disabled:border-border",
  {
    variants: {
      variant: {
        primary:
          "bg-forest text-on-forest hover:bg-ink active:bg-ink disabled:aria-busy:bg-forest disabled:aria-busy:text-on-forest",
        secondary: "bg-card text-ink border border-border hover:bg-sand active:bg-sand",
        sand: "bg-sand text-forest border border-border hover:border-control-border",
        outline: "bg-canvas text-forest border border-forest hover:bg-sand",
        destructive:
          "bg-canvas text-error border border-error hover:bg-error-soft active:bg-error-soft",
        ghost: "bg-transparent text-ink hover:bg-sand",
      },
      size: {
        default: "min-h-11 px-4 py-2.5 text-[15px] leading-5",
        lg: "min-h-12 w-full px-5 py-3 text-[15px] leading-5",
        sm: "min-h-11 px-3 py-2 text-sm leading-5",
        icon: "h-11 w-11 shrink-0 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
)

export interface ButtonProps extends ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  loading?: boolean
  loadingText?: string
}

export function Button({
  className,
  variant,
  size,
  type = "button",
  disabled,
  loading = false,
  loadingText,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={Boolean(disabled || loading)}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {loading && loadingText ? loadingText : children}
    </button>
  )
}
