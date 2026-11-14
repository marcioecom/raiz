import type { VariantProps } from "class-variance-authority"
import type { ComponentProps } from "react"

import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

const cardVariants = cva("rounded-2xl border p-4", {
  variants: {
    variant: {
      surface: "bg-card border-border text-ink",
      sand: "bg-sand border-border text-ink",
      hero: "bg-forest border-forest text-on-forest",
    },
  },
  defaultVariants: {
    variant: "surface",
  },
})

export interface CardProps extends ComponentProps<"div">, VariantProps<typeof cardVariants> {}

export function Card({ className, variant, ...props }: CardProps) {
  return (
    <div
      data-surface={variant === "hero" ? "forest" : undefined}
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1", className)} {...props} />
}

export function CardTitle({ className, ...props }: ComponentProps<"h2">) {
  return (
    <h2
      className={cn("text-lg font-semibold leading-6 tracking-[-0.01em]", className)}
      {...props}
    />
  )
}

export function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("text-sm leading-5 text-ink-muted", className)} {...props} />
}

export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mt-3", className)} {...props} />
}

export function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mt-4 flex items-center gap-2", className)} {...props} />
}
